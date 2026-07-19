namespace MrsQuotes.Api.Providers.Storage;

public sealed record PhotoUpload(
    string OriginalName,
    string ContentType,
    long Length,
    Func<Stream> OpenReadStream);

public sealed record StoredPhoto(string OriginalName, string FileName, string MimeType);
