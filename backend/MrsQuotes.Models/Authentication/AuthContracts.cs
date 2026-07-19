namespace MrsQuotes.Models.Authentication;

public sealed class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public sealed class AuthResult
{
    public string Token { get; set; } = "";
    public UserSession User { get; set; } = new();
}

public sealed class UserSession
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";
}

public sealed class FirstAdminRequest
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}
