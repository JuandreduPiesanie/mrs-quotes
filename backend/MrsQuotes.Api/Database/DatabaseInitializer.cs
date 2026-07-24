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
        await SeedClientsAsync(context, environment, cancellationToken);
        await SeedRatesAsync(context, environment, cancellationToken);
        await context.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedClientsAsync(
        MrsQuotesDbContext context,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (await context.Clients.AnyAsync(cancellationToken)) return;
        var path = Path.Combine(environment.ContentRootPath, "SeedData", "clients.json");
        if (!File.Exists(path)) return;
        var names = JsonSerializer.Deserialize<string[]>(await File.ReadAllTextAsync(path, cancellationToken)) ?? [];
        context.Clients.AddRange(names
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(name => new Client { Name = name.Trim() }));
    }

    private static async Task SeedRatesAsync(
        MrsQuotesDbContext context,
        IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var path = Path.Combine(environment.ContentRootPath, "SeedData", "outsurance-rates-2026.json");
        if (!File.Exists(path)) return;

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var seeds = JsonSerializer.Deserialize<List<RateSeedItem>>(
            await File.ReadAllTextAsync(path, cancellationToken), options) ?? [];
        var seedCodes = seeds.Select(x => x.ItemCode).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingItems = await context.PriceItems.ToListAsync(cancellationToken);
        var existingByCode = existingItems
            .Where(x => !string.IsNullOrWhiteSpace(x.ItemCode))
            .ToDictionary(x => x.ItemCode!, StringComparer.OrdinalIgnoreCase);

        foreach (var oldItem in existingItems.Where(x => x.ScheduleVersion != 2026 && x.Active))
        {
            oldItem.Active = false;
        }
        foreach (var oldItem in existingItems.Where(x => x.ScheduleVersion == 2026
                     && x.ItemCode != null && !seedCodes.Contains(x.ItemCode)))
        {
            oldItem.Active = false;
        }

        foreach (var seed in seeds)
        {
            if (!existingByCode.TryGetValue(seed.ItemCode, out var item))
            {
                item = new PriceItem { ItemCode = seed.ItemCode, CreatedAt = DateTime.Now };
                context.PriceItems.Add(item);
            }

            item.ScheduleVersion = seed.ScheduleVersion;
            item.Section = seed.Section;
            item.Category = seed.Category;
            item.QuoteGroup = seed.TradeName;
            item.TradeCode = seed.TradeCode;
            item.TradeName = seed.TradeName;
            item.TradeGroup = seed.TradeGroup;
            item.Description = seed.Description;
            item.Unit = seed.Unit;
            item.Rate = seed.Rate;
            item.PricingMode = seed.PricingMode;
            item.MarkupPercentage = seed.MarkupPercentage;
            item.PricingNote = seed.PricingNote;
            item.AutomaticFeeCode = seed.AutomaticFeeCode;
            item.SystemGenerated = seed.SystemGenerated;
            item.SortOrder = seed.SortOrder;
            item.SourceSheet = "OUTsurance Building Rates July 2026";
            item.Active = true;
        }
    }

    private sealed class RateSeedItem
    {
        public string ItemCode { get; set; } = "";
        public int ScheduleVersion { get; set; }
        public string Section { get; set; } = "";
        public string TradeCode { get; set; } = "";
        public string TradeName { get; set; } = "";
        public string TradeGroup { get; set; } = "";
        public string Category { get; set; } = "";
        public string Description { get; set; } = "";
        public string Unit { get; set; } = "";
        public decimal Rate { get; set; }
        public string PricingMode { get; set; } = "fixed";
        public decimal? MarkupPercentage { get; set; }
        public string? PricingNote { get; set; }
        public string? AutomaticFeeCode { get; set; }
        public bool SystemGenerated { get; set; }
        public int SortOrder { get; set; }
    }
}
