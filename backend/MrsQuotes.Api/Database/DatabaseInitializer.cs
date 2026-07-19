using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database.Models;

namespace MrsQuotes.Api.Database;

public static class DatabaseInitializer
{
    public static async Task SeedReferenceDataAsync(
        MrsQuotesDbContext context,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken = default)
    {
        if (await context.Clients.AnyAsync(cancellationToken)) return;

        var path = Path.Combine(environment.ContentRootPath, "SeedData", "clients.json");
        if (!File.Exists(path)) return;
        var names = JsonSerializer.Deserialize<string[]>(await File.ReadAllTextAsync(path, cancellationToken)) ?? [];
        context.Clients.AddRange(names
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(name => new Client { Name = name.Trim() }));
        await context.SaveChangesAsync(cancellationToken);
    }
}
