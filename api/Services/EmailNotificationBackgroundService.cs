using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Services;

/// <summary>
/// Background service that processes email notifications based on user preferences
/// - Immediate: Send email as soon as notification is created
/// - Hourly: Batch notifications and send digest every hour
/// - Daily: Batch notifications and send digest once per day
/// </summary>
public class EmailNotificationBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EmailNotificationBackgroundService> _logger;
    private readonly IConfiguration _configuration;
    private DateTime _lastHourlyRun = DateTime.UtcNow;
    private DateTime _lastDailyRun = DateTime.UtcNow.Date;

    public EmailNotificationBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<EmailNotificationBackgroundService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _configuration = configuration;
    }

    private string GetBaseUrl()
    {
        return Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _configuration["App:BaseUrl"]
            ?? "https://localhost:7001";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Email Notification Background Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Process immediate notifications
                await ProcessImmediateNotificationsAsync();

                // Check if we should process hourly digest
                if (DateTime.UtcNow - _lastHourlyRun >= TimeSpan.FromHours(1))
                {
                    await ProcessHourlyDigestAsync();
                    _lastHourlyRun = DateTime.UtcNow;
                }

                // Check if we should process daily digest (once per day at midnight UTC)
                if (DateTime.UtcNow.Date > _lastDailyRun)
                {
                    await ProcessDailyDigestAsync();
                    _lastDailyRun = DateTime.UtcNow.Date;
                }

                // Wait 1 minute before next check
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Email Notification Background Service");
                // Wait a bit longer on error to avoid rapid retry loops
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        _logger.LogInformation("Email Notification Background Service stopped");
    }

    /// <summary>
    /// Process notifications for users with "immediate" email preference
    /// </summary>
    private async Task ProcessImmediateNotificationsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        // Get unsent notifications for users with immediate preference
        var notifications = await context.Notifications
            .Include(n => n.User)
            .Include(n => n.Page)
                .ThenInclude(p => p!.Chapter)
            .Where(n => !n.EmailSent)
            .ToListAsync();

        if (!notifications.Any())
        {
            return;
        }

        // Get settings for these users
        var userIds = notifications.Select(n => n.UserId).Distinct().ToList();
        var settings = await context.NotificationSettings
            .Where(ns => userIds.Contains(ns.UserId) && ns.EmailFrequency == "immediate")
            .ToDictionaryAsync(ns => ns.UserId);

        var sentCount = 0;

        foreach (var notification in notifications)
        {
            // Check if user has immediate setting
            if (!settings.TryGetValue(notification.UserId, out var userSettings))
            {
                continue;
            }

            if (userSettings.EmailFrequency != "immediate")
            {
                continue;
            }

            try
            {
                // Send individual email for this notification
                await SendSingleNotificationEmailAsync(
                    emailService,
                    notification,
                    notification.User!);

                notification.EmailSent = true;
                sentCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to send immediate notification email for notification {NotificationId}",
                    notification.Id);
            }
        }

        if (sentCount > 0)
        {
            await context.SaveChangesAsync();
            _logger.LogInformation("Sent {Count} immediate notification emails", sentCount);
        }
    }

    /// <summary>
    /// Process hourly digest for users with "hourly" email preference
    /// </summary>
    private async Task ProcessHourlyDigestAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        var cutoffTime = DateTime.UtcNow.AddHours(-1);

        // Get unsent notifications from the last hour for hourly users
        var notifications = await context.Notifications
            .Include(n => n.User)
            .Include(n => n.Page)
                .ThenInclude(p => p!.Chapter)
            .Where(n => !n.EmailSent && n.CreatedAt >= cutoffTime)
            .ToListAsync();

        if (!notifications.Any())
        {
            return;
        }

        // Get users with hourly preference
        var userIds = notifications.Select(n => n.UserId).Distinct().ToList();
        var hourlyUsers = await context.NotificationSettings
            .Where(ns => userIds.Contains(ns.UserId) && ns.EmailFrequency == "hourly")
            .Include(ns => ns.User)
            .ToListAsync();

        var sentCount = 0;

        foreach (var userSettings in hourlyUsers)
        {
            var userNotifications = notifications
                .Where(n => n.UserId == userSettings.UserId)
                .ToList();

            if (!userNotifications.Any())
            {
                continue;
            }

            try
            {
                // Send digest email with all notifications for this user
                await SendDigestEmailAsync(
                    emailService,
                    userNotifications,
                    userSettings.User!,
                    "hourly");

                // Mark all as sent
                foreach (var notification in userNotifications)
                {
                    notification.EmailSent = true;
                }

                sentCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to send hourly digest email for user {UserId}",
                    userSettings.UserId);
            }
        }

        if (sentCount > 0)
        {
            await context.SaveChangesAsync();
            _logger.LogInformation("Sent {Count} hourly digest emails", sentCount);
        }
    }

    /// <summary>
    /// Process daily digest for users with "daily" email preference
    /// </summary>
    private async Task ProcessDailyDigestAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();

        var cutoffTime = DateTime.UtcNow.AddDays(-1);

        // Get unsent notifications from the last 24 hours for daily users
        var notifications = await context.Notifications
            .Include(n => n.User)
            .Include(n => n.Page)
                .ThenInclude(p => p!.Chapter)
            .Where(n => !n.EmailSent && n.CreatedAt >= cutoffTime)
            .ToListAsync();

        if (!notifications.Any())
        {
            return;
        }

        // Get users with daily preference
        var userIds = notifications.Select(n => n.UserId).Distinct().ToList();
        var dailyUsers = await context.NotificationSettings
            .Where(ns => userIds.Contains(ns.UserId) && ns.EmailFrequency == "daily")
            .Include(ns => ns.User)
            .ToListAsync();

        var sentCount = 0;

        foreach (var userSettings in dailyUsers)
        {
            var userNotifications = notifications
                .Where(n => n.UserId == userSettings.UserId)
                .ToList();

            if (!userNotifications.Any())
            {
                continue;
            }

            try
            {
                // Send digest email with all notifications for this user
                await SendDigestEmailAsync(
                    emailService,
                    userNotifications,
                    userSettings.User!,
                    "daily");

                // Mark all as sent
                foreach (var notification in userNotifications)
                {
                    notification.EmailSent = true;
                }

                sentCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to send daily digest email for user {UserId}",
                    userSettings.UserId);
            }
        }

        if (sentCount > 0)
        {
            await context.SaveChangesAsync();
            _logger.LogInformation("Sent {Count} daily digest emails", sentCount);
        }
    }

    /// <summary>
    /// Send a single notification as an email
    /// </summary>
    private async Task SendSingleNotificationEmailAsync(
        EmailService emailService,
        Notification notification,
        Profile user)
    {
        var subject = notification.Title;
        var body = BuildSingleNotificationHtml(notification);

        await emailService.SendEmailAsync(
            user.Email,
            subject,
            body);

        _logger.LogInformation(
            "Sent notification email to {Email} for notification {NotificationId}",
            user.Email,
            notification.Id);
    }

    /// <summary>
    /// Send a digest email with multiple notifications
    /// </summary>
    private async Task SendDigestEmailAsync(
        EmailService emailService,
        List<Notification> notifications,
        Profile user,
        string frequency)
    {
        var subject = $"Your {frequency} notification digest - {notifications.Count} new notification(s)";
        var body = BuildDigestHtml(notifications, frequency);

        await emailService.SendEmailAsync(
            user.Email,
            subject,
            body);

        _logger.LogInformation(
            "Sent {Frequency} digest email to {Email} with {Count} notifications",
            frequency,
            user.Email,
            notifications.Count);
    }

    /// <summary>
    /// Build HTML for a single notification email
    /// </summary>
    private string BuildSingleNotificationHtml(Notification notification)
    {
        var baseUrl = GetBaseUrl();
        var pageLink = notification.Page != null
            ? $"{baseUrl}/{notification.Page.Chapter?.Slug}/{notification.Page.Slug}"
            : baseUrl;

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .notification {{ background: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px; margin: 10px 0; }}
        .title {{ font-size: 18px; font-weight: bold; margin-bottom: 10px; }}
        .message {{ font-size: 14px; color: #666; }}
        .button {{ display: inline-block; padding: 10px 20px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""notification"">
            <div class=""title"">{notification.Title}</div>
            <div class=""message"">{notification.Message}</div>
            <a href=""{pageLink}"" class=""button"">View Page</a>
        </div>

        <div class=""footer"">
            <p>You received this email because you have notifications enabled for Kazakhstan IT Strategy.</p>
            <p>To change your notification preferences, visit your <a href=""{baseUrl}/profile/settings"">profile settings</a>.</p>
        </div>
    </div>
</body>
</html>";
    }

    /// <summary>
    /// Build HTML for a digest email with multiple notifications
    /// </summary>
    private string BuildDigestHtml(List<Notification> notifications, string frequency)
    {
        var baseUrl = GetBaseUrl();
        var notificationsHtml = string.Join("", notifications.Select(n =>
        {
            var pageLink = n.Page != null
                ? $"{baseUrl}/{n.Page.Chapter?.Slug}/{n.Page.Slug}"
                : baseUrl;

            return $@"
        <div class=""notification"">
            <div class=""title"">{n.Title}</div>
            <div class=""message"">{n.Message}</div>
            <div class=""time"">{n.CreatedAt:MMM dd, yyyy HH:mm} UTC</div>
            <a href=""{pageLink}"" class=""link"">View Page →</a>
        </div>";
        }));

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 4px 4px 0 0; }}
        .notification {{ background: #f9f9f9; border-left: 4px solid #4CAF50; padding: 15px; margin: 10px 0; }}
        .title {{ font-size: 16px; font-weight: bold; margin-bottom: 5px; }}
        .message {{ font-size: 14px; color: #666; margin-bottom: 5px; }}
        .time {{ font-size: 12px; color: #999; margin-bottom: 10px; }}
        .link {{ color: #4CAF50; text-decoration: none; font-weight: bold; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h2>Your {frequency} notification digest</h2>
            <p>{notifications.Count} new notification(s)</p>
        </div>

        {notificationsHtml}

        <div class=""footer"">
            <p>You received this {frequency} digest because you have notifications enabled for Kazakhstan IT Strategy.</p>
            <p>To change your notification preferences, visit your <a href=""{baseUrl}/profile/settings"">profile settings</a>.</p>
        </div>
    </div>
</body>
</html>";
    }
}
