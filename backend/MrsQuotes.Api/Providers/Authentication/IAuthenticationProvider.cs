using MrsQuotes.Models.Authentication;

namespace MrsQuotes.Api.Providers.Authentication;

public interface IAuthenticationProvider
{
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task<AuthResult> SetupFirstAdminAsync(FirstAdminRequest request);
}
