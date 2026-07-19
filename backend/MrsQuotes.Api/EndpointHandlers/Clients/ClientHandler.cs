using MrsQuotes.Api.Providers.Clients;

namespace MrsQuotes.Api.EndpointHandlers.Clients;

public sealed class ClientHandler(IClientProvider provider)
{
    public async Task<IResult> Search(string? search) => Results.Ok(await provider.SearchAsync(search));
}
