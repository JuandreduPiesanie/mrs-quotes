using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace MrsQuotes.Api.Providers.Quotes;

public sealed record PhotoDownloadTicket(int QuoteId, int UserId, string Role, DateTime ExpiresAt);

public sealed class PhotoDownloadTicketService
{
    private readonly ConcurrentDictionary<string, PhotoDownloadTicket> _tickets = new();

    public string Create(int quoteId, int userId, string role)
    {
        RemoveExpired();
        var value = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _tickets[value] = new PhotoDownloadTicket(
            quoteId,
            userId,
            role,
            DateTime.UtcNow.AddMinutes(2));
        return value;
    }

    public PhotoDownloadTicket? Take(string? value, int quoteId)
    {
        if (string.IsNullOrWhiteSpace(value) || !_tickets.TryRemove(value, out var ticket))
        {
            return null;
        }
        return ticket.QuoteId == quoteId && ticket.ExpiresAt > DateTime.UtcNow
            ? ticket
            : null;
    }

    private void RemoveExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var pair in _tickets.Where(pair => pair.Value.ExpiresAt <= now))
        {
            _tickets.TryRemove(pair.Key, out _);
        }
    }
}
