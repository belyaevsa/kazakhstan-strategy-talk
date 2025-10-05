using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace KazakhstanStrategyApi.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly SmtpClient _smtpClient;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;

        var smtpHost = _configuration["Email:SmtpHost"];
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        var smtpUser = _configuration["Email:SmtpUser"];
        var smtpPassword = _configuration["Email:SmtpPassword"];

        _smtpClient = new SmtpClient(smtpHost)
        {
            Port = smtpPort,
            Credentials = new NetworkCredential(smtpUser, smtpPassword),
            EnableSsl = true
        };
    }

    public async Task SendEmailVerificationAsync(string toEmail, string username, string verificationToken)
    {
        var fromEmail = _configuration["Email:FromEmail"] ?? "noreply@strategy.kz";
        var fromName = _configuration["Email:FromName"] ?? "Kazakhstan IT Strategy";
        var baseUrl = _configuration["App:BaseUrl"] ?? "http://localhost:8080";

        var verificationUrl = $"{baseUrl}/verify-email?token={verificationToken}";

        var subject = "Verify your email - Kazakhstan IT Strategy";
        var body = $@"
            <html>
            <body>
                <h2>Welcome to Kazakhstan IT Strategy, {username}!</h2>
                <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
                <p><a href='{verificationUrl}' style='display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;'>Verify Email</a></p>
                <p>Or copy and paste this link into your browser:</p>
                <p>{verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
                <br>
                <p>Best regards,<br>Kazakhstan IT Strategy Team</p>
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

        await _smtpClient.SendMailAsync(message);
    }
}
