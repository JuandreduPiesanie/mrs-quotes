using System.Text.Json.Serialization;

namespace MrsQuotes.Models.Appointments;

public sealed class CreateAppointmentRequest
{
    public int AssessorId { get; set; }
    public int ClientId { get; set; }
    public string SiteAddress { get; set; } = "";
    public string RequestDetails { get; set; } = "";
    public DateTime AppointmentStart { get; set; }
    public DateTime? AppointmentEnd { get; set; }
}

public sealed class AppointmentDto
{
    public int? Id { get; set; }
    [JsonPropertyName("quote_id")]
    public int? QuoteId { get; set; }
    [JsonPropertyName("quote_number")]
    public string? QuoteNumber { get; set; }
    [JsonPropertyName("assessor_id")]
    public int AssessorId { get; set; }
    [JsonPropertyName("assessor_name")]
    public string AssessorName { get; set; } = "";
    [JsonPropertyName("client_id")]
    public int? ClientId { get; set; }
    [JsonPropertyName("client_name")]
    public string? ClientName { get; set; }
    [JsonPropertyName("customer_name")]
    public string CustomerName { get; set; } = "";
    [JsonPropertyName("site_address")]
    public string SiteAddress { get; set; } = "";
    [JsonPropertyName("request_details")]
    public string RequestDetails { get; set; } = "";
    [JsonPropertyName("appointment_start")]
    public DateTime AppointmentStart { get; set; }
    [JsonPropertyName("appointment_end")]
    public DateTime? AppointmentEnd { get; set; }
    public string Status { get; set; } = "";
    public decimal? Subtotal { get; set; }
    [JsonPropertyName("quote_administrator_id")]
    public int? QuoteAdministratorId { get; set; }
    [JsonPropertyName("quote_administrator_name")]
    public string? QuoteAdministratorName { get; set; }
    [JsonPropertyName("calendar_type")]
    public string CalendarType { get; set; } = "";
}
