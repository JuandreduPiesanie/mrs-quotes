using System.Security.Claims;
using MrsQuotes.Api.Providers.Users;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Users;

namespace MrsQuotes.Api.EndpointHandlers.Users;

public sealed class UserHandler(IUserProvider provider)
{
    public async Task<IResult> GetUsers() => Results.Ok(await provider.GetUsersAsync());

    public async Task<IResult> CreateUser(CreateUserRequest request)
    {
        var user = await provider.CreateUserAsync(request);
        return Results.Created($"/api/users/{user.Id}", user);
    }

    public async Task<IResult> UpdateUser(int userId, UpdateUserRequest request)
    {
        var user = await provider.UpdateUserAsync(userId, request);
        return user is null
            ? Results.NotFound(new { error = "User not found." })
            : Results.Ok(user);
    }

    public async Task<IResult> GetAssessors(ClaimsPrincipal principal)
    {
        return Results.Ok(await provider.GetAssessorsAsync(principal.UserId(), principal.UserRole()));
    }

    public async Task<IResult> GetQuoteAdministrators()
    {
        return Results.Ok(await provider.GetQuoteAdministratorsAsync());
    }

    public async Task<IResult> AssignQuoteAdministrator(int assessorId, AssignQuoteAdministratorRequest request)
    {
        var assessor = await provider.AssignQuoteAdministratorAsync(assessorId, request.QuoteAdministratorId);
        return assessor is null
            ? Results.NotFound(new { error = "Quote assessor not found." })
            : Results.Ok(assessor);
    }
}
