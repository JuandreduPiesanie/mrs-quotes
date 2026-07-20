using MrsQuotes.Models.Appointments;

namespace MrsQuotes.Api.Providers.Appointments;

public interface IAppointmentProvider
{
    Task<List<AppointmentDto>> GetCalendarAsync(int userId, string role, int? assessorId);
    Task<AppointmentDto> CreateAsync(CreateAppointmentRequest request);
    Task<AppointmentDto?> UpdateAsync(int appointmentId, CreateAppointmentRequest request);
    Task<bool> CancelAsync(int appointmentId);
}
