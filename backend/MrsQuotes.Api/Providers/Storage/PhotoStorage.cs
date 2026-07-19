namespace MrsQuotes.Api.Providers.Storage;

public sealed class PhotoStorage(IWebHostEnvironment environment, IConfiguration configuration) : IPhotoStorage
{
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
        return Task.CompletedTask;
    }

    public string GetPath(string fileName)
    {
        var safeName = Path.GetFileName(fileName);
        return Path.Combine(_directory, safeName);
    }

    private static string ResolveDirectory(IWebHostEnvironment environment, IConfiguration configuration)
    {
        var configured = configuration["Storage:UploadsPath"];
        return string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(environment.ContentRootPath, "uploads")
            : Path.GetFullPath(configured, environment.ContentRootPath);
    }
}
