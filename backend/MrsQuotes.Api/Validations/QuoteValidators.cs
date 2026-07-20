using FluentValidation;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.Validations;

public sealed class QuotePayloadValidator : AbstractValidator<QuotePayload>
{
    public QuotePayloadValidator()
    {
        RuleFor(x => x.AppointmentId).GreaterThan(0);
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.PriceItemId).GreaterThan(0);
            item.RuleFor(x => x.Quantity).GreaterThan(0);
        });
    }
}

public sealed class CompleteQuoteRequestValidator : AbstractValidator<CompleteQuoteRequest>
{
    public CompleteQuoteRequestValidator()
    {
        RuleFor(x => x.ErpQuoteNumber).NotEmpty().MaximumLength(150);
        RuleFor(x => x.PhotoArchiveUrl)
            .NotEmpty()
            .MaximumLength(2048)
            .Must(BeSupportedArchiveUrl)
            .WithMessage("Enter a valid HTTPS OneDrive or SharePoint folder URL.");
        RuleFor(x => x.ArchiveVerified)
            .Equal(true)
            .WithMessage("Confirm that every quote photo has been verified in the archive folder.");
    }

    private static bool BeSupportedArchiveUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
        {
            return false;
        }

        var host = uri.Host.ToLowerInvariant();
        return host == "1drv.ms"
            || host == "onedrive.live.com"
            || host.EndsWith(".sharepoint.com", StringComparison.Ordinal);
    }
}
