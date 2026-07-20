using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;

namespace MrsQuotes.Api.Providers.Storage;

public sealed class CompletedQuotePhotoPurgeWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<CompletedQuotePhotoPurgeWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PurgePendingPhotosAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "The completed-quote photo purge pass failed.");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task PurgePendingPhotosAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MrsQuotesDbContext>();
        var photoStorage = scope.ServiceProvider.GetRequiredService<IPhotoStorage>();
        var now = DateTime.UtcNow;
        var quotes = await context.Quotes
            .Include(x => x.Photos)
            .Where(x => x.Status == "completed"
                && x.PhotoArchiveUrl != null
                && x.PhotosPurgedAt == null
                && x.PhotoPurgeEligibleAt != null
                && x.PhotoPurgeEligibleAt <= now)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var quote in quotes)
        {
            var originalPhotoCount = quote.Photos.Count;
            var deletedPhotos = new List<Database.Models.QuotePhoto>();
            foreach (var photo in quote.Photos)
            {
                try
                {
                    await photoStorage.DeleteAsync(photo.FileName);
                    deletedPhotos.Add(photo);
                }
                catch (Exception exception)
                {
                    logger.LogWarning(
                        exception,
                        "Photo {PhotoId} for completed quote {QuoteId} remains pending purge.",
                        photo.Id,
                        quote.Id);
                }
            }

            if (deletedPhotos.Count > 0)
            {
                context.QuotePhotos.RemoveRange(deletedPhotos);
            }
            if (deletedPhotos.Count == originalPhotoCount)
            {
                quote.PhotosPurgedAt = DateTime.UtcNow;
            }
        }

        if (quotes.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }
    }
}
