using System.Security.Claims;
using MrsQuotes.Api.Providers.Appointments;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Appointments;

namespace MrsQuotes.Api.EndpointHandlers.Appointments;

public sealed class AppointmentHandler(IAppointmentProvider provider)
{
    public async Task<IResult> GetCalendar(int? assessorId, ClaimsPrincipal principal)
    {
        return Results.Ok(await provider.GetCalendarAsync(
            principal.UserId(),
            principal.UserRole(),
            assessorId));
    }

    public async Task<IResult> Create(CreateAppointmentRequest request)
    {
        return Results.Created("/api/appointments", await provider.CreateAsync(request));
    }
}
