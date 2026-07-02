using System.Text;
using System.IO.Compression;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Middleware;
using KazakhstanStrategyApi.Services;
using DotNetEnv;
using Amazon.S3;
using Amazon.Runtime;
using Serilog;

// Load environment variables from .env file
Env.Load();

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", Serilog.Events.LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/app-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss} {Level:u3}] {SourceContext} - {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Add Serilog to the logging pipeline
builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddMemoryCache();
builder.Services.AddHealthChecks();

// Response compression (Brotli + Gzip), including for HTTPS
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "image/svg+xml",
        "application/manifest+json",
        "application/xml"
    });
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = CompressionLevel.Fastest);

// Database - Use environment variables if available, otherwise fallback to appsettings.json
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
if (string.IsNullOrEmpty(connectionString))
{
    var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
    var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
    var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "kazakhstan_strategy";
    var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
    var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "";

    connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Services
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<SettingsService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<SuggestionService>();
builder.Services.AddScoped<SeoMetaService>();
builder.Services.AddSingleton<ICacheService, CacheService>();

// SEO cache warmup (one instance used as both the hosted service and ISeoWarmupService)
builder.Services.AddSingleton<SeoWarmupService>();
builder.Services.AddSingleton<ISeoWarmupService>(sp => sp.GetRequiredService<SeoWarmupService>());

// Background Services
builder.Services.AddHostedService<EmailNotificationBackgroundService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SeoWarmupService>());

// Yandex Object Storage Configuration (S3-compatible)
var awsAccessKey = Environment.GetEnvironmentVariable("AWS_ACCESS_KEY_ID");
var awsSecretKey = Environment.GetEnvironmentVariable("AWS_SECRET_ACCESS_KEY");
var awsRegion = Environment.GetEnvironmentVariable("AWS_REGION") ?? "ru-central1";
var awsServiceUrl = Environment.GetEnvironmentVariable("AWS_S3_SERVICE_URL");
var awsBucketName = Environment.GetEnvironmentVariable("AWS_S3_BUCKET_NAME");

if (!string.IsNullOrEmpty(awsAccessKey) && !string.IsNullOrEmpty(awsSecretKey) && !string.IsNullOrEmpty(awsBucketName))
{
    var awsCredentials = new BasicAWSCredentials(awsAccessKey, awsSecretKey);
    var s3Config = new AmazonS3Config();

    // Configure for Yandex Object Storage or other S3-compatible storage
    if (!string.IsNullOrEmpty(awsServiceUrl))
    {
        s3Config.ServiceURL = awsServiceUrl;
        s3Config.ForcePathStyle = true; // Required for Yandex and other S3-compatible storage
    }
    else
    {
        s3Config.RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(awsRegion);
    }

    builder.Services.AddSingleton<IAmazonS3>(new AmazonS3Client(awsCredentials, s3Config));
    builder.Services.AddScoped<IS3UploadService, S3UploadService>();
    Log.Information("S3 Upload Service configured with bucket: {BucketName}", awsBucketName);
}
else
{
    Log.Warning("S3 Upload Service not configured - missing credentials or bucket name");
}

// JWT Authentication - Use environment variables if available
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY")
    ?? builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key not configured");

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? builder.Configuration["Jwt:Issuer"]
    ?? "KazakhstanStrategyApi";

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? builder.Configuration["Jwt:Audience"]
    ?? "KazakhstanStrategyClient";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("EditorPolicy", policy => policy.RequireRole("Editor", "Admin"));
    options.AddPolicy("AdminPolicy", policy => policy.RequireRole("Admin"));
    options.AddPolicy("ViewerPolicy", policy => policy.RequireRole("Viewer", "Editor", "Admin"));
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:8080")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseResponseCompression();

app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

// Serve static files from wwwroot with cache headers.
// Vite fingerprints assets under /assets, so they can be cached immutably;
// index.html must revalidate so new deploys are picked up immediately.
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var headers = ctx.Context.Response.Headers;
        if (ctx.Context.Request.Path.StartsWithSegments("/assets"))
        {
            headers.CacheControl = "public, max-age=31536000, immutable";
        }
        else if (ctx.File.Name.Equals("index.html", StringComparison.OrdinalIgnoreCase))
        {
            headers.CacheControl = "no-cache";
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

// Log every /api request input and response result (with failure reason). See LOGGING-STANDARD.md.
app.UseRequestResponseLogging();

app.MapControllers();

// Health check endpoint
app.MapHealthChecks("/health");

// SPA fallback - serve index.html for all non-API routes
// Exclude sitemap.xml and robots.txt so controllers can handle them
app.MapFallbackToFile("index.html").Add(endpointBuilder =>
{
    var originalRequestDelegate = endpointBuilder.RequestDelegate!;
    endpointBuilder.RequestDelegate = async context =>
    {
        var path = context.Request.Path.Value?.ToLower();
        if (path == "/sitemap.xml" || path == "/robots.txt")
        {
            context.Response.StatusCode = 404;
            return;
        }

        // Inject per-URL SEO metadata into index.html for content routes so
        // crawlers/social scrapers see real tags instead of the generic shell.
        if (HttpMethods.IsGet(context.Request.Method))
        {
            try
            {
                var seo = context.RequestServices.GetRequiredService<SeoMetaService>();
                var html = await seo.RenderAsync(
                    context.Request.Path.Value ?? "/",
                    context.Request.Scheme,
                    context.Request.Host.Value ?? string.Empty);

                if (html != null)
                {
                    context.Response.ContentType = "text/html; charset=utf-8";
                    context.Response.Headers.CacheControl = "no-cache";
                    await context.Response.WriteAsync(html);
                    return;
                }
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "SEO meta injection failed for {Path}; serving default index.html", path);
            }
        }

        await originalRequestDelegate(context);
    };
});

try
{
    Log.Information("Starting Kazakhstan IT Strategy API");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
