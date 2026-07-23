using MrsQuotes.Models.Authentication;

namespace MrsQuotes.Api.Providers.Authentication;

public interface IAuthenticationProvider
{
    Task<bool> IsInitialSetupAvailableAsync();
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task<AuthResult> SetupFirstAdminAsync(FirstAdminRequest request);
}
