using MrsQuotes.Models.Clients;

namespace MrsQuotes.Api.Providers.Clients;

public interface IClientProvider
{
    Task<List<ClientDto>> SearchAsync(string? search);
}
