using MrsQuotes.Models.Authentication;
using MrsQuotes.Models.Users;

namespace MrsQuotes.Client;

public sealed class MrsQuotesClient : MrsQuotesClientBase
{
    public MrsQuotesClient(HttpClient httpClient, string? authorizationToken = null)
        : base(httpClient, authorizationToken) { }

    public Task<(AuthResult? Content, ClientProblemDetails? Error)> Login(LoginRequest request) =>
        PostAsync<LoginRequest, AuthResult>("/api/auth/login", request);

    public Task<(AuthResult? Content, ClientProblemDetails? Error)> SetupFirstAdmin(FirstAdminRequest request) =>
        PostAsync<FirstAdminRequest, AuthResult>("/api/auth/setup", request);

    public Task<(List<UserDto>? Content, ClientProblemDetails? Error)> GetUsers() =>
        GetAsync<List<UserDto>>("/api/users");
}
