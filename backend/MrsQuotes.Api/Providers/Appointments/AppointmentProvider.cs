using Microsoft.EntityFrameworkCore;
using MrsQuotes.Api.Database;
using MrsQuotes.Api.Database.Models;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Appointments;

namespace MrsQuotes.Api.Providers.Appointments;

public sealed class AppointmentProvider(MrsQuotesDbContext context) : IAppointmentProvider
{
    public async Task<List<AppointmentDto>> GetCalendarAsync(int userId, string role, int? assessorId)
    {
        if (role is RoleNames.Admin or RoleNames.Management or RoleNames.QuoteAdministrator)
        {
            var quoteQuery = context.Quotes.AsNoTracking()
                .Where(x => x.Status == "submitted");
            if (role == RoleNames.QuoteAdministrator)
            {
                quoteQuery = quoteQuery.Where(x => x.Assessor.QuoteAdministratorId == userId);
            }
            if (assessorId.HasValue)
            {
                quoteQuery = quoteQuery.Where(x => x.AssessorId == assessorId);
            }

            return await quoteQuery.OrderBy(x => x.CreatedAt).Select(x => new AppointmentDto
            {
                QuoteId = x.Id,
                QuoteNumber = x.QuoteNumber,
                CustomerName = x.CustomerName,
                ClientName = x.Client != null ? x.Client.Name : null,
                SiteAddress = x.SiteAddress,
                RequestDetails = x.RequestDetails,
                AppointmentStart = x.CreatedAt,
                AppointmentEnd = x.CreatedAt,
                Status = x.Status,
                Subtotal = x.Subtotal,
                AssessorId = x.AssessorId,
                AssessorName = x.Assessor.Name,
                QuoteAdministratorId = x.Assessor.QuoteAdministratorId,
                QuoteAdministratorName = x.Assessor.QuoteAdministrator != null
                    ? x.Assessor.QuoteAdministrator.Name
                    : null,
                CalendarType = "quote_task"
            }).ToListAsync();
        }

        var query = context.Appointments.AsNoTracking().Where(x => x.Status == "scheduled");
        if (role == RoleNames.Assessor)
        {
            query = query.Where(x => x.AssessorId == userId);
        }
        else if (assessorId.HasValue)
        {
            query = query.Where(x => x.AssessorId == assessorId);
        }

        return await query.OrderBy(x => x.AppointmentStart).Select(x => new AppointmentDto
        {
            Id = x.Id,
            QuoteId = x.Quote != null ? x.Quote.Id : null,
            QuoteNumber = x.Quote != null ? x.Quote.QuoteNumber : null,
            AssessorId = x.AssessorId,
            AssessorName = x.Assessor.Name,
            ClientId = x.ClientId,
            ClientName = x.Client.Name,
            CustomerName = x.CustomerName,
            SiteAddress = x.SiteAddress,
            RequestDetails = x.RequestDetails,
            AppointmentStart = x.AppointmentStart,
            AppointmentEnd = x.AppointmentEnd,
            Status = x.Status,
            CalendarType = "appointment"
        }).ToListAsync();
    }

    public async Task<AppointmentDto> CreateAsync(CreateAppointmentRequest request)
    {
        var assessor = await context.Users.FirstOrDefaultAsync(x =>
            x.Id == request.AssessorId && x.Role == RoleNames.Assessor);
        var client = await context.Clients.FirstOrDefaultAsync(x =>
            x.Id == request.ClientId && x.Active);
        if (assessor is null || client is null)
        {
            throw new InvalidOperationException("A valid assessor and active client are required.");
        }

        var appointment = new Appointment
        {
            AssessorId = assessor.Id,
            ClientId = client.Id,
            CustomerName = client.Name,
            SiteAddress = request.SiteAddress.Trim(),
            RequestDetails = request.RequestDetails.Trim(),
            AppointmentStart = request.AppointmentStart,
            AppointmentEnd = request.AppointmentEnd
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        return new AppointmentDto
        {
            Id = appointment.Id,
            AssessorId = assessor.Id,
            AssessorName = assessor.Name,
            ClientId = client.Id,
            ClientName = client.Name,
            CustomerName = client.Name,
            SiteAddress = appointment.SiteAddress,
            RequestDetails = appointment.RequestDetails,
            AppointmentStart = appointment.AppointmentStart,
            AppointmentEnd = appointment.AppointmentEnd,
            Status = appointment.Status,
            CalendarType = "appointment"
        };
    }
}
