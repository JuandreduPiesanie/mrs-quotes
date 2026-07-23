using MrsQuotes.Models.Pricing;

namespace MrsQuotes.Api.Providers.Pricing;

public interface IPricingProvider
{
    Task<List<PriceItemDto>> GetItemsAsync(string? tradeCode, bool includeRates);
    Task<List<PriceTradeDto>> GetTradesAsync();
}
