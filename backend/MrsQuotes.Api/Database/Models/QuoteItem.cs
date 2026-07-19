namespace MrsQuotes.Api.Database.Models;

public sealed class QuoteItem
{
    public int Id { get; set; }
    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;
    public int PriceItemId { get; set; }
    public PriceItem PriceItem { get; set; } = null!;
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitRate { get; set; }
    public decimal LineTotal { get; set; }
}
