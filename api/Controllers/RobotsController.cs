using Microsoft.AspNetCore.Mvc;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
public class RobotsController : ControllerBase
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

        var robotsTxt = @$"User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: {baseUrl}/sitemap.xml";

        return Content(robotsTxt, "text/plain");
    }
}
