using FluentValidation;
using MrsQuotes.Models.Appointments;

namespace MrsQuotes.Api.Validations;

public sealed class CreateAppointmentRequestValidator : AbstractValidator<CreateAppointmentRequest>
{
    public CreateAppointmentRequestValidator()
    {
        RuleFor(x => x.AssessorId).GreaterThan(0);
        RuleFor(x => x.ClientId).GreaterThan(0);
        RuleFor(x => x.SiteAddress).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.RequestDetails).NotEmpty().MaximumLength(4000);
        RuleFor(x => x.AppointmentStart).NotEmpty();
        RuleFor(x => x.AppointmentEnd)
            .GreaterThan(x => x.AppointmentStart)
            .When(x => x.AppointmentEnd.HasValue);
    }
}
