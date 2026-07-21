using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Database.Models;

namespace MrsQuotes.IntegrationTests.Common;

public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    public ApiWebApplicationFactory()
    {
        Program.RunningAsTest = true;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:JwtSigningKey"] = "mrs-quotes-integration-test-signing-key-2026",
                ["Authentication:Issuer"] = "mrs-quotes-tests",
                ["Authentication:Audience"] = "mrs-quotes-tests",
                ["Storage:UploadsPath"] = Path.Combine(Path.GetTempPath(), "mrs-quotes-tests", Guid.NewGuid().ToString("N")),
                ["Logging:LogLevel:Microsoft.AspNetCore.Authentication"] = "Trace"
            });
        });
        builder.ConfigureServices(services =>
        {
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            var connection = new SqliteConnection("Data Source=:memory:");
            connection.Open();
            services.AddSingleton(connection);
            services.AddDbContext<MrsQuotesDbContext>(options => options.UseSqlite(connection));
        });
    }

    public async Task InitializeDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MrsQuotesDbContext>();
        await context.Database.EnsureCreatedAsync();
        var environment = scope.ServiceProvider.GetRequiredService<IWebHostEnvironment>();
        await DatabaseInitializer.SeedReferenceDataAsync(context, environment);
        if (!await context.Clients.AnyAsync())
        {
            context.Clients.Add(new MrsQuotes.Api.Database.Models.Client
            {
                Name = "Integration Test Client"
            });
            await context.SaveChangesAsync();
        }
    }

    public async Task<(int Id, decimal Rate)> GetAutomaticFeeEligibleItemAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MrsQuotesDbContext>();
        var item = await context.PriceItems.AsNoTracking()
            .Where(x => x.Active && !x.SystemGenerated && x.AutomaticFeeCode == "OUT26-STARTUP-PLUMBING"
                && x.PricingMode == "fixed")
            .OrderBy(x => x.Id)
            .FirstAsync();
        return (item.Id, item.Rate);
    }

    public async Task<(int Id, decimal Rate)> GetGeyserFaultItemAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MrsQuotesDbContext>();
        var item = await context.PriceItems.AsNoTracking()
            .Where(x => x.Active && !x.SystemGenerated && x.TradeCode == "geyser"
                && x.AutomaticFeeCode == "OUT26-STARTUP-PLUMBING" && x.PricingMode == "fixed")
            .OrderBy(x => x.Id)
            .FirstAsync();
        return (item.Id, item.Rate);
    }
}
