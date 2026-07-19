using System.Security.Claims;
using System.Text.Json;
using FluentValidation;
using MrsQuotes.Api.Providers.Quotes;
using MrsQuotes.Api.Providers.Storage;
using MrsQuotes.Api.Security;
using MrsQuotes.Models.Quotes;

namespace MrsQuotes.Api.EndpointHandlers.Quotes;

public sealed class QuoteHandler(IQuoteProvider provider, IValidator<QuotePayload> payloadValidator)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<IResult> GetQuotes(int? assessorId, ClaimsPrincipal principal)
    {
        return Results.Ok(await provider.GetQuotesAsync(principal.UserId(), principal.UserRole(), assessorId));
    }

    public async Task<IResult> GetQuote(int id, ClaimsPrincipal principal)
    {
        var quote = await provider.GetQuoteAsync(id, principal.UserId(), principal.UserRole());
        return quote is null ? Results.NotFound(new { error = "Quote not found." }) : Results.Ok(quote);
    }

    public async Task<IResult> Create(HttpRequest request, ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        var parsed = await ReadPayloadAsync(request, cancellationToken);
        if (parsed.Error is not null) return parsed.Error;
        var result = await provider.CreateAsync(
            principal.UserId(),
            parsed.Payload!,
            parsed.Photos,
            cancellationToken);
        return Results.Created($"/api/quotes/{result.Id}", result);
    }

    public async Task<IResult> Update(
        int id,
        HttpRequest request,
        ClaimsPrincipal principal,
        CancellationToken cancellationToken)
    {
        var parsed = await ReadPayloadAsync(request, cancellationToken);
        if (parsed.Error is not null) return parsed.Error;
        var updated = await provider.UpdateAsync(
            id,
            principal.UserId(),
            principal.UserRole(),
            parsed.Payload!,
            parsed.Photos,
            cancellationToken);
        return updated
            ? Results.Ok(new { id, message = "Quote updated." })
            : Results.NotFound(new { error = "Quote not found." });
    }

    public async Task<IResult> Complete(
        int id,
        CompleteQuoteRequest request,
        ClaimsPrincipal principal)
    {
        var completed = await provider.CompleteAsync(
            id,
            principal.UserId(),
            principal.UserRole(),
            request.ErpQuoteNumber);
        return completed
            ? Results.Ok(new { id, message = "Quote marked as complete." })
            : Results.NotFound(new { error = "Quote not found." });
    }

    public async Task<IResult> DownloadPhotos(
        int id,
        ClaimsPrincipal principal,
        CancellationToken cancellationToken)
    {
        var archive = await provider.GetPhotoArchiveAsync(
            id,
            principal.UserId(),
            principal.UserRole(),
            cancellationToken);
        return archive is null
            ? Results.NotFound(new { error = "Quote not found." })
            : Results.File(archive.Content, "application/zip", archive.FileName);
    }

    private async Task<(QuotePayload? Payload, IReadOnlyList<PhotoUpload> Photos, IResult? Error)> ReadPayloadAsync(
        HttpRequest request,
        CancellationToken cancellationToken)
    {
        if (!request.HasFormContentType)
        {
            return (null, [], Results.BadRequest(new { error = "Multipart form data is required." }));
        }
        var form = await request.ReadFormAsync(cancellationToken);
        QuotePayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<QuotePayload>(form["payload"].FirstOrDefault() ?? "{}", JsonOptions);
        }
        catch (JsonException)
        {
            return (null, [], Results.BadRequest(new { error = "The quote payload is invalid." }));
        }

        if (payload is null)
        {
            return (null, [], Results.BadRequest(new { error = "The quote payload is required." }));
        }
        var validation = await payloadValidator.ValidateAsync(payload, cancellationToken);
        if (!validation.IsValid)
        {
            var errors = validation.Errors.GroupBy(x => x.PropertyName)
                .ToDictionary(x => x.Key, x => x.Select(error => error.ErrorMessage).ToArray());
            return (null, [], Results.ValidationProblem(errors));
        }
        if (form.Files.Count > 50)
        {
            return (null, [], Results.BadRequest(new { error = "You can upload a maximum of 50 photos per quote." }));
        }

        var photos = form.Files.Select(file => new PhotoUpload(
            file.FileName,
            file.ContentType,
            file.Length,
            file.OpenReadStream)).ToList();
        return (payload, photos, null);
    }
}
