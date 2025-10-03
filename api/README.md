# Kazakhstan Strategy API

ASP.NET Core Web API for the Kazakhstan Strategy Talk platform.

## Tech Stack

- **ASP.NET Core 9.0** - Web API framework
- **Entity Framework Core** - ORM for PostgreSQL
- **PostgreSQL** - Database
- **JWT** - Authentication
- **BCrypt** - Password hashing

## Prerequisites

- .NET 9 SDK
- PostgreSQL 14+

## Setup

### 1. Configure Database

Update `appsettings.json` with your PostgreSQL connection string:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=kazakhstan_strategy;Username=postgres;Password=your_password"
}
```

### 2. Update JWT Secret

Generate a secure JWT key (at least 32 characters) and update `appsettings.json`:

```json
"Jwt": {
  "Key": "your-super-secret-key-at-least-32-characters",
  "Issuer": "KazakhstanStrategyApi",
  "Audience": "KazakhstanStrategyClient"
}
```

### 3. Create Database

```bash
# Create database migration
dotnet ef migrations add InitialCreate

# Apply migration to database
dotnet ef database update
```

### 4. Run the API

```bash
dotnet run
```

The API will be available at `https://localhost:7XXX` (check console output for exact port).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Pages

- `GET /api/pages` - Get all pages
- `GET /api/pages/{slug}` - Get page by slug
- `POST /api/pages` - Create page (requires auth)
- `PUT /api/pages/{id}` - Update page (requires auth)
- `DELETE /api/pages/{id}` - Delete page (requires auth)

### Paragraphs

- `GET /api/paragraphs/page/{pageId}` - Get paragraphs by page
- `GET /api/paragraphs/{id}` - Get paragraph by ID
- `POST /api/paragraphs` - Create paragraph (requires auth)
- `PUT /api/paragraphs/{id}` - Update paragraph (requires auth)
- `DELETE /api/paragraphs/{id}` - Delete paragraph (requires auth)

### Comments

- `GET /api/comments/page/{pageId}` - Get comments by page
- `GET /api/comments/paragraph/{paragraphId}` - Get comments by paragraph
- `GET /api/comments/{id}` - Get comment by ID
- `POST /api/comments` - Create comment (requires auth)
- `PUT /api/comments/{id}` - Update comment (requires auth)
- `DELETE /api/comments/{id}` - Delete comment (requires auth)
- `POST /api/comments/{id}/vote` - Vote on comment (requires auth)

## Database Schema

### Tables

- **profiles** - User accounts
- **pages** - Document pages
- **paragraphs** - Content paragraphs
- **comments** - User comments
- **comment_votes** - Agree/disagree votes on comments

## Development

### Install EF Core Tools

```bash
dotnet tool install --global dotnet-ef
```

### Create New Migration

```bash
dotnet ef migrations add MigrationName
```

### Apply Migrations

```bash
dotnet ef database update
```

### Rollback Migration

```bash
dotnet ef database update PreviousMigrationName
```

## Production Deployment

1. Set environment variables:
   - `ConnectionStrings__DefaultConnection`
   - `Jwt__Key`
   - `ASPNETCORE_ENVIRONMENT=Production`

2. Build and publish:
```bash
dotnet publish -c Release -o ./publish
```

3. Run:
```bash
cd publish
dotnet KazakhstanStrategyApi.dll
```

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative React dev server)

Update the CORS policy in `Program.cs` for production domains.

## Security Notes

- **Never commit** `appsettings.json` with real credentials
- Use environment variables or Azure Key Vault in production
- Change the JWT secret key before deployment
- Enable HTTPS in production
- Configure proper CORS origins for production
