using System.IO.Compression;
using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Database.Models;
using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.Providers.Quotes;

public sealed class QuoteProvider(MrsQuotesDbContext context, IPhotoStorage photoStorage) : IQuoteProvider
{
    public async Task<List<QuoteDto>> GetQuotesAsync(int userId, string role, int? assessorId)
    {
        var query = context.Quotes.AsNoTracking().Where(x => x.Status == "submitted");
        query = role switch
        {
            RoleNames.Assessor => query.Where(x => x.AssessorId == userId),
            RoleNames.QuoteAdministrator => query.Where(x => x.Assessor.QuoteAdministratorId == userId),
            RoleNames.Management or RoleNames.Admin => query,
            _ => query.Where(_ => false)
        };
        if (assessorId.HasValue && role is RoleNames.Admin or RoleNames.Management or RoleNames.QuoteAdministrator)
        {
            query = query.Where(x => x.AssessorId == assessorId);
        }

        return await query.OrderByDescending(x => x.CreatedAt).Select(x => new QuoteDto
        {
            Id = x.Id,
            AssessorId = x.AssessorId,
            AssessorName = x.Assessor.Name,
            QuoteAdministratorId = x.Assessor.QuoteAdministratorId,
            QuoteAdministratorName = x.Assessor.QuoteAdministrator != null ? x.Assessor.QuoteAdministrator.Name : null,
            AppointmentId = x.AppointmentId,
            ClientId = x.ClientId,
            QuoteNumber = x.QuoteNumber,
            CustomerName = x.CustomerName,
            SiteAddress = x.SiteAddress,
            RequestDetails = x.RequestDetails,
            Status = x.Status,
            Subtotal = x.Subtotal,
            ErpQuoteNumber = x.ErpQuoteNumber,
            CompletedAt = x.CompletedAt,
            CreatedAt = x.CreatedAt,
            PhotoCount = x.Photos.Count
        }).ToListAsync();
    }

