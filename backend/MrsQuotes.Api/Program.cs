using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Startup;
using MrsQuotes.Api.Startup.Authentication;
using MrsQuotes.Api.Startup.DependencyInjection;
using MrsQuotes.Api.Startup.EndpointMapping;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        if (origins.Length == 0) policy.AllowAnyOrigin();
        else policy.WithOrigins(origins);
        policy.AllowAnyHeader().AllowAnyMethod();
    });
});
builder.Services.AddMrsQuotesAuthentication(configuration);
builder.Services.RegisterServices(configuration);

var app = builder.Build();

if (!Program.RunningAsTest)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<MrsQuotesDbContext>();
    await MigrateDatabaseAsync(dbContext);
    await DatabaseInitializer.SeedReferenceDataAsync(dbContext, app.Environment);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

if (configuration.GetValue("Application:UseHttpsRedirection", false)) app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

app.MapEndpoints();
app.Run();

public partial class Program
{
    protected Program() { }
    public static bool RunningAsTest { get; set; }

    private static async Task MigrateDatabaseAsync(MrsQuotesDbContext context)
    {
        const int maxAttempts = 12;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await context.Database.MigrateAsync();
                return;
            }
            catch when (attempt < maxAttempts)
            {
                await Task.Delay(TimeSpan.FromSeconds(5));
            }
        }
    }
}
