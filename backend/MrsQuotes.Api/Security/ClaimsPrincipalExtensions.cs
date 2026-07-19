using System.Security.Claims;

namespace MrsQuotes.Api.Security;

public static class ClaimsPrincipalExtensions
{
    public static int UserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) ? id : throw new UnauthorizedAccessException();
    }

    public static string UserRole(this ClaimsPrincipal principal)
    {
        return principal.FindFirstValue(ClaimTypes.Role) ?? throw new UnauthorizedAccessException();
    }
}
