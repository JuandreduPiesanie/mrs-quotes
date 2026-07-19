using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.Providers.Quotes;

public sealed record QuoteArchive(byte[] Content, string FileName);

public interface IQuoteProvider
{
    Task<List<QuoteDto>> GetQuotesAsync(int userId, string role, int? assessorId);
    Task<QuoteDto?> GetQuoteAsync(int quoteId, int userId, string role);
    Task<QuoteCreatedDto> CreateAsync(int userId, QuotePayload payload, IReadOnlyList<PhotoUpload> photos, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(int quoteId, int userId, string role, QuotePayload payload, IReadOnlyList<PhotoUpload> photos, CancellationToken cancellationToken);
    Task<bool> CompleteAsync(int quoteId, int userId, string role, string erpQuoteNumber);
    Task<QuoteArchive?> GetPhotoArchiveAsync(int quoteId, int userId, string role, CancellationToken cancellationToken);
}
