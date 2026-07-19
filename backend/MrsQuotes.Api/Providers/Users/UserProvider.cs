using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Database.Models;
using MrsQuotes.Api.Providers.Authentication;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Users;

namespace MrsQuotes.Api.Providers.Users;

public sealed class UserProvider(MrsQuotesDbContext context) : IUserProvider
{
    public Task<List<UserDto>> GetUsersAsync()
    {
        return UserQuery().OrderBy(x => x.Name).ToListAsync();
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await context.Users.AnyAsync(x => x.Email == email))
        {
            throw new InvalidOperationException("A user with this email address already exists.");
        }

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = AuthenticationProvider.HashSecret(request.Password),
            Role = request.Role
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return await UserQuery().SingleAsync(x => x.Id == user.Id);
    }

    public Task<List<UserDto>> GetAssessorsAsync(int requestingUserId, string requestingRole)
    {
        var query = UserQuery().Where(x => x.Role == RoleNames.Assessor);
        if (requestingRole == RoleNames.QuoteAdministrator)
        {
            query = query.Where(x => x.QuoteAdministratorId == requestingUserId);
        }
        return query.OrderBy(x => x.Name).ToListAsync();
    }

    public Task<List<UserDto>> GetQuoteAdministratorsAsync()
    {
        return UserQuery()
            .Where(x => x.Role == RoleNames.QuoteAdministrator)
            .OrderBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<UserDto?> AssignQuoteAdministratorAsync(int assessorId, int? quoteAdministratorId)
    {
        var assessor = await context.Users.FirstOrDefaultAsync(x => x.Id == assessorId && x.Role == RoleNames.Assessor);
        if (assessor is null) return null;

        if (quoteAdministratorId.HasValue &&
            !await context.Users.AnyAsync(x => x.Id == quoteAdministratorId && x.Role == RoleNames.QuoteAdministrator))
        {
            throw new InvalidOperationException("Quote Administrator not found.");
        }

        assessor.QuoteAdministratorId = quoteAdministratorId;
        await context.SaveChangesAsync();
        return await UserQuery().SingleAsync(x => x.Id == assessorId);
    }

    private IQueryable<UserDto> UserQuery()
    {
        return context.Users.AsNoTracking().Select(x => new UserDto
        {
            Id = x.Id,
            Name = x.Name,
            Email = x.Email,
            Role = x.Role,
            QuoteAdministratorId = x.QuoteAdministratorId,
            QuoteAdministratorName = x.QuoteAdministrator != null ? x.QuoteAdministrator.Name : null,
            CreatedAt = x.CreatedAt
        });
    }
}
