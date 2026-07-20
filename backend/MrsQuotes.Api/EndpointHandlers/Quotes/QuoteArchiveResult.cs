using System.IO.Compression;
using MrsQuotes.Api.Providers.Quotes;

namespace MrsQuotes.Api.EndpointHandlers.Quotes;

public sealed class QuoteArchiveResult(QuoteArchive archive) : IResult
{
    public async Task ExecuteAsync(HttpContext httpContext)
    {
        httpContext.Response.StatusCode = StatusCodes.Status200OK;
        httpContext.Response.ContentType = "application/zip";
        httpContext.Response.Headers.ContentDisposition = "attachment; filename=" + archive.FileName;

        using var zip = new ZipArchive(httpContext.Response.Body, ZipArchiveMode.Create, leaveOpen: true);
        foreach (var file in archive.Files)
        {
            var entry = zip.CreateEntry(file.EntryName, CompressionLevel.Fastest);
            await using var entryStream = entry.Open();
            await using var fileStream = new FileStream(
                file.Path,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 64 * 1024,
                useAsync: true);
            await fileStream.CopyToAsync(entryStream, httpContext.RequestAborted);
        }
    }
}
