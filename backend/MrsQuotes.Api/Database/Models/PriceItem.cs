namespace MrsQuotes.Api.Database.Models;

public sealed class PriceItem
{
    public int Id { get; set; }
    public string Section { get; set; } = "";
    public string Category { get; set; } = "General";
    public string QuoteGroup { get; set; } = "General";
    public string? ItemCode { get; set; }
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "Each";
    public decimal Rate { get; set; }
    public bool Active { get; set; } = true;
    public string? SourceSheet { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<QuoteItem> QuoteItems { get; set; } = new();
}
