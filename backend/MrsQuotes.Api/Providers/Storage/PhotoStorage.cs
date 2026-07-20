using SkiaSharp;

namespace MrsQuotes.Api.Providers.Storage;

public sealed class PhotoStorage(IWebHostEnvironment environment, IConfiguration configuration) : IPhotoStorage
{
    private static readonly SemaphoreSlim ThumbnailLock = new(1, 1);
    private readonly string _directory = ResolveDirectory(environment, configuration);

    public async Task<StoredPhoto> SaveAsync(PhotoUpload upload, CancellationToken cancellationToken)
    {
        if (!upload.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Only image uploads are allowed.");
        }
        if (upload.Length > 8 * 1024 * 1024)
        {
            throw new InvalidOperationException("Each photo must be 8MB or smaller.");
        }

        Directory.CreateDirectory(_directory);
        var extension = Path.GetExtension(upload.OriginalName);
        if (extension.Length > 12) extension = "";
        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var destination = Path.Combine(_directory, fileName);
        await using var input = upload.OpenReadStream();
        await using var output = File.Create(destination);
        await input.CopyToAsync(output, cancellationToken);
        return new StoredPhoto(upload.OriginalName, fileName, upload.ContentType);
    }

    public Task DeleteAsync(string fileName)
    {
        var path = GetPath(fileName);
        if (File.Exists(path)) File.Delete(path);
        var thumbnailPath = GetThumbnailPath(fileName);
        if (File.Exists(thumbnailPath)) File.Delete(thumbnailPath);
        return Task.CompletedTask;
    }

    public string GetPath(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        return Path.Combine(_directory, safeName);
    }

    public async Task<string> GetThumbnailPathAsync(string fileName, CancellationToken cancellationToken)
    {
        var thumbnailPath = GetThumbnailPath(fileName);
        if (File.Exists(thumbnailPath)) return thumbnailPath;

        await ThumbnailLock.WaitAsync(cancellationToken);
        try
        {
            if (File.Exists(thumbnailPath)) return thumbnailPath;

            var sourcePath = GetPath(fileName);
            using var source = SKBitmap.Decode(sourcePath)
                ?? throw new InvalidDataException("The uploaded file could not be decoded as an image.");
            var scale = Math.Min(1d, 360d / Math.Max(source.Width, source.Height));
            var width = Math.Max(1, (int)Math.Round(source.Width * scale));
            var height = Math.Max(1, (int)Math.Round(source.Height * scale));
            using var resized = source.Resize(
                new SKImageInfo(width, height),
                new SKSamplingOptions(SKCubicResampler.Mitchell))
                ?? throw new InvalidDataException("The image thumbnail could not be created.");
            using var image = SKImage.FromBitmap(resized);
            using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, 72);
            await using var output = File.Create(thumbnailPath);
            encoded.SaveTo(output);
            await output.FlushAsync(cancellationToken);
            return thumbnailPath;
        }
        finally
        {
            ThumbnailLock.Release();
        }
    }

    private string GetThumbnailPath(string fileName) => $"{GetPath(fileName)}.thumb.jpg";

    private static string ResolveDirectory(IWebHostEnvironment environment, IConfiguration configuration)
    {
        var configured = configuration["Storage:UploadsPath"];
        return string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(environment.ContentRootPath, "uploads")
            : Path.GetFullPath(configured, environment.ContentRootPath);
    }
}
