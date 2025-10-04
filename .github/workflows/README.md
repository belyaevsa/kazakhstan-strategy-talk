# GitHub Actions Deployment

This workflow automatically deploys the application to production using blue-green deployment with a self-hosted runner.

## Setup

### 1. Install Self-Hosted Runner

On your server, install the GitHub Actions runner:

```bash
# Create a folder
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure the runner
./config.sh --url https://github.com/YOUR_USERNAME/kazakhstan-strategy-talk --token YOUR_TOKEN

# Install as a service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start
```

**Get the token from:** GitHub repo → Settings → Actions → Runners → New self-hosted runner

### 2. Required GitHub Secrets

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

#### Database Configuration
- `DB_HOST` - Database host (e.g., `localhost` or `db`)
- `DB_PORT` - Database port (e.g., `5432`)
- `DB_NAME` - Database name (e.g., `kazakhstan_strategy`)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

#### JWT Configuration
- `JWT_KEY` - JWT signing key (min 32 characters, generate with `openssl rand -base64 48`)
- `JWT_ISSUER` - JWT issuer (e.g., `KazakhstanStrategyApi`)
- `JWT_AUDIENCE` - JWT audience (e.g., `KazakhstanStrategyClient`)

### 3. Server Preparation

Ensure Docker is installed on the server where the runner is installed:

```bash
docker --version
```

The runner will checkout code automatically, no manual setup needed.

## How It Works

### Blue-Green Deployment Process

1. **Build Phase**
   - Pulls latest code from `main` branch
   - Builds Docker image with BuildKit
   - Tags image with timestamp and commit SHA

2. **Deploy Phase**
   - Determines current container (blue or green)
   - Starts new container with opposite color
   - Runs on port 8080
   - Injects secrets as environment variables

3. **Health Check**
   - Waits for container to start (10 seconds)
   - Performs health check on `/health` endpoint
   - Retries up to 30 times (60 seconds total)
   - Rolls back if health check fails

4. **Cutover**
   - Stops old container
   - Removes old container
   - New container is now serving traffic

5. **Cleanup**
   - Keeps last 3 images
   - Removes older images
   - Cleans up dangling images

### Container Naming

- `kazakhstan-strategy-blue` - Blue environment
- `kazakhstan-strategy-green` - Green environment
- Only one container runs at a time on port 8080

### Triggers

- Automatic: Push to `main` branch
- Manual: Workflow dispatch from GitHub Actions tab

## Usage

### Automatic Deployment

```bash
git add .
git commit -m "Your changes"
git push origin main
```

The workflow will automatically:
1. Build the new image
2. Deploy to the opposite environment
3. Health check the new deployment
4. Cut over to the new version
5. Clean up old images

### Manual Deployment

1. Go to GitHub Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select branch (usually `main`)
5. Click "Run workflow"

## Monitoring

### View Deployment Status

- GitHub Actions tab shows deployment progress
- Click on workflow run for detailed logs

### Check Active Container

```bash
ssh user@your-server.com
docker ps --filter "name=kazakhstan-strategy"
```

### View Container Logs

```bash
# Current container
docker logs -f $(docker ps --filter "name=kazakhstan-strategy" --format "{{.Names}}" | head -n 1)

# Specific container
docker logs -f kazakhstan-strategy-blue
docker logs -f kazakhstan-strategy-green
```

### Check Images

```bash
docker images kazakhstan-strategy-app
```

## Rollback

If deployment fails, the old container keeps running. To manually rollback:

```bash
# On server
cd /opt/kazakhstan-strategy-talk

# Find the previous working image
docker images kazakhstan-strategy-app

# Stop current container
docker stop $(docker ps --filter "name=kazakhstan-strategy" --format "{{.Names}}")
docker rm $(docker ps -a --filter "name=kazakhstan-strategy" --format "{{.Names}}")

# Start container with previous image
docker run -d \
  --name kazakhstan-strategy-blue \
  --restart unless-stopped \
  -p 8080:8080 \
  -e DB_HOST="..." \
  -e DB_PASSWORD="..." \
  -e JWT_KEY="..." \
  [...other env vars...] \
  kazakhstan-strategy-app:PREVIOUS_TAG
```

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs for error details
2. SSH to server and check Docker logs
3. Verify secrets are configured correctly

### Health Check Fails

```bash
# On server, check container logs
docker logs $(docker ps --filter "name=kazakhstan-strategy" --format "{{.Names}}" | head -n 1)

# Test health endpoint manually
curl http://localhost:8080/health
```

### Port Already in Use

```bash
# Find what's using port 8080
sudo lsof -i :8080

# Stop old containers
docker stop $(docker ps -a --filter "name=kazakhstan-strategy" --format "{{.Names}}")
docker rm $(docker ps -a --filter "name=kazakhstan-strategy" --format "{{.Names}}")
```

### Out of Disk Space

```bash
# Clean up Docker resources
docker system prune -a -f

# Remove old images manually
docker images kazakhstan-strategy-app --format "{{.ID}}" | tail -n +4 | xargs docker rmi -f
```

## Security Notes

- Never commit secrets to the repository
- Use strong passwords for DB_PASSWORD and JWT_KEY
- Rotate SSH keys regularly
- Limit SSH access to GitHub Actions IP ranges if possible
- Use a dedicated deployment user with limited privileges

## Environment Variables

The following environment variables are automatically injected:

| Variable | Source | Description |
|----------|--------|-------------|
| `DB_HOST` | Secret | Database host |
| `DB_PORT` | Secret | Database port |
| `DB_NAME` | Secret | Database name |
| `DB_USER` | Secret | Database username |
| `DB_PASSWORD` | Secret | Database password |
| `JWT_KEY` | Secret | JWT signing key |
| `JWT_ISSUER` | Secret | JWT issuer |
| `JWT_AUDIENCE` | Secret | JWT audience |
| `ASPNETCORE_ENVIRONMENT` | Hardcoded | `Production` |
| `ASPNETCORE_URLS` | Hardcoded | `http://+:8080` |
