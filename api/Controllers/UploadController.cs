using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KazakhstanStrategyApi.Services;
using System.Security.Claims;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly IS3UploadService? _s3UploadService;
    private readonly ILogger<UploadController> _logger;
    private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public UploadController(IS3UploadService? s3UploadService, ILogger<UploadController> logger)
    {
        _s3UploadService = s3UploadService;
        _logger = logger;
    }

    [HttpPost("image")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<object>> UploadImage(IFormFile file)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        _logger.LogInformation("Image upload attempt. UserId: {UserId}, FileName: {FileName}, Size: {Size} bytes",
            userId, file?.FileName, file?.Length);

        if (_s3UploadService == null)
        {
            _logger.LogError("S3 upload service is not configured");
            return BadRequest(new { error = "S3 upload service is not configured. Please set AWS credentials in .env file." });
        }

        if (file == null || file.Length == 0)
        {
            _logger.LogWarning("Upload failed - No file provided. UserId: {UserId}", userId);
            return BadRequest(new { error = "No file uploaded" });
        }

        // Validate file size
        if (file.Length > MaxFileSize)
        {
            _logger.LogWarning("Upload failed - File too large. UserId: {UserId}, FileName: {FileName}, Size: {Size} bytes, MaxSize: {MaxSize} bytes",
                userId, file.FileName, file.Length, MaxFileSize);
            return BadRequest(new { error = $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)}MB" });
        }

        // Validate file extension
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            _logger.LogWarning("Upload failed - Invalid extension. UserId: {UserId}, FileName: {FileName}, Extension: {Extension}",
                userId, file.FileName, extension);
            return BadRequest(new { error = "Invalid file type. Only image files are allowed." });
        }

        // Validate content type
        if (!file.ContentType.StartsWith("image/"))
        {
            _logger.LogWarning("Upload failed - Invalid content type. UserId: {UserId}, FileName: {FileName}, ContentType: {ContentType}",
                userId, file.FileName, file.ContentType);
            return BadRequest(new { error = "Invalid content type. Only image files are allowed." });
        }

        try
        {
            _logger.LogInformation("Starting S3 upload. UserId: {UserId}, FileName: {FileName}, ContentType: {ContentType}",
                userId, file.FileName, file.ContentType);

            using var stream = file.OpenReadStream();
            var url = await _s3UploadService.UploadFileAsync(stream, file.FileName, file.ContentType);

            _logger.LogInformation("Upload successful. UserId: {UserId}, FileName: {FileName}, URL: {Url}",
                userId, file.FileName, url);

            return Ok(new { url });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Upload failed. UserId: {UserId}, FileName: {FileName}",
                userId, file.FileName);
            return StatusCode(500, new { error = $"Upload failed: {ex.Message}" });
        }
    }
}
