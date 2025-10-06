using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Services;
using System.Text;
using System.Xml;

namespace KazakhstanStrategyApi.Controllers;

[ApiController]
public class SitemapController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICacheService _cache;
    private readonly IConfiguration _configuration;

    public SitemapController(AppDbContext context, ICacheService cache, IConfiguration configuration)
    {
        _context = context;
        _cache = cache;
        _configuration = configuration;
    }

    [HttpGet("/sitemap.xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> GetSitemap([FromQuery] bool nocache = false)
    {
        const string cacheKey = "sitemap:xml";

        // Check cache first (unless nocache is specified)
        if (!nocache)
        {
            var cachedSitemap = _cache.Get<string>(cacheKey);
            if (cachedSitemap != null)
            {
                return Content(cachedSitemap, "application/xml");
            }
        }

        // Get base URL from environment variable or configuration or request
        var baseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _configuration["App:BaseUrl"]
            ?? $"{Request.Scheme}://{Request.Host}";

        // Get all published chapters with their published pages
        var chapters = await _context.Chapters
            .Include(c => c.Pages)
            .Where(c => !c.IsDraft)
            .OrderBy(c => c.OrderIndex)
            .ToListAsync();

        // Get supported languages
        var languages = new[] { "en", "ru", "kk" };

        var sitemap = GenerateSitemap(baseUrl, chapters, languages);

        // Cache for 24 hours
        _cache.Set(cacheKey, sitemap, TimeSpan.FromHours(24));

        return Content(sitemap, "application/xml");
    }

    private string GenerateSitemap(string baseUrl, List<Models.Chapter> chapters, string[] languages)
    {
        using var memoryStream = new MemoryStream();
        var settings = new XmlWriterSettings
        {
            Indent = true,
            Encoding = new UTF8Encoding(false), // UTF-8 without BOM
            OmitXmlDeclaration = false
        };

        using (var writer = XmlWriter.Create(memoryStream, settings))
        {
            writer.WriteStartDocument();
            writer.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");
            writer.WriteAttributeString("xmlns", "xhtml", null, "http://www.w3.org/1999/xhtml");

            // Add homepage for each language
            foreach (var lang in languages)
            {
                WriteUrl(writer, $"{baseUrl}/{lang}", "1.0", "daily", DateTime.UtcNow, baseUrl, lang, languages);
            }

            // Add pages for each chapter
            foreach (var chapter in chapters)
            {
                var publishedPages = chapter.Pages
                    .Where(p => !p.IsDraft)
                    .OrderBy(p => p.OrderIndex)
                    .ToList();

                foreach (var page in publishedPages)
                {
                    foreach (var lang in languages)
                    {
                        var url = $"{baseUrl}/{lang}/{chapter.Slug}/{page.Slug}";
                        var lastMod = page.UpdatedAt ?? page.CreatedAt;
                        WriteUrl(writer, url, "0.8", "weekly", lastMod, baseUrl, lang, languages);
                    }
                }
            }

            writer.WriteEndElement(); // urlset
            writer.WriteEndDocument();
        }

        memoryStream.Position = 0;
        using var reader = new StreamReader(memoryStream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    private void WriteUrl(XmlWriter writer, string loc, string priority, string changefreq, DateTime lastmod, string baseUrl, string currentLang, string[] allLanguages)
    {
        writer.WriteStartElement("url");

        writer.WriteElementString("loc", loc);
        writer.WriteElementString("lastmod", lastmod.ToString("yyyy-MM-dd"));
        writer.WriteElementString("changefreq", changefreq);
        writer.WriteElementString("priority", priority);

        // Add alternate language links (hreflang)
        foreach (var lang in allLanguages)
        {
            writer.WriteStartElement("link", "http://www.w3.org/1999/xhtml");
            writer.WriteAttributeString("rel", "alternate");
            writer.WriteAttributeString("hreflang", lang);

            // Replace current language in URL with alternate language
            var alternateLoc = loc.Replace($"/{currentLang}/", $"/{lang}/");
            if (loc.EndsWith($"/{currentLang}"))
            {
                alternateLoc = loc.Substring(0, loc.Length - currentLang.Length) + lang;
            }

            writer.WriteAttributeString("href", alternateLoc);
            writer.WriteEndElement(); // link
        }

        writer.WriteEndElement(); // url
    }
}
