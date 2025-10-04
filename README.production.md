# Production Deployment Guide for itstrategy.kz

This guide covers deploying the Kazakhstan IT Strategy application to production with Nginx, SSL/TLS, and Docker.

## Prerequisites

- Domain name pointing to your server: `itstrategy.kz` and `www.itstrategy.kz`
- Server with Docker and Docker Compose installed
- Ports 80 and 443 open on your firewall
- Valid email address for Let's Encrypt notifications

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd kazakhstan-strategy-talk

# Copy environment file
cp .env.docker .env

# Edit .env with production values
nano .env
```

**Important:** Set strong passwords and secure JWT key:
```bash
# Generate a secure JWT key
openssl rand -base64 48

# Generate a secure database password
openssl rand -base64 32
```

### 2. Configure SSL Certificate

Edit `init-letsencrypt.sh` and add your email:
```bash
nano init-letsencrypt.sh
# Change: email="" to email="your-email@example.com"
```

Make the script executable:
```bash
chmod +x init-letsencrypt.sh
```

### 3. Initialize SSL Certificate

Run the Let's Encrypt initialization script:
```bash
./init-letsencrypt.sh
```

This script will:
- Download recommended TLS parameters
- Create a dummy certificate
- Start Nginx
- Request a real certificate from Let's Encrypt
- Reload Nginx with the real certificate

**Note:** If you're testing the setup first, set `staging=1` in `init-letsencrypt.sh` to avoid hitting Let's Encrypt rate limits.

### 4. Start Production Environment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

Check that all services are running:
```bash
docker-compose -f docker-compose.prod.yml ps
```

Check logs:
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f nginx
```

Test the application:
```bash
curl https://itstrategy.kz/health
```

## Architecture

```
Internet
   ↓
Nginx (Port 80/443)
   ↓
Application Container (Port 8080)
   ↓
PostgreSQL Database (Port 5432)
```

## Services

### Nginx
- **Purpose:** Reverse proxy, SSL termination, static file caching
- **Ports:** 80 (HTTP), 443 (HTTPS)
- **Config:** `nginx.conf`

### Application
- **Purpose:** ASP.NET Core backend + React frontend
- **Internal Port:** 8080
- **Environment:** Production

### PostgreSQL
- **Purpose:** Database
- **Internal Port:** 5432
- **Data:** Persisted in Docker volume `postgres_data`

### Certbot
- **Purpose:** SSL certificate renewal
- **Schedule:** Checks every 12 hours

## SSL Certificate Management

### Manual Certificate Renewal

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Automatic Renewal

Certbot container automatically checks for renewal every 12 hours. Certificates are renewed when they're within 30 days of expiration.

### Check Certificate Expiry

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot certificates
```

## Maintenance

### View Logs

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# Nginx access logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/itstrategy.kz-access.log

# Nginx error logs
docker-compose -f docker-compose.prod.yml exec nginx tail -f /var/log/nginx/itstrategy.kz-error.log
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app
docker-compose -f docker-compose.prod.yml restart nginx
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build app

# Or rebuild all
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres kazakhstan_strategy > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres kazakhstan_strategy < backup_20250104_120000.sql
```

### Database Migrations

Migrations are applied automatically on application startup. To run manually:

```bash
docker-compose -f docker-compose.prod.yml exec app dotnet ef database update
```

## Monitoring

### Health Checks

- Application: `https://itstrategy.kz/health`
- Nginx: Built-in Docker health check

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## Security

### Firewall Configuration

Allow only necessary ports:
```bash
# UFW example
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Security Headers

Nginx is configured with security headers:
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

### Database Security

- Database is not exposed to the internet
- Only accessible within Docker network
- Use strong passwords in `.env`

## Troubleshooting

### Application Not Starting

Check logs:
```bash
docker-compose -f docker-compose.prod.yml logs app
```

Common issues:
- Database connection failed → Check DB_PASSWORD in .env
- Port already in use → Stop conflicting service

### SSL Certificate Issues

**Certificate not obtained:**
```bash
# Check certbot logs
docker-compose -f docker-compose.prod.yml logs certbot

# Try manual renewal
docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot -w /var/www/certbot -d itstrategy.kz -d www.itstrategy.kz
```

**Rate limit hit:**
- Wait 7 days or use staging mode (`staging=1` in init script)

### 502 Bad Gateway

Application container is not responding:
```bash
# Check if app is running
docker-compose -f docker-compose.prod.yml ps app

# Check app logs
docker-compose -f docker-compose.prod.yml logs app

# Restart app
docker-compose -f docker-compose.prod.yml restart app
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.prod.yml ps db

# Test database connection
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d kazakhstan_strategy -c "SELECT version();"
```

## Performance Optimization

### Enable Nginx Caching

Static assets are cached for 1 year. Modify `nginx.conf` to adjust cache settings.

### Database Performance

```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec db psql -U postgres kazakhstan_strategy

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Application Scaling

To run multiple application instances behind Nginx:

```bash
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

Update `nginx.conf` to use upstream load balancing.

## Stopping the Application

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v
```

## Support

For issues and questions:
- Check logs first
- Review this documentation
- Open an issue in the repository

## Production Checklist

- [ ] Domain DNS configured correctly
- [ ] Strong passwords set in `.env`
- [ ] Email configured in `init-letsencrypt.sh`
- [ ] SSL certificate obtained successfully
- [ ] Firewall configured properly
- [ ] Database backups scheduled
- [ ] Monitoring set up
- [ ] Application health check responding
- [ ] HTTPS redirect working
- [ ] Security headers verified
