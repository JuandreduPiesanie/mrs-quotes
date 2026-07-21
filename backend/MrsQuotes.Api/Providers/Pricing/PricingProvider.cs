using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Models.Pricing;

namespace MrsQuotes.Api.Providers.Pricing;

public sealed class PricingProvider(MrsQuotesDbContext context) : IPricingProvider
{
    public Task<List<PriceItemDto>> GetItemsAsync(string? tradeCode, bool includeRates)
    {
        var query = context.PriceItems.AsNoTracking()
            .Where(x => x.Active && x.ScheduleVersion == 2026 && !x.SystemGenerated);
        if (!string.IsNullOrWhiteSpace(tradeCode)) query = query.Where(x => x.TradeCode == tradeCode);
        return query.OrderBy(x => x.TradeGroup).ThenBy(x => x.TradeName)
            .ThenBy(x => x.Category).ThenBy(x => x.SortOrder).ThenBy(x => x.Description)
            .Select(x => new PriceItemDto
            {
                Id = x.Id,
                Section = x.Section,
                Category = x.Category,
                TradeCode = x.TradeCode,
                TradeName = x.TradeName,
                TradeGroup = x.TradeGroup,
                ItemCode = x.ItemCode,
                Description = x.Description,
                Unit = x.Unit,
                Rate = includeRates ? x.Rate : null,
                PricingMode = x.PricingMode,
                MarkupPercentage = x.MarkupPercentage,
                PricingNote = x.PricingNote,
                RequiresRateInput = x.PricingMode != "fixed",
                AutomaticStartupFee = x.AutomaticFeeCode != null
            }).ToListAsync();
    }

    public Task<List<PriceTradeDto>> GetTradesAsync()
    {
        return context.PriceItems.AsNoTracking()
            .Where(x => x.Active && x.ScheduleVersion == 2026 && !x.SystemGenerated)
            .GroupBy(x => new { x.TradeCode, x.TradeName, x.TradeGroup })
            .OrderBy(x => x.Key.TradeGroup).ThenBy(x => x.Key.TradeName)
            .Select(x => new PriceTradeDto
            {
                Code = x.Key.TradeCode,
                Name = x.Key.TradeName,
                Group = x.Key.TradeGroup,
                ItemCount = x.Count()
            })
            .ToListAsync();
    }
}
