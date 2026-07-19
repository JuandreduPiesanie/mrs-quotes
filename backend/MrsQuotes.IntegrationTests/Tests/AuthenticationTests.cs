using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MrsQuotes.IntegrationTests.Common;
using MrsQuotes.Models.Authentication;
using MrsQuotes.Models.Users;

namespace MrsQuotes.IntegrationTests.Tests;

[TestFixture]
public sealed class AuthenticationTests
{
    private ApiWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    [SetUp]
    public async Task SetUp()
    {
        _factory = new ApiWebApplicationFactory();
        _client = _factory.CreateClient();
        await _factory.InitializeDatabaseAsync();
    }

    [TearDown]
    public void TearDown()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Test]
    public async Task SetupAndUserRegistration_EnforcesAdminOnlyAccess()
    {
        var admin = await SetupAdminAsync();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", admin.Token);

        var createManagement = await _client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "Manager",
            Email = "manager@example.test",
            Password = "password123",
            Role = "management"
        });
        Assert.That(createManagement.StatusCode, Is.EqualTo(HttpStatusCode.Created));

        var users = await _client.GetFromJsonAsync<List<UserDto>>("/api/users");
        Assert.That(users, Has.Count.EqualTo(2));

        _client.DefaultRequestHeaders.Authorization = null;
        var managementLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = "manager@example.test",
            Password = "password123"
        });
        var managementAuth = await managementLogin.Content.ReadFromJsonAsync<AuthResult>();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", managementAuth!.Token);

        var forbidden = await _client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = "Blocked",
            Email = "blocked@example.test",
            Password = "password123",
            Role = "assessor"
        });
        Assert.That(forbidden.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));

        _client.DefaultRequestHeaders.Authorization = null;
        var secondSetup = await _client.PostAsJsonAsync("/api/auth/setup", new FirstAdminRequest
        {
            Name = "Second Admin",
            Email = "second@example.test",
            Password = "password123"
        });
        Assert.That(secondSetup.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    private async Task<AuthResult> SetupAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/setup", new FirstAdminRequest
        {
            Name = "System Admin",
            Email = "admin@example.test",
            Password = "password123"
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResult>())!;
    }
}
