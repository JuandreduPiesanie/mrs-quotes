using System.Text.Json.Serialization;

namespace MrsQuotes.Models.Quotes;

public sealed class QuotePayload
{
    public int AppointmentId { get; set; }
    public List<QuoteItemInput> Items { get; set; } = new();
}

public sealed class QuoteItemInput
{
    public int PriceItemId { get; set; }
    public decimal Quantity { get; set; }
}

public sealed class CompleteQuoteRequest
{
    public string ErpQuoteNumber { get; set; } = "";
    public string PhotoArchiveUrl { get; set; } = "";
}

public sealed class QuoteCreatedDto
{
    public int Id { get; set; }
    public string QuoteNumber { get; set; } = "";
    public string Message { get; set; } = "";
}

public sealed class QuoteDto
{
    public int Id { get; set; }
    [JsonPropertyName("assessor_id")]
    public int AssessorId { get; set; }
    [JsonPropertyName("assessor_name")]
    public string AssessorName { get; set; } = "";
    [JsonPropertyName("quote_administrator_id")]
    public int? QuoteAdministratorId { get; set; }
    [JsonPropertyName("quote_administrator_name")]
    public string? QuoteAdministratorName { get; set; }
    [JsonPropertyName("appointment_id")]
    public int? AppointmentId { get; set; }
    [JsonPropertyName("client_id")]
    public int? ClientId { get; set; }
    [JsonPropertyName("quote_number")]
    public string QuoteNumber { get; set; } = "";
    [JsonPropertyName("customer_name")]
    public string CustomerName { get; set; } = "";
    [JsonPropertyName("site_address")]
    public string SiteAddress { get; set; } = "";
    [JsonPropertyName("request_details")]
    public string RequestDetails { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Subtotal { get; set; }
    [JsonPropertyName("erp_quote_number")]
    public string? ErpQuoteNumber { get; set; }
    [JsonPropertyName("photo_archive_url")]
    public string? PhotoArchiveUrl { get; set; }
    [JsonPropertyName("archived_photo_count")]
    public int ArchivedPhotoCount { get; set; }
    [JsonPropertyName("photos_purged_at")]
    public DateTime? PhotosPurgedAt { get; set; }
    [JsonPropertyName("completed_at")]
    public DateTime? CompletedAt { get; set; }
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    [JsonPropertyName("photo_count")]
    public int PhotoCount { get; set; }
    public List<QuoteItemDto> Items { get; set; } = new();
    public List<QuotePhotoDto> Photos { get; set; } = new();
}

public sealed class QuoteItemDto
{
    public int Id { get; set; }
    [JsonPropertyName("price_item_id")]
    public int PriceItemId { get; set; }
    public string Description { get; set; } = "";
    public string Unit { get; set; } = "";
    public decimal Quantity { get; set; }
    [JsonPropertyName("unit_rate")]
    public decimal UnitRate { get; set; }
    [JsonPropertyName("line_total")]
    public decimal LineTotal { get; set; }
}

public sealed class QuotePhotoDto
{
    public int Id { get; set; }
    [JsonPropertyName("original_name")]
    public string OriginalName { get; set; } = "";
    [JsonPropertyName("mime_type")]
    public string MimeType { get; set; } = "";
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
    public string Url { get; set; } = "";
}
