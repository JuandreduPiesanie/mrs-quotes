using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Models.Clients;

namespace MrsQuotes.Api.Providers.Clients;

public sealed class ClientProvider(MrsQuotesDbContext context) : IClientProvider
{
    public Task<List<ClientDto>> SearchAsync(string? search)
    {
        var query = context.Clients.AsNoTracking().Where(x => x.Active);
        var normalized = search?.Trim();
        if (!string.IsNullOrWhiteSpace(normalized))
        {
            query = query.Where(x => x.Name.Contains(normalized));
        }
        return query.OrderBy(x => x.Name).Take(50)
            .Select(x => new ClientDto { Id = x.Id, Name = x.Name })
            .ToListAsync();
    }
}
