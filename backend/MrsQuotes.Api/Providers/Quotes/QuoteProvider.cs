using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Database.Models;
using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.Providers.Quotes;

public sealed class QuoteProvider(
    MrsQuotesDbContext context,
    IPhotoStorage photoStorage) : IQuoteProvider
{
    public async Task<List<QuoteDto>> GetQuotesAsync(
        int userId,
        string role,
        int? assessorId,
        string? status)
    {
        var requestedStatus = string.IsNullOrWhiteSpace(status)
            ? "submitted"
            : status.Trim().ToLowerInvariant();
        if (requestedStatus is not ("submitted" or "completed" or "all"))
        {
            throw new InvalidOperationException("Quote status must be submitted, completed, or all.");
        }

        var query = context.Quotes.AsNoTracking();
        if (requestedStatus != "all")
        {
            query = query.Where(x => x.Status == requestedStatus);
        }
        query = role switch
        {
            RoleNames.Assessor => query.Where(x => x.AssessorId == userId),
            RoleNames.QuoteAdministrator => query.Where(x => x.QuoteAdministratorId == userId),
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
            QuoteAdministratorId = x.QuoteAdministratorId,
            QuoteAdministratorName = x.QuoteAdministrator != null ? x.QuoteAdministrator.Name : null,
            AppointmentId = x.AppointmentId,
            ClientId = x.ClientId,
            QuoteNumber = x.QuoteNumber,
            CustomerName = x.CustomerName,
            SiteAddress = x.SiteAddress,
            RequestDetails = x.RequestDetails,
            Status = x.Status,
            Subtotal = x.Subtotal,
            ErpQuoteNumber = x.ErpQuoteNumber,
            PhotoArchiveUrl = x.PhotoArchiveUrl,
            ArchivedPhotoCount = x.ArchivedPhotoCount,
            PhotosPurgedAt = x.PhotosPurgedAt,
            PhotoPurgeEligibleAt = x.PhotoPurgeEligibleAt,
            CompletedAt = x.CompletedAt,
            CreatedAt = x.CreatedAt,
            PhotoCount = x.Status == "completed" ? x.ArchivedPhotoCount : x.Photos.Count
        }).ToListAsync();
    }

    public async Task<QuoteDto?> GetQuoteAsync(int quoteId, int userId, string role)
    {
        var quote = await context.Quotes.AsNoTracking()
            .Include(x => x.Assessor)
            .Include(x => x.QuoteAdministrator)
            .Include(x => x.Items)
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId);
        if (quote is null || !CanAccess(quote, userId, role)) return null;
        return MapQuote(quote);
    }

    public async Task<QuoteCreatedDto> CreateAsync(
        int userId,
        string role,
        QuotePayload payload,
        IReadOnlyList<PhotoUpload> photos,
        CancellationToken cancellationToken)
    {
        if (photos.Count > 50) throw new InvalidOperationException("You can upload a maximum of 50 photos per quote.");
        var appointment = await context.Appointments
            .Include(x => x.Client)
            .Include(x => x.Assessor)
            .FirstOrDefaultAsync(x => x.Id == payload.AppointmentId
                && (role == RoleNames.Admin || x.AssessorId == userId), cancellationToken);
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
                AssessorId = appointment.AssessorId,
                QuoteAdministratorId = appointment.Assessor.QuoteAdministratorId,
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
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null) return false;
        if (quote.Status != "submitted")
        {
            throw new InvalidOperationException("Completed quotes cannot be edited.");
        }
        if (role != RoleNames.Admin && quote.AssessorId != userId)
        {
            throw new UnauthorizedAccessException("You can only edit your own quotes.");
        }
        if (quote.Photos.Count + photos.Count > 50)
        {
            throw new InvalidOperationException("A quote can contain a maximum of 50 photos.");
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

    public async Task<bool> CompleteAsync(
        int quoteId,
        int userId,
        string role,
        string erpQuoteNumber,
        string photoArchiveUrl)
    {
        var quote = await context.Quotes
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId);
        if (quote is null || !CanAccess(quote, userId, role)) return false;
        if (quote.Status != "submitted")
        {
            throw new InvalidOperationException("Only outstanding submitted quotes can be completed.");
        }
        var completedAt = DateTime.UtcNow;
        var photosToPurge = quote.Photos.ToList();
        quote.Status = "completed";
        quote.ErpQuoteNumber = erpQuoteNumber.Trim();
        quote.PhotoArchiveUrl = photoArchiveUrl.Trim();
        quote.ArchivedPhotoCount = photosToPurge.Count;
        quote.CompletedAt = completedAt;
        quote.PhotosPurgedAt = photosToPurge.Count == 0 ? completedAt : null;
        quote.PhotoPurgeEligibleAt = photosToPurge.Count == 0
            ? completedAt
            : completedAt.AddHours(48);
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
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null || quote.Status != "submitted" || !CanAccess(quote, userId, role)) return null;
        if (quote.Photos.Count == 0) throw new InvalidOperationException("This quote has no photos to download.");

        var files = new List<QuoteArchiveFile>();
        var index = 0;
        foreach (var photo in quote.Photos)
        {
            var path = photoStorage.GetPath(photo.FileName);
            if (!File.Exists(path)) continue;
            index++;
            var safeName = string.Join("-", photo.OriginalName.Split(Path.GetInvalidFileNameChars()));
            files.Add(new QuoteArchiveFile(path, $"{index:00}-{safeName}"));
        }
        if (files.Count == 0) throw new InvalidOperationException("The photo files could not be found on disk.");
        return new QuoteArchive(files, $"{quote.QuoteNumber}-photos.zip");
    }

    public async Task<QuotePhotoFile?> GetPhotoAsync(
        int quoteId,
        int photoId,
        int userId,
        string role,
        bool thumbnail,
        CancellationToken cancellationToken)
    {
        var quote = await context.Quotes.AsNoTracking()
            .Include(x => x.Photos)
            .FirstOrDefaultAsync(x => x.Id == quoteId, cancellationToken);
        if (quote is null || quote.Status != "submitted" || !CanAccess(quote, userId, role)) return null;

        var photo = quote.Photos.FirstOrDefault(x => x.Id == photoId);
        if (photo is null) return null;

        var path = photoStorage.GetPath(photo.FileName);
        if (!File.Exists(path)) return null;

        if (thumbnail)
        {
            try
            {
                return new QuotePhotoFile(
                    await photoStorage.GetThumbnailPathAsync(photo.FileName, cancellationToken),
                    "image/jpeg");
            }
            catch (InvalidDataException)
            {
                return new QuotePhotoFile(path, photo.MimeType);
            }
        }

        return new QuotePhotoFile(path, photo.MimeType);
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
            .Where(x => ids.Contains(x.Id) && x.Active && x.ScheduleVersion == 2026)
            .ToDictionaryAsync(x => x.Id, cancellationToken);
        if (prices.Count != ids.Length)
        {
            throw new InvalidOperationException("A selected price item is no longer available.");
        }

        if (prices.Values.Any(x => x.SystemGenerated))
        {
            throw new InvalidOperationException("Automatic fees cannot be selected or removed manually.");
        }

        var quoteItems = requested.Select(input =>
        {
            if (input.Quantity <= 0) throw new InvalidOperationException("Quantities must be greater than zero.");
            var price = prices[input.PriceItemId];
            var unitRate = CalculateUnitRate(price, input.EnteredRate);
            return CreateQuoteItem(price, input.Quantity, unitRate, input.EnteredRate, false);
        }).ToList();

        var automaticFeeCodes = prices.Values
            .Select(x => x.AutomaticFeeCode)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Cast<string>()
            .ToArray();
        if (automaticFeeCodes.Length == 0) return quoteItems;

        var automaticFees = await context.PriceItems.AsNoTracking()
            .Where(x => x.Active && x.ScheduleVersion == 2026 && x.SystemGenerated
                && x.ItemCode != null && automaticFeeCodes.Contains(x.ItemCode))
            .OrderBy(x => x.TradeName)
            .ToListAsync(cancellationToken);
        if (automaticFees.Count != automaticFeeCodes.Length)
        {
            throw new InvalidOperationException("The 2026 automatic fee configuration is incomplete. Contact an administrator.");
        }

        quoteItems.AddRange(automaticFees.Select(fee =>
            CreateQuoteItem(fee, 1, fee.Rate, null, true)));
        return quoteItems;
    }

    private static decimal CalculateUnitRate(PriceItem price, decimal? enteredRate)
    {
        if (price.PricingMode == "fixed") return price.Rate;
        if (!enteredRate.HasValue)
        {
            throw new InvalidOperationException($"Enter the required excl. VAT amount for '{price.Description}'.");
        }
        if (enteredRate.Value < 0)
        {
            throw new InvalidOperationException("Entered excl. VAT amounts cannot be negative.");
        }

        return price.PricingMode switch
        {
            "cost" => decimal.Round(enteredRate.Value, 2),
            "cost-plus" => decimal.Round(enteredRate.Value * (1 + (price.MarkupPercentage ?? 0) / 100), 2),
            "manual" => decimal.Round(enteredRate.Value, 2),
            _ => throw new InvalidOperationException($"Unsupported pricing rule '{price.PricingMode}'.")
        };
    }

    private static QuoteItem CreateQuoteItem(
        PriceItem price,
        decimal quantity,
        decimal unitRate,
        decimal? inputAmount,
        bool systemGenerated)
    {
        return new QuoteItem
        {
            PriceItemId = price.Id,
            TradeCode = price.TradeCode,
            TradeName = price.TradeName,
            Category = price.Category,
            Description = price.Description,
            Unit = price.Unit,
            Quantity = quantity,
            InputAmount = inputAmount,
            UnitRate = unitRate,
            LineTotal = decimal.Round(quantity * unitRate, 2),
            SystemGenerated = systemGenerated
        };
    }

    private static bool CanAccess(Quote quote, int userId, string role)
    {
        return role switch
        {
            RoleNames.Admin or RoleNames.Management => true,
            RoleNames.Assessor => quote.AssessorId == userId,
            RoleNames.QuoteAdministrator => quote.QuoteAdministratorId == userId,
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
            QuoteAdministratorId = quote.QuoteAdministratorId,
            QuoteAdministratorName = quote.QuoteAdministrator?.Name,
            AppointmentId = quote.AppointmentId,
            ClientId = quote.ClientId,
            QuoteNumber = quote.QuoteNumber,
            CustomerName = quote.CustomerName,
            SiteAddress = quote.SiteAddress,
            RequestDetails = quote.RequestDetails,
            Status = quote.Status,
            Subtotal = quote.Subtotal,
            ErpQuoteNumber = quote.ErpQuoteNumber,
            PhotoArchiveUrl = quote.PhotoArchiveUrl,
            ArchivedPhotoCount = quote.ArchivedPhotoCount,
            PhotosPurgedAt = quote.PhotosPurgedAt,
            PhotoPurgeEligibleAt = quote.PhotoPurgeEligibleAt,
            CompletedAt = quote.CompletedAt,
            CreatedAt = quote.CreatedAt,
            PhotoCount = quote.Status == "completed" ? quote.ArchivedPhotoCount : quote.Photos.Count,
            Items = quote.Items.OrderBy(x => x.Id).Select(x => new QuoteItemDto
            {
                Id = x.Id,
                PriceItemId = x.PriceItemId,
                TradeCode = x.TradeCode,
                TradeName = x.TradeName,
                Category = x.Category,
                Description = x.Description,
                Unit = x.Unit,
                Quantity = x.Quantity,
                InputAmount = x.InputAmount,
                UnitRate = x.UnitRate,
                LineTotal = x.LineTotal,
                SystemGenerated = x.SystemGenerated
            }).ToList(),
            Photos = quote.Status == "completed"
                ? []
                : quote.Photos.OrderBy(x => x.Id).Select(x => new QuotePhotoDto
            {
                Id = x.Id,
                OriginalName = x.OriginalName,
                MimeType = x.MimeType,
                CreatedAt = x.CreatedAt,
                Url = $"/quotes/{quote.Id}/photos/{x.Id}"
            }).ToList()
        };
    }

    private static string FormatQuoteNumber(int id) => $"MRS-Q-{id:000000}";
}
