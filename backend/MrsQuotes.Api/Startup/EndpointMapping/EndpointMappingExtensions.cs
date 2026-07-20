using System.Security.Claims;
using MrsQuotes.Api.EndpointHandlers.Appointments;
using MrsQuotes.Api.EndpointHandlers.Authentication;
using MrsQuotes.Api.EndpointHandlers.Clients;
using MrsQuotes.Api.EndpointHandlers.Pricing;
using MrsQuotes.Api.EndpointHandlers.Quotes;
using MrsQuotes.Api.EndpointHandlers.Users;
using MrsQuotes.Api.Security;
using MrsQuotes.Api.Startup.Validations;
using MrsQuotes.Models.Appointments;
using MrsQuotes.Models.Authentication;
using MrsQuotes.Models.Quotes;
using MrsQuotes.Models.Users;

namespace MrsQuotes.Api.Startup.EndpointMapping;

public static class EndpointMappingExtensions
{
    public static WebApplication MapEndpoints(this WebApplication app)
    {
        app.MapGet("/", () => Results.Ok(new { service = "MRS Quotes API", status = "ok" })).AllowAnonymous();
        app.MapGet("/api/health", () => Results.Ok(new { ok = true })).AllowAnonymous();

        app.MapPost("/api/auth/login", (AuthenticationHandler handler, LoginRequest request) => handler.Login(request))
            .AllowAnonymous().WithValidation<LoginRequest>();
        app.MapPost("/api/auth/setup", (AuthenticationHandler handler, FirstAdminRequest request) => handler.SetupFirstAdmin(request))
            .AllowAnonymous().WithValidation<FirstAdminRequest>();
        app.MapGet("/api/me", (ClaimsPrincipal principal) => Results.Ok(new
        {
            user = new
            {
                id = principal.UserId(),
                name = principal.Identity?.Name,
                email = principal.FindFirst(ClaimTypes.Email)?.Value,
                role = principal.UserRole()
            }
        }));

        app.MapGet("/api/users", (UserHandler handler) => handler.GetUsers())
            .RequireAuthorization(PolicyNames.AdminOnly);
        app.MapPost("/api/users", (UserHandler handler, CreateUserRequest request) => handler.CreateUser(request))
            .RequireAuthorization(PolicyNames.AdminOnly).WithValidation<CreateUserRequest>();
        app.MapGet("/api/users/assessors", (UserHandler handler, ClaimsPrincipal principal) => handler.GetAssessors(principal))
            .RequireAuthorization(PolicyNames.AssessorDirectory);
        app.MapGet("/api/users/quote-administrators", (UserHandler handler) => handler.GetQuoteAdministrators())
            .RequireAuthorization(PolicyNames.ClientDirectory);
        app.MapPatch("/api/users/assessors/{assessorId:int}/quote-administrator",
                (UserHandler handler, int assessorId, AssignQuoteAdministratorRequest request) =>
                    handler.AssignQuoteAdministrator(assessorId, request))
            .RequireAuthorization(PolicyNames.Management);

        app.MapGet("/api/clients", (ClientHandler handler, string? search) => handler.Search(search))
            .RequireAuthorization(PolicyNames.ClientDirectory);
        app.MapGet("/api/price-items", (PricingHandler handler, string? group, ClaimsPrincipal principal) =>
            handler.GetItems(group, principal));
        app.MapGet("/api/price-sections", (PricingHandler handler) => handler.GetSections());

        app.MapGet("/api/appointments", (AppointmentHandler handler, int? assessorId, ClaimsPrincipal principal) =>
            handler.GetCalendar(assessorId, principal));
        app.MapPost("/api/appointments", (AppointmentHandler handler, CreateAppointmentRequest request) =>
                handler.Create(request))
            .RequireAuthorization(PolicyNames.Schedule)
            .WithValidation<CreateAppointmentRequest>();

        app.MapGet("/api/quotes", (QuoteHandler handler, int? assessorId, string? status, ClaimsPrincipal principal) =>
                handler.GetQuotes(assessorId, status, principal))
            .RequireAuthorization(PolicyNames.QuoteDirectory);
        app.MapGet("/api/quotes/{id:int}", (QuoteHandler handler, int id, ClaimsPrincipal principal) =>
                handler.GetQuote(id, principal))
            .RequireAuthorization(PolicyNames.QuoteDirectory);
        app.MapGet("/api/quotes/{id:int}/photos/{photoId:int}",
                (QuoteHandler handler, int id, int photoId, bool? thumbnail, ClaimsPrincipal principal, CancellationToken cancellationToken) =>
                    handler.GetPhoto(id, photoId, thumbnail ?? false, principal, cancellationToken))
            .RequireAuthorization(PolicyNames.QuoteDirectory);
        app.MapPost("/api/quotes/{id:int}/photos-download",
                (QuoteHandler handler, int id, ClaimsPrincipal principal, CancellationToken cancellationToken) =>
                    handler.CreatePhotoDownloadTicket(id, principal, cancellationToken))
            .RequireAuthorization(PolicyNames.QuoteAdministrator);
        app.MapGet("/api/quotes/{id:int}/photos.zip",
                (QuoteHandler handler, int id, string? ticket, CancellationToken cancellationToken) =>
                    handler.DownloadPhotos(id, ticket, cancellationToken))
            .AllowAnonymous();
        app.MapPatch("/api/quotes/{id:int}/complete",
                (QuoteHandler handler, int id, CompleteQuoteRequest request, ClaimsPrincipal principal) =>
                    handler.Complete(id, request, principal))
            .RequireAuthorization(PolicyNames.QuoteAdministrator)
            .WithValidation<CompleteQuoteRequest>();
        app.MapPost("/api/quotes",
                (QuoteHandler handler, HttpRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken) =>
                    handler.Create(request, principal, cancellationToken))
            .RequireAuthorization(PolicyNames.Assessor)
            .DisableAntiforgery();
        app.MapPut("/api/quotes/{id:int}",
                (QuoteHandler handler, int id, HttpRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken) =>
                    handler.Update(id, request, principal, cancellationToken))
            .RequireAuthorization(PolicyNames.Assessor)
            .DisableAntiforgery();

        return app;
    }
}
