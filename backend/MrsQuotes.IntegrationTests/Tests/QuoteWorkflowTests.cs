using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using MrsQuotes.IntegrationTests.Common;
using MrsQuotes.Models.Appointments;
using MrsQuotes.Models.Authentication;
using MrsQuotes.Models.Clients;
using MrsQuotes.Models.Quotes;
using MrsQuotes.Models.Users;

namespace MrsQuotes.IntegrationTests.Tests;

[TestFixture]
public sealed class QuoteWorkflowTests
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
    public async Task AppointmentToCompletedQuote_RoutesThroughAssignedAdministrator()
    {
        var admin = await SetupAndLoginAsync("Admin", "admin@example.test", "admin");
        Authorize(admin);
        var schedule = await CreateUserAsync("Scheduler", "schedule@example.test", "schedule_administrator");
        var quoteAdministrator = await CreateUserAsync("Quote Admin", "quoteadmin@example.test", "quote_administrator");
        var assessor = await CreateUserAsync("Assessor", "assessor@example.test", "assessor");

        var assignment = await _client.PatchAsJsonAsync(
            $"/api/users/assessors/{assessor.Id}/quote-administrator",
            new AssignQuoteAdministratorRequest { QuoteAdministratorId = quoteAdministrator.Id });
        assignment.EnsureSuccessStatusCode();

        var clients = await _client.GetFromJsonAsync<List<ClientDto>>("/api/clients");
        var appointmentResponse = await _client.PostAsJsonAsync("/api/appointments", new CreateAppointmentRequest
        {
            AssessorId = assessor.Id,
            ClientId = clients![0].Id,
            SiteAddress = "1 Test Street",
            RequestDetails = "Inspect damage",
            AppointmentStart = new DateTime(2026, 7, 20, 9, 0, 0)
        });
        appointmentResponse.EnsureSuccessStatusCode();
        var appointment = await appointmentResponse.Content.ReadFromJsonAsync<AppointmentDto>();

        var assessorAuth = await LoginAsync("assessor@example.test");
        Authorize(assessorAuth);
        var price = await _factory.GetAutomaticFeeEligibleItemAsync();
        var geyserFault = await _factory.GetGeyserFaultItemAsync();
        using var multipart = new MultipartFormDataContent();
        var payload = JsonSerializer.Serialize(new QuotePayload
        {
            AppointmentId = appointment!.Id!.Value,
            Items =
            [
                new QuoteItemInput { PriceItemId = price.Id, Quantity = 2 },
                new QuoteItemInput { PriceItemId = geyserFault.Id, Quantity = 1 }
            ]
        });
        multipart.Add(new StringContent(payload, Encoding.UTF8), "payload");
        var quoteResponse = await _client.PostAsync("/api/quotes", multipart);
        quoteResponse.EnsureSuccessStatusCode();

        var quoteAdminAuth = await LoginAsync("quoteadmin@example.test");
        Authorize(quoteAdminAuth);
        var quotes = await _client.GetFromJsonAsync<List<QuoteDto>>("/api/quotes");
        Assert.That(quotes, Has.Count.EqualTo(1));
        Assert.That(quotes![0].Subtotal, Is.EqualTo(decimal.Round(price.Rate * 2 + geyserFault.Rate + 937m, 2)));
        Assert.That(quotes[0].Items.Count(x => x.SystemGenerated), Is.EqualTo(1));
        Assert.That(quotes[0].Items.Single(x => x.SystemGenerated).Description, Does.Contain("plumbing"));

        var calendar = await _client.GetFromJsonAsync<List<AppointmentDto>>("/api/appointments");
        Assert.That(calendar, Has.Count.EqualTo(1));
        Assert.That(calendar![0].CalendarType, Is.EqualTo("quote_task"));

        var complete = await _client.PatchAsJsonAsync(
            $"/api/quotes/{quotes[0].Id}/complete",
            new CompleteQuoteRequest
            {
                ErpQuoteNumber = "ERP-1001",
                PhotoArchiveUrl = "https://mrsquotes.sharepoint.com/sites/quotes/MRS-Q-000001",
                ArchiveVerified = true
            });
        complete.EnsureSuccessStatusCode();

        var outstanding = await _client.GetFromJsonAsync<List<QuoteDto>>("/api/quotes");
        Assert.That(outstanding, Is.Empty);

        Authorize(assessorAuth);
        var assessorCalendar = await _client.GetFromJsonAsync<List<AppointmentDto>>("/api/appointments");
        Assert.That(assessorCalendar, Is.Empty);
    }

    private async Task<AuthResult> SetupAndLoginAsync(string name, string email, string role)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/setup", new FirstAdminRequest
        {
            Name = name,
            Email = email,
            Password = "password123"
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResult>())!;
    }

    private async Task<UserDto> CreateUserAsync(string name, string email, string role)
    {
        var response = await _client.PostAsJsonAsync("/api/users", new CreateUserRequest
        {
            Name = name,
            Email = email,
            Password = "password123",
            Role = role
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UserDto>())!;
    }

    private async Task<AuthResult> LoginAsync(string email)
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "password123"
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResult>())!;
    }

    private void Authorize(AuthResult auth)
    {
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
    }
}
