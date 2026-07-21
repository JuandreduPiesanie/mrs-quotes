using System.Text.Json.Serialization;

namespace MrsQuotes.Models.Pricing;

public sealed class PriceItemDto
{
    public int Id { get; set; }
    public string Section { get; set; } = "";
    public string Category { get; set; } = "";
    [JsonPropertyName("trade_code")]
    public string TradeCode { get; set; } = "";
    [JsonPropertyName("trade_name")]
    public string TradeName { get; set; } = "";
    [JsonPropertyName("trade_group")]
    public string TradeGroup { get; set; } = "";
    [JsonPropertyName("item_code")]
    public string? ItemCode { get; set; }
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal? Rate { get; set; }
    [JsonPropertyName("pricing_mode")]
    public string PricingMode { get; set; } = "fixed";
    [JsonPropertyName("markup_percentage")]
    public decimal? MarkupPercentage { get; set; }
    [JsonPropertyName("pricing_note")]
    public string? PricingNote { get; set; }
    [JsonPropertyName("requires_rate_input")]
    public bool RequiresRateInput { get; set; }
    [JsonPropertyName("automatic_startup_fee")]
    public bool AutomaticStartupFee { get; set; }
}

public sealed class PriceTradeDto
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Group { get; set; } = "";
    [JsonPropertyName("item_count")]
    public int ItemCount { get; set; }
}
