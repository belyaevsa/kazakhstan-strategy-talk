using Microsoft.AspNetCore.Mvc;

namespace KazakhstanStrategyApi.Controllers;

/// <summary>
/// Base controller that standardizes non-2xx responses so the request/response
/// logging middleware can record a machine-readable failure reason for every
/// non-success result. See LOGGING-STANDARD.md.
///
/// Each helper both:
///  (a) returns a response body of the shape { message, reason }, and
///  (b) stashes the reason in HttpContext.Items["FailureReason"] so the
///      middleware logs "reason=..." on the response line.
/// </summary>
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Key under which the failure reason is stashed for the logging middleware.</summary>
    public const string FailureReasonKey = "FailureReason";

    /// <summary>
    /// Return a non-2xx result carrying a stable, snake_case reason code.
    /// </summary>
    /// <param name="statusCode">HTTP status code (>= 400).</param>
    /// <param name="reason">Machine-readable, snake_case reason (e.g. "email_not_found").</param>
    /// <param name="message">Optional user-facing message; defaults to the reason.</param>
    protected ObjectResult Fail(int statusCode, string reason, string? message = null)
    {
        HttpContext.Items[FailureReasonKey] = reason;
        return StatusCode(statusCode, new { message = message ?? reason, reason });
    }

    protected ObjectResult BadRequestReason(string reason, string? message = null)
        => Fail(StatusCodes.Status400BadRequest, reason, message);

    protected ObjectResult UnauthorizedReason(string reason, string? message = null)
        => Fail(StatusCodes.Status401Unauthorized, reason, message);

    protected ObjectResult ForbiddenReason(string reason, string? message = null)
        => Fail(StatusCodes.Status403Forbidden, reason, message);

    protected ObjectResult NotFoundReason(string reason, string? message = null)
        => Fail(StatusCodes.Status404NotFound, reason, message);

    protected ObjectResult ConflictReason(string reason, string? message = null)
        => Fail(StatusCodes.Status409Conflict, reason, message);

    protected ObjectResult RateLimitedReason(string reason, string? message = null)
        => Fail(StatusCodes.Status429TooManyRequests, reason, message);
}
