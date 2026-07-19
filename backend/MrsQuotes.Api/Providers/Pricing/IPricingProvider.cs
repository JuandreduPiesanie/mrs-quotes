using MrsQuotes.Models.Pricing;

namespace MrsQuotes.Api.Providers.Pricing;

public interface IPricingProvider
{
    Task<List<PriceItemDto>> GetItemsAsync(string? group, bool includeRates);
    Task<List<PriceSectionDto>> GetSectionsAsync();
}
