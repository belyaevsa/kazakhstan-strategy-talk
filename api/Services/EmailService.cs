using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using KazakhstanStrategyApi.Data;
using KazakhstanStrategyApi.Models;

namespace KazakhstanStrategyApi.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly SmtpClient _smtpClient;
    private readonly ILogger<EmailService> _logger;
    private readonly AppDbContext _context;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, AppDbContext context)
    {
        _configuration = configuration;
        _logger = logger;
        _context = context;

        // Use environment variables if available, otherwise fallback to appsettings.json
        var smtpHost = Environment.GetEnvironmentVariable("SMTP_HOST")
            ?? _configuration["Email:SmtpHost"];
        var smtpPort = int.Parse(Environment.GetEnvironmentVariable("SMTP_PORT")
            ?? _configuration["Email:SmtpPort"]
            ?? "587");
        var smtpUser = Environment.GetEnvironmentVariable("SMTP_USER")
            ?? _configuration["Email:SmtpUser"];
        var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD")
            ?? _configuration["Email:SmtpPassword"];

        _logger.LogInformation("Initializing EmailService. SMTP Host: {SmtpHost}, Port: {SmtpPort}",
            smtpHost, smtpPort);

        _smtpClient = new SmtpClient(smtpHost)
        {
            Port = smtpPort,
            Credentials = new NetworkCredential(smtpUser, smtpPassword),
            EnableSsl = true
        };
    }

    public async Task SendEmailVerificationAsync(string toEmail, string username, string verificationToken)
    {
        _logger.LogInformation("Preparing to send verification email. To: {ToEmail}, Username: {Username}",
            toEmail, username);

        var fromEmail = Environment.GetEnvironmentVariable("EMAIL_FROM")
            ?? _configuration["Email:FromEmail"]
            ?? "talk@itstrategy.kz";
        var fromName = Environment.GetEnvironmentVariable("EMAIL_FROM_NAME")
            ?? _configuration["Email:FromName"]
            ?? "Kazakhstan IT Strategy";
        var apiBaseUrl = Environment.GetEnvironmentVariable("APP_BASE_URL")
            ?? _configuration["Api:BaseUrl"]
            ?? "https://localhost:7001";

        var verificationUrl = $"{apiBaseUrl}/api/auth/verify-email?token={verificationToken}";

        _logger.LogDebug("Email configuration - From: {FromEmail}, FromName: {FromName}, ApiBaseUrl: {ApiBaseUrl}",
            fromEmail, fromName, apiBaseUrl);

        var subject = "Verify your email | Подтвердите вашу почту - Kazakhstan IT Strategy";
        var body = $@"
            <html>
            <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                    <!-- English Version -->
                    <div style='margin-bottom: 40px;'>
                        <h2 style='color: #007bff;'>Welcome to Kazakhstan IT Strategy, {username}!</h2>
                        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                        <p style='text-align: center; margin: 30px 0;'>
                            <a href='{verificationUrl}' style='display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;'>Verify Email</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style='background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;'>{verificationUrl}</p>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p style='color: #666; font-size: 14px;'>If you didn't create an account, you can safely ignore this email.</p>
                    </div>

                    <hr style='border: none; border-top: 1px solid #ddd; margin: 40px 0;' />

                    <!-- Russian Version -->
                    <div style='margin-bottom: 40px;'>
                        <h2 style='color: #007bff;'>Добро пожаловать в Kazakhstan IT Strategy, {username}!</h2>
                        <p>Спасибо за регистрацию. Пожалуйста, подтвердите свой адрес электронной почты, нажав на кнопку ниже:</p>
                        <p style='text-align: center; margin: 30px 0;'>
                            <a href='{verificationUrl}' style='display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;'>Подтвердить почту</a>
                        </p>
                        <p>Или скопируйте и вставьте эту ссылку в ваш браузер:</p>
                        <p style='background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;'>{verificationUrl}</p>
                        <p><strong>Ссылка действительна в течение 24 часов.</strong></p>
                        <p style='color: #666; font-size: 14px;'>Если вы не создавали учетную запись, вы можете спокойно проигнорировать это письмо.</p>
                    </div>

                    <div style='margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;'>
                        <p>Best regards | С уважением,<br><strong>Kazakhstan IT Strategy Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
        ";

        var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };
        message.To.Add(toEmail);

        // Create email log entry
        var emailLog = new EmailLog
        {
            ToEmail = toEmail,
            FromEmail = fromEmail,
            FromName = fromName,
            Subject = subject,
            Body = body,
            EmailType = "EmailVerification",
            IsSent = false,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _logger.LogInformation("Sending verification email via SMTP. SMTP Host: {SmtpHost}, Port: {SmtpPort}, From: {FromEmail} ({FromName}), To: {ToEmail}, Subject: {Subject}, VerificationUrl: {VerificationUrl}",
                _smtpClient.Host, _smtpClient.Port, fromEmail, fromName, toEmail, subject, verificationUrl);

            // Set 15 second timeout for email sending
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
            try
            {
                await _smtpClient.SendMailAsync(message, cts.Token);

                // Mark as sent
                emailLog.IsSent = true;
                emailLog.SentAt = DateTime.UtcNow;
            }
            catch (OperationCanceledException)
            {
                _logger.LogError("Email sending timed out after 15 seconds. To: {ToEmail}", toEmail);
                emailLog.ErrorMessage = "Email sending operation timed out after 15 seconds";
                throw new TimeoutException("Email sending operation timed out after 15 seconds");
            }

            _logger.LogInformation("Verification email sent successfully. To: {ToEmail}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email. To: {ToEmail}", toEmail);
            emailLog.ErrorMessage = ex.Message;
            throw;
        }
        finally
        {
            // Save email log to database
            _context.EmailLogs.Add(emailLog);
            await _context.SaveChangesAsync();
        }
    }
}
