using MrsQuotes.Models.Users;

namespace MrsQuotes.Api.Providers.Users;

public interface IUserProvider
{
    Task<List<UserDto>> GetUsersAsync();
    Task<UserDto> CreateUserAsync(CreateUserRequest request);
    Task<List<UserDto>> GetAssessorsAsync(int requestingUserId, string requestingRole);
    Task<List<UserDto>> GetQuoteAdministratorsAsync();
    Task<UserDto?> AssignQuoteAdministratorAsync(int assessorId, int? quoteAdministratorId);
}
