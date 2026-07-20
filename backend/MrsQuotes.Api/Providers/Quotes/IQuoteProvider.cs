using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.Providers.Quotes;

public sealed record QuoteArchive(byte[] Content, string FileName);
public sealed record QuotePhotoFile(byte[] Content, string ContentType);

public interface IQuoteProvider
{
    Task<List<QuoteDto>> GetQuotesAsync(int userId, string role, int? assessorId, string? status);
    Task<QuoteDto?> GetQuoteAsync(int quoteId, int userId, string role);
    Task<QuoteCreatedDto> CreateAsync(int userId, QuotePayload payload, IReadOnlyList<PhotoUpload> photos, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(int quoteId, int userId, string role, QuotePayload payload, IReadOnlyList<PhotoUpload> photos, CancellationToken cancellationToken);
    Task<bool> CompleteAsync(int quoteId, int userId, string role, string erpQuoteNumber, string photoArchiveUrl);
    Task<QuotePhotoFile?> GetPhotoAsync(int quoteId, int photoId, int userId, string role, CancellationToken cancellationToken);
    Task<QuoteArchive?> GetPhotoArchiveAsync(int quoteId, int userId, string role, CancellationToken cancellationToken);
}
