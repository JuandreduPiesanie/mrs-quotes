namespace MrsQuotes.Api.Database.Models;

public sealed class Quote
{
    public int Id { get; set; }
    public int AssessorId { get; set; }
    public User Assessor { get; set; } = null!;
    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }
    public int? ClientId { get; set; }
    public Client? Client { get; set; }
    public string QuoteNumber { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string SiteAddress { get; set; } = "";
    public string RequestDetails { get; set; } = "";
    public string Status { get; set; } = "submitted";
    public decimal Subtotal { get; set; }
    public string? ErpQuoteNumber { get; set; }
    public string? PhotoArchiveUrl { get; set; }
    public int ArchivedPhotoCount { get; set; }
    public DateTime? PhotosPurgedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<QuoteItem> Items { get; set; } = new();
    public List<QuotePhoto> Photos { get; set; } = new();
}
