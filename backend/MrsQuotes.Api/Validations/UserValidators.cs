using FluentValidation;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Users;

namespace MrsQuotes.Api.Validations;

public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.Role).Must(RoleNames.All.Contains).WithMessage("Select a valid user role.");
    }
}
