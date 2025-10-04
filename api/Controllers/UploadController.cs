using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KazakhstanStrategyApi.Services;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly IS3UploadService? _s3UploadService;
    private static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
    private const long MaxFileSize = 10 * 1024 * 1024; // 10MB

    public UploadController(IS3UploadService? s3UploadService)
    {
        _s3UploadService = s3UploadService;
    }

    [HttpPost("image")]
    [Authorize(Policy = "EditorPolicy")]
    public async Task<ActionResult<object>> UploadImage(IFormFile file)
    {
        if (_s3UploadService == null)
        {
            return BadRequest(new { error = "S3 upload service is not configured. Please set AWS credentials in .env file." });
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded" });
        }

        // Validate file size
        if (file.Length > MaxFileSize)
        {
            return BadRequest(new { error = $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)}MB" });
        }

        // Validate file extension
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(extension))
        {
            return BadRequest(new { error = "Invalid file type. Only image files are allowed." });
        }

        // Validate content type
        if (!file.ContentType.StartsWith("image/"))
        {
            return BadRequest(new { error = "Invalid content type. Only image files are allowed." });
        }

        try
        {
            using var stream = file.OpenReadStream();
            var url = await _s3UploadService.UploadFileAsync(stream, file.FileName, file.ContentType);

            return Ok(new { url });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = $"Upload failed: {ex.Message}" });
        }
    }
}
