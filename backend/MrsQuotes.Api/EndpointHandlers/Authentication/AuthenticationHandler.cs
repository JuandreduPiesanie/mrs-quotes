using MrsQuotes.Api.Providers.Authentication;
using MrsQuotes.Models.Authentication;

namespace MrsQuotes.Api.EndpointHandlers.Authentication;

public sealed class AuthenticationHandler(IAuthenticationProvider provider)
{
    public async Task<IResult> GetSetupStatus()
    {
        return Results.Ok(new { setup_available = await provider.IsInitialSetupAvailableAsync() });
    }

    public async Task<IResult> Login(LoginRequest request)
    {
        try
        {
            return Results.Ok(await provider.LoginAsync(request));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Results.Json(new { error = ex.Message }, statusCode: StatusCodes.Status401Unauthorized);
        }
    }

    public async Task<IResult> SetupFirstAdmin(FirstAdminRequest request)
    {
        return Results.Ok(await provider.SetupFirstAdminAsync(request));
    }
}
