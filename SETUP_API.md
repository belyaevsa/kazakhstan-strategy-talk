# API Setup Guide

Complete guide to set up and run the C# API with PostgreSQL.

## Step 1: Install Prerequisites

### Install PostgreSQL

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### Verify .NET SDK

```bash
dotnet --version  # Should be 9.0 or higher
```

## Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE kazakhstan_strategy;

# Create user (optional)
CREATE USER kz_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kazakhstan_strategy TO kz_user;

# Exit
\q
```

## Step 3: Configure API

Edit `api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=kazakhstan_strategy;Username=postgres;Password=your_password"
  },
  "Jwt": {
    "Key": "GenerateASecureRandomKeyAtLeast32CharactersLong123!",
    "Issuer": "KazakhstanStrategyApi",
    "Audience": "KazakhstanStrategyClient"
  }
}
```

## Step 4: Install EF Core Tools

```bash
dotnet tool install --global dotnet-ef
```

## Step 5: Create and Apply Migrations

```bash
cd api

# Create initial migration
dotnet ef migrations add InitialCreate

# Apply to database
dotnet ef database update
```

## Step 6: Run the API

```bash
dotnet run --project KazakhstanStrategyApi.csproj
```

The API will start at `https://localhost:XXXX` (check console output).

## Step 7: Test the API

### Register a user:

```bash
curl -X POST https://localhost:7XXX/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

### Login:

```bash
curl -X POST https://localhost:7XXX/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get pages:

```bash
curl https://localhost:7XXX/api/pages
```

## Optional: Seed Database

Create `api/Data/DbSeeder.cs`:

```csharp
public static class DbSeeder
{
    public static void Seed(AppDbContext context)
    {
        if (!context.Pages.Any())
        {
            var page = new Page
            {
                Title = "Introduction",
                Description = "Introduction to Kazakhstan IT Strategy",
                Slug = "introduction",
                OrderIndex = 1
            };
            context.Pages.Add(page);
            context.SaveChanges();

            context.Paragraphs.Add(new Paragraph
            {
                Content = "This is the first paragraph of the introduction.",
                OrderIndex = 1,
                PageId = page.Id
            });
            context.SaveChanges();
        }
    }
}
```

Add to `Program.cs` before `app.Run()`:

```csharp
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(context);
}
```

## Troubleshooting

### Error: "Cannot connect to database"
- Check PostgreSQL is running: `pg_isready`
- Verify connection string in appsettings.json
- Check firewall settings

### Error: "A network-related instance-specific error"
- On macOS: `brew services restart postgresql@16`
- On Linux: `sudo systemctl restart postgresql`

### Error: "Migrations not found"
- Run `dotnet ef migrations add InitialCreate` from the `api` directory

### Port already in use
- Change port in `Properties/launchSettings.json`
- Or specify port: `dotnet run --urls "https://localhost:5001"`

## Next Steps

1. **Migrate React app** to use this API instead of Supabase
2. **Add more seed data** for testing
3. **Configure production** connection strings
4. **Set up CI/CD** for deployment
5. **Add API documentation** with Swagger/OpenAPI

## Production Deployment

See `api/README.md` for production deployment instructions.
