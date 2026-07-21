using System.Security.Claims;
using MrsQuotes.Api.Providers.Pricing;
using MrsQuotes.Api.Security;

namespace MrsQuotes.Api.EndpointHandlers.Pricing;

public sealed class PricingHandler(IPricingProvider provider)
{
    public async Task<IResult> GetItems(string? trade, ClaimsPrincipal principal)
    {
        var includeRates = principal.UserRole() is RoleNames.Admin or RoleNames.Management or RoleNames.QuoteAdministrator;
        return Results.Ok(await provider.GetItemsAsync(trade, includeRates));
    }

    public async Task<IResult> GetTrades() => Results.Ok(await provider.GetTradesAsync());
}
