# Environment Variables Reference

This document lists all environment variables used in the API project and their deployment status.

## ✅ Properly Configured Variables

These variables are correctly set in the deployment workflow and used in the code:

### Database Configuration
- **DB_HOST** - Database host address
  - Used in: `Program.cs:46`
  - Deployment: ✅ Set in workflow (line 118, 177)
  - Default: `localhost`

- **DB_PORT** - Database port
  - Used in: `Program.cs:47`
  - Deployment: ✅ Set in workflow (line 119, 178)
  - Default: `5432`

- **DB_NAME** - Database name
  - Used in: `Program.cs:48`
  - Deployment: ✅ Set in workflow (line 120, 179)
  - Default: `kazakhstan_strategy`

- **DB_USER** - Database username
  - Used in: `Program.cs:49`
  - Deployment: ✅ Set in workflow (line 121, 180)
  - Default: `postgres`

- **DB_PASSWORD** - Database password
  - Used in: `Program.cs:50`
  - Deployment: ✅ Set in workflow (line 122, 181)
  - Default: `""` (empty string)

- **DB_CONNECTION_STRING** - Full database connection string (alternative to individual DB vars)
  - Used in: `Program.cs:43`
  - Deployment: ⚠️ Not set in workflow (uses individual DB_* vars instead)
  - Default: Falls back to constructing from individual vars

### JWT Authentication
- **JWT_KEY** - Secret key for JWT token signing
  - Used in: `Program.cs:97`, `TokenService.cs:24`
  - Deployment: ✅ Set in workflow (line 123, 182)
  - Fallback: `Configuration["Jwt:Key"]`

- **JWT_ISSUER** - JWT token issuer
  - Used in: `Program.cs:101`, `TokenService.cs:51`
  - Deployment: ✅ Set in workflow (line 124, 183)
  - Fallback: `Configuration["Jwt:Issuer"]`

- **JWT_AUDIENCE** - JWT token audience
  - Used in: `Program.cs:105`, `TokenService.cs:55`
  - Deployment: ✅ Set in workflow (line 125, 184)
  - Fallback: `Configuration["Jwt:Audience"]`

### AWS S3 Configuration
- **AWS_ACCESS_KEY_ID** - AWS access key
  - Used in: `Program.cs:65`
  - Deployment: ✅ Set in workflow (line 126, 185)
  - Required for S3 uploads

- **AWS_SECRET_ACCESS_KEY** - AWS secret key
  - Used in: `Program.cs:66`
  - Deployment: ✅ Set in workflow (line 127, 186)
  - Required for S3 uploads

- **AWS_REGION** - AWS region
  - Used in: `Program.cs:67`
  - Deployment: ✅ Set in workflow (line 128, 187)
  - Default: `ru-central1`

- **AWS_S3_SERVICE_URL** - S3-compatible service URL (for Yandex Cloud)
  - Used in: `Program.cs:68`
  - Deployment: ✅ Set in workflow (line 129, 188)

- **AWS_S3_BUCKET_NAME** - S3 bucket name
  - Used in: `Program.cs:69`
  - Deployment: ✅ Set in workflow (line 130, 189)

### Email Configuration (SMTP)
- **SMTP_HOST** - SMTP server host
  - Used in: `EmailService.cs:23`
  - Deployment: ✅ Set in workflow (line 131, 190)
  - Fallback: `Configuration["Email:SmtpHost"]`

- **SMTP_PORT** - SMTP server port
  - Used in: `EmailService.cs:25`
  - Deployment: ✅ Set in workflow (line 132, 191)
  - Fallback: `Configuration["Email:SmtpPort"]` or `"587"`

- **SMTP_USER** - SMTP username
  - Used in: `EmailService.cs:28`
  - Deployment: ✅ Set in workflow (line 133, 192)
  - Fallback: `Configuration["Email:SmtpUser"]`

- **SMTP_PASSWORD** - SMTP password
  - Used in: `EmailService.cs:30`
  - Deployment: ✅ Set in workflow (line 134, 193)
  - Fallback: `Configuration["Email:SmtpPassword"]`

- **EMAIL_FROM** - Sender email address
  - Used in: `EmailService.cs:49`
  - Deployment: ✅ Set in workflow (line 135, 194)
  - Fallback: `Configuration["Email:FromEmail"]` or `"talk@itstrategy.kz"`

- **EMAIL_FROM_NAME** - Sender name
  - Used in: `EmailService.cs:52`
  - Deployment: ✅ Set in workflow (line 136, 195)
  - Fallback: `Configuration["Email:FromName"]` or `"Kazakhstan IT Strategy"`

### Application Configuration
- **APP_BASE_URL** - Base URL for the application (used in emails and sitemap)
  - Used in:
    - `EmailService.cs:55` (for email verification links)
    - `AuthController.cs:347` (for reset password links)
    - `SitemapController.cs:41` (for sitemap URLs)
  - Deployment: ✅ Set in workflow (line 137, 196)
  - Fallback: `Configuration["Api:BaseUrl"]` or `"https://localhost:7001"`
  - **Note**: Configuration uses `Api:BaseUrl` but code also checks `App:BaseUrl`

### ASP.NET Core Configuration
- **ASPNETCORE_ENVIRONMENT** - Application environment (Production, Development, etc.)
  - Deployment: ✅ Set in workflow (line 197)
  - Value: `Production`

- **ASPNETCORE_URLS** - URLs the application listens on
  - Deployment: ✅ Set in workflow (line 198)
  - Value: `http://+:8080`

## ⚠️ Configuration Inconsistencies Found

1. **App:BaseUrl vs Api:BaseUrl**
   - `appsettings.json` uses: `"App": { "BaseUrl": ... }`
   - `EmailService.cs` checks: `Configuration["Api:BaseUrl"]`
   - **Resolution**: Both paths are checked, but for consistency, should standardize

2. **Sitemap Base URL** (FIXED ✅)
   - Was only checking `Configuration["App:BaseUrl"]`
   - Now properly checks `APP_BASE_URL` environment variable first

## 📋 Deployment Checklist

Ensure these secrets are configured in GitHub:

- [ ] DB_HOST
- [ ] DB_PORT
- [ ] DB_NAME
- [ ] DB_USER
- [ ] DB_PASSWORD
- [ ] JWT_KEY
- [ ] JWT_ISSUER
- [ ] JWT_AUDIENCE
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_REGION
- [ ] AWS_S3_BUCKET_NAME
- [ ] AWS_S3_SERVICE_URL
- [ ] SMTP_HOST
- [ ] SMTP_PORT
- [ ] SMTP_USER
- [ ] SMTP_PASSWORD
- [ ] EMAIL_FROM
- [ ] EMAIL_FROM_NAME
- [ ] APP_BASE_URL

## 🔍 Validation Status

✅ All environment variables used in code are properly passed to Docker containers
✅ All variables have proper fallbacks to configuration or defaults
✅ Sitemap now correctly uses APP_BASE_URL environment variable
⚠️  Minor configuration path inconsistency (App vs Api namespace) - non-critical

## 📝 Notes

1. The application uses a tiered configuration approach:
   - First: Environment Variables
   - Second: appsettings.json
   - Third: Hardcoded defaults

2. All secrets should NEVER be committed to the repository
3. Use GitHub Secrets for all sensitive values
4. The deployment workflow properly passes all variables to the container
