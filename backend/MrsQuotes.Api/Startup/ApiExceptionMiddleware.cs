using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MrsQuotes.Api.Startup;

public sealed class ApiExceptionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InvalidOperationException ex)
        {
            await WriteProblem(context, StatusCodes.Status400BadRequest, "Bad request", ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            await WriteProblem(context, StatusCodes.Status403Forbidden, "Forbidden", ex.Message);
        }
        catch (DbUpdateException)
        {
            await WriteProblem(context, StatusCodes.Status409Conflict, "Database update failed", "The requested change could not be saved.");
        }
        catch (Exception)
        {
            await WriteProblem(context, StatusCodes.Status500InternalServerError, "Server error", "Something went wrong while processing the request.");
        }
    }

    private static async Task WriteProblem(HttpContext context, int status, string title, string detail)
    {
        if (context.Response.HasStarted) return;
        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path,
            Extensions = { ["traceId"] = context.TraceIdentifier }
        });
    }
}
