using Microsoft.AspNetCore.Mvc;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
public class RobotsController : ApiControllerBase
{
    private readonly IConfiguration _configuration;

    public RobotsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [HttpGet("/robots.txt")]
    [Produces("text/plain")]
    public IActionResult GetRobots()
    {
        var baseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _configuration["App:BaseUrl"]
            ?? $"{Request.Scheme}://{Request.Host}";

        var robotsTxt = @$"User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /profile/
Disallow: /notifications
Disallow: /verify-email
Disallow: /api/

Sitemap: {baseUrl}/sitemap.xml";

        return Content(robotsTxt, "text/plain");
    }
}
