using System.Text.Json.Serialization;

namespace MrsQuotes.Models.Users;

public sealed class CreateUserRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string Role { get; set; } = "";
}

public sealed class UpdateUserRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string Role { get; set; } = "";
}

public sealed class AssignQuoteAdministratorRequest
{
    public int? QuoteAdministratorId { get; set; }
}

public sealed class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";
    [JsonPropertyName("quote_administrator_id")]
    public int? QuoteAdministratorId { get; set; }
    [JsonPropertyName("quote_administrator_name")]
    public string? QuoteAdministratorName { get; set; }
    [JsonPropertyName("created_at")]
    public DateTime CreatedAt { get; set; }
}
