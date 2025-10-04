# Docker Deployment Guide

This application can be deployed using Docker, with both frontend and backend packaged in a single container.

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.docker .env
```

Edit `.env` and set your configuration:
- **DB_PASSWORD**: Set a strong database password
- **JWT_KEY**: Generate a secure random key (at least 32 characters)

### 2. Build and Run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL database container
- Build and start the application container (frontend + backend)
- Expose the application on `http://localhost:8080`

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

### 4. View Logs

```bash
# View all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# View database logs only
docker-compose logs -f db
```

### 5. Stop the Application

```bash
docker-compose down
```

To also remove the database volume:
```bash
docker-compose down -v
```

## Manual Docker Build

If you prefer to build and run manually:

### Build the Image

```bash
docker build -t kazakhstan-strategy-app .
```

### Run the Container

```bash
docker run -d \
  --name kazakhstan-strategy-app \
  -p 8080:8080 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_NAME=kazakhstan_strategy \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your_secure_password \
  -e JWT_KEY=your_jwt_key_at_least_32_characters \
  -e JWT_ISSUER=KazakhstanStrategyApi \
  -e JWT_AUDIENCE=KazakhstanStrategyClient \
  kazakhstan-strategy-app
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` or `db` (in Docker Compose) |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `kazakhstan_strategy` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `SecurePassword123!` |
| `JWT_KEY` | JWT signing key (min 32 chars) | `YourSecureKey...` |
| `JWT_ISSUER` | JWT issuer | `KazakhstanStrategyApi` |
| `JWT_AUDIENCE` | JWT audience | `KazakhstanStrategyClient` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASPNETCORE_ENVIRONMENT` | Environment mode | `Production` |
| `ASPNETCORE_URLS` | URL bindings | `http://+:8080` |

## Database Migrations

The application will automatically apply database migrations on startup. However, if you need to run migrations manually:

```bash
# Enter the container
docker exec -it kazakhstan-strategy-app bash

# Run migrations
dotnet ef database update
```

## Production Deployment Checklist

- [ ] Change default database password
- [ ] Generate a secure JWT key (use `openssl rand -base64 48`)
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Configure HTTPS with reverse proxy (nginx/Traefik)
- [ ] Set up regular database backups
- [ ] Configure logging and monitoring
- [ ] Review and update CORS settings if needed
- [ ] Set up a CDN for static assets (optional)

## Troubleshooting

### Database Connection Issues

Check database container is running:
```bash
docker-compose ps
docker-compose logs db
```

### Application Not Starting

Check application logs:
```bash
docker-compose logs app
```

### Port Already in Use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "9090:8080"  # Change 9090 to your preferred port
```

## Health Checks

The application includes health check endpoints:
- `/health` - Basic health check

Test with:
```bash
curl http://localhost:8080/health
```

## Scaling

To run multiple instances behind a load balancer:

```bash
docker-compose up -d --scale app=3
```

Note: You'll need to configure a reverse proxy (like nginx) to load balance between instances.
