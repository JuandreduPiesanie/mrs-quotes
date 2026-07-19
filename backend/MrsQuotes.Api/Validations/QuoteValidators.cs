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
    }
}
