using FluentValidation;

namespace MrsQuotes.Api.Startup.Validations;

public static class ValidationEndpointExtensions
{
    public static RouteHandlerBuilder WithValidation<TRequest>(this RouteHandlerBuilder builder)
        where TRequest : class
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var validator = context.HttpContext.RequestServices.GetService<IValidator<TRequest>>();
            if (validator is null) return await next(context);

            var request = context.Arguments.OfType<TRequest>().FirstOrDefault();
            if (request is null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["request"] = ["Request body is required."]
                });
            }

            var result = await validator.ValidateAsync(request, context.HttpContext.RequestAborted);
            if (result.IsValid) return await next(context);
            return Results.ValidationProblem(result.Errors
                .GroupBy(x => x.PropertyName)
                .ToDictionary(x => x.Key, x => x.Select(error => error.ErrorMessage).ToArray()));
        });
    }
}
