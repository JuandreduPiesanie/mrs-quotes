namespace MrsQuotes.Api.Database.Models;

public sealed class QuotePhoto
{
    public int Id { get; set; }
    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;
    public string OriginalName { get; set; } = "";
    public string FileName { get; set; } = "";
    public string MimeType { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}
