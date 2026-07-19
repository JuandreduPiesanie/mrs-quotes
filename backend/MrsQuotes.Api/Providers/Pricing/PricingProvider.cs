using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Models.Pricing;

namespace MrsQuotes.Api.Providers.Pricing;

public sealed class PricingProvider(MrsQuotesDbContext context) : IPricingProvider
{
    public Task<List<PriceItemDto>> GetItemsAsync(string? group, bool includeRates)
    {
        var query = context.PriceItems.AsNoTracking().Where(x => x.Active);
        if (!string.IsNullOrWhiteSpace(group)) query = query.Where(x => x.QuoteGroup == group);
        return query.OrderBy(x => x.Category).ThenBy(x => x.Description)
            .Select(x => new PriceItemDto
            {
                Id = x.Id,
                Section = x.Section,
                Category = x.Category,
                QuoteGroup = x.QuoteGroup,
                ItemCode = x.ItemCode,
                Description = x.Description,
                Unit = x.Unit,
                Rate = includeRates ? x.Rate : null
            }).ToListAsync();
    }

    public Task<List<PriceSectionDto>> GetSectionsAsync()
    {
        return context.PriceItems.AsNoTracking().Where(x => x.Active)
            .GroupBy(x => x.QuoteGroup)
            .OrderBy(x => x.Key)
            .Select(x => new PriceSectionDto { Section = x.Key, QuoteGroup = x.Key, ItemCount = x.Count() })
            .ToListAsync();
    }
}