    public async Task<QuoteDto?> GetQuoteAsync(int quoteId, int userId, string role)
    {
        var quote = await context.Quotes.AsNoTracking()
            .Include(x => x.Assessor).ThenInclude(x => x.QuoteAdministrator)
            .Include(x => x.Items)
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId);
        if (quote is null || !CanAccess(quote, userId, role)) return null;
        return MapQuote(quote);
    }

    public async Task<QuoteCreatedDto> CreateAsync(
        int userId,
        QuotePayload payload,
        IReadOnlyList<PhotoUpload> photos,
        CancellationToken cancellationToken)
    {
        if (photos.Count > 50) throw new InvalidOperationException("You can upload a maximum of 50 photos per quote.");
        var appointment = await context.Appointments
            .Include(x => x.Client)
            .FirstOrDefaultAsync(x => x.Id == payload.AppointmentId && x.AssessorId == userId, cancellationToken);
        if (appointment is null)
        {
            throw new InvalidOperationException("Selected appointment was not found for this assessor.");
        }
        if (await context.Quotes.AnyAsync(x => x.AppointmentId == appointment.Id, cancellationToken))
        {
            throw new InvalidOperationException("A quote has already been submitted for this appointment.");
        }

        var pricedItems = await PriceItemsAsync(payload.Items, cancellationToken);
        var storedPhotos = new List<StoredPhoto>();
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var photo in photos)
            {
                storedPhotos.Add(await photoStorage.SaveAsync(photo, cancellationToken));
            }

            var quote = new Quote
            {
                AssessorId = userId,
                AppointmentId = appointment.Id,
                ClientId = appointment.ClientId,
                CustomerName = appointment.CustomerName,
                SiteAddress = appointment.SiteAddress,
                RequestDetails = appointment.RequestDetails,
                Subtotal = pricedItems.Sum(x => x.LineTotal),
                Items = pricedItems,
                Photos = storedPhotos.Select(x => new QuotePhoto
                {
                    OriginalName = x.OriginalName,
                    FileName = x.FileName,
                    MimeType = x.MimeType
                }).ToList()
            };
            context.Quotes.Add(quote);
            appointment.Status = "completed";
            await context.SaveChangesAsync(cancellationToken);
            quote.QuoteNumber = FormatQuoteNumber(quote.Id);
            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new QuoteCreatedDto
            {
                Id = quote.Id,
                QuoteNumber = quote.QuoteNumber,
                Message = "Quote submitted to quote administrator."
            };
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            foreach (var photo in storedPhotos) await photoStorage.DeleteAsync(photo.FileName);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(
        int quoteId,
        int userId,
        string role,
        QuotePayload payload,
        IReadOnlyList<PhotoUpload> photos,
        CancellationToken cancellationToken)
    {
        if (photos.Count > 50) throw new InvalidOperationException("You can upload a maximum of 50 photos per quote.");
        var quote = await context.Quotes
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null) return false;
        if (role != RoleNames.Admin && quote.AssessorId != userId)
        {
            throw new UnauthorizedAccessException("You can only edit your own quotes.");
        }

        var pricedItems = await PriceItemsAsync(payload.Items, cancellationToken);
        var storedPhotos = new List<StoredPhoto>();
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            foreach (var photo in photos)
            {
                storedPhotos.Add(await photoStorage.SaveAsync(photo, cancellationToken));
            }
            context.QuoteItems.RemoveRange(quote.Items);
            quote.Items = pricedItems;
            quote.Subtotal = pricedItems.Sum(x => x.LineTotal);
            foreach (var photo in storedPhotos)
            {
                quote.Photos.Add(new QuotePhoto
                {
                    OriginalName = photo.OriginalName,
                    FileName = photo.FileName,
                    MimeType = photo.MimeType
                });
            }
            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            foreach (var photo in storedPhotos) await photoStorage.DeleteAsync(photo.FileName);
            throw;
        }
    }

    public async Task<bool> CompleteAsync(int quoteId, int userId, string role, string erpQuoteNumber)
    {
        var quote = await context.Quotes
            .Include(x => x.Assessor)
            .FirstOrDefaultAsync(x => x.Id == quoteId);
        if (quote is null || !CanAccess(quote, userId, role)) return false;
        if (quote.Status != "submitted")
        {
            throw new InvalidOperationException("Only outstanding submitted quotes can be completed.");
        }
        quote.Status = "completed";
        quote.ErpQuoteNumber = erpQuoteNumber.Trim();
        quote.CompletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<QuoteArchive?> GetPhotoArchiveAsync(
        int quoteId,
        int userId,
        string role,
        CancellationToken cancellationToken)
    {
        var quote = await context.Quotes.AsNoTracking()
            .Include(x => x.Assessor)
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null || quote.Status != "submitted" || !CanAccess(quote, userId, role)) return null;
        if (quote.Photos.Count == 0) throw new InvalidOperationException("This quote has no photos to download.");

        await using var output = new MemoryStream();
        using (var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true))
        {
            var index = 0;
            foreach (var photo in quote.Photos)
            {
                var path = photoStorage.GetPath(photo.FileName);
                if (!File.Exists(path)) continue;
                index++;
                var safeName = string.Join("-", photo.OriginalName.Split(Path.GetInvalidFileNameChars()));
                var entry = archive.CreateEntry($"{index:00}-{safeName}", CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await using var fileStream = File.OpenRead(path);
                await fileStream.CopyToAsync(entryStream, cancellationToken);
            }
        }
        if (output.Length == 0) throw new InvalidOperationException("The photo files could not be found on disk.");
        return new QuoteArchive(output.ToArray(), $"{quote.QuoteNumber}-photos.zip");
    }

    private async Task<List<QuoteItem>> PriceItemsAsync(
        IReadOnlyCollection<QuoteItemInput> requested,
        CancellationToken cancellationToken)
    {
        if (requested.Count == 0) throw new InvalidOperationException("At least one line item is required.");
        if (requested.Select(x => x.PriceItemId).Distinct().Count() != requested.Count)
        {
            throw new InvalidOperationException("A price item can only be selected once.");
        }
        var ids = requested.Select(x => x.PriceItemId).ToArray();
        var prices = await context.PriceItems.AsNoTracking()
            .Where(x => ids.Contains(x.Id) && x.Active)
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        if (prices.Count != ids.Length)
        {
            throw new InvalidOperationException("A selected price item is no longer available.");
        }

        return requested.Select(input =>
        {
            if (input.Quantity <= 0) throw new InvalidOperationException("Quantities must be greater than zero.");
            var price = prices[input.PriceItemId];
            return new QuoteItem
            {
                PriceItemId = price.Id,
                Description = price.Description,
                Unit = price.Unit,
                Quantity = input.Quantity,
                UnitRate = price.Rate,
                LineTotal = decimal.Round(input.Quantity * price.Rate, 2)
            };
        }).ToList();
    }

    private static bool CanAccess(Quote quote, int userId, string role)
    {
        return role switch
        {
            RoleNames.Admin or RoleNames.Management => true,
            RoleNames.Assessor => quote.AssessorId == userId,
            RoleNames.QuoteAdministrator => quote.Assessor.QuoteAdministratorId == userId,
            _ => false
        };
    }

    private static QuoteDto MapQuote(Quote quote)
    {
        return new QuoteDto
        {
            Id = quote.Id,
            AssessorId = quote.AssessorId,
            AssessorName = quote.Assessor.Name,
            QuoteAdministratorId = quote.Assessor.QuoteAdministratorId,
            QuoteAdministratorName = quote.Assessor.QuoteAdministrator?.Name,
            AppointmentId = quote.AppointmentId,
            ClientId = quote.ClientId,
            QuoteNumber = quote.QuoteNumber,
            CustomerName = quote.CustomerName,
            SiteAddress = quote.SiteAddress,
            RequestDetails = quote.RequestDetails,
            Status = quote.Status,
            Subtotal = quote.Subtotal,
            ErpQuoteNumber = quote.ErpQuoteNumber,
            CompletedAt = quote.CompletedAt,
            CreatedAt = quote.CreatedAt,
            PhotoCount = quote.Photos.Count,
            Items = quote.Items.OrderBy(x => x.Id).Select(x => new QuoteItemDto
            {
                Id = x.Id,
                PriceItemId = x.PriceItemId,
                Description = x.Description,
                Unit = x.Unit,
                Quantity = x.Quantity,
                UnitRate = x.UnitRate,
                LineTotal = x.LineTotal
            }).ToList(),
            Photos = quote.Photos.OrderBy(x => x.Id).Select(x => new QuotePhotoDto
            {
                Id = x.Id,
                OriginalName = x.OriginalName,
                MimeType = x.MimeType,
                CreatedAt = x.CreatedAt,
                Url = $"/uploads/{Uri.EscapeDataString(x.FileName)}"
            }).ToList()
        };
    }

    private static string FormatQuoteNumber(int id) => $"MRS-Q-{id:000000}";
}
