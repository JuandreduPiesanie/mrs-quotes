namespace MrsQuotes.Api.Providers.Storage;

public interface IPhotoStorage
{
    Task<StoredPhoto> SaveAsync(PhotoUpload upload, CancellationToken cancellationToken);
    Task DeleteAsync(string fileName);
    string GetPath(string fileName);
}
