using System.Text.Json.Serialization;

namespace MrsQuotes.Models.Pricing;

public sealed class PriceItemDto
{
    public int Id { get; set; }
    public string Section { get; set; } = "";
    public string Category { get; set; } = "";
    [JsonPropertyName("quote_group")]
    public string QuoteGroup { get; set; } = "";
    [JsonPropertyName("item_code")]
    public string? ItemCode { get; set; }
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal? Rate { get; set; }
}

public sealed class PriceSectionDto
{
    public string Section { get; set; } = "";
    [JsonPropertyName("quote_group")]
    public string QuoteGroup { get; set; } = "";
    [JsonPropertyName("item_count")]
    public int ItemCount { get; set; }
}
