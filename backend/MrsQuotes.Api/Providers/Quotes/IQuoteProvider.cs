using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.Providers.Quotes;

public sealed record QuoteArchiveFile(string Path, string EntryName);
public sealed record QuoteArchive(IReadOnlyList<QuoteArchiveFile> Files, string FileName);
public sealed record QuotePhotoFile(string Path, string ContentType);

public interface IQuoteProvider
{
    Task<List<QuoteDto>> GetQuotesAsync(int userId, string role, int? assessorId, string? status);
    Task<QuoteDto?> GetQuoteAsync(int quoteId, int userId, string role);
    Task<QuoteCreatedDto> CreateAsync(int userId, string role, QuotePayload payload, IReadOnlyList<PhotoUpload> photos, CancellationToken cancellationToken);
    Task<bool> UpdateAsync(int quoteId, int userId, string role, QuotePayload payload, IReadOnlyList<PhotoUpload> photos, CancellationToken cancellationToken);
    Task<bool> CompleteAsync(int quoteId, int userId, string role, string erpQuoteNumber, string photoArchiveUrl);
    Task<QuotePhotoFile?> GetPhotoAsync(int quoteId, int photoId, int userId, string role, bool thumbnail, CancellationToken cancellationToken);
    Task<QuoteArchive?> GetPhotoArchiveAsync(int quoteId, int userId, string role, CancellationToken cancellationToken);
}
