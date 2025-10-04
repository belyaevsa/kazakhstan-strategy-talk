# Multi-stage Dockerfile for Kazakhstan IT Strategy Application
# Builds both frontend (React/Vite) and backend (ASP.NET Core)

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY . .

# Build arguments for build-time configuration
ARG VITE_GA_MEASUREMENT_ID
ARG VITE_YANDEX_METRICA_ID

# Set environment variables for frontend build
ENV VITE_API_URL=/api \
    VITE_GA_MEASUREMENT_ID=${VITE_GA_MEASUREMENT_ID} \
    VITE_YANDEX_METRICA_ID=${VITE_YANDEX_METRICA_ID}

# Build frontend for production
RUN npm run build

# Stage 2: Build Backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build

WORKDIR /app/backend

# Copy csproj and restore dependencies
COPY api/*.csproj ./
RUN dotnet restore

# Copy backend source
COPY api/ ./

# Build backend
RUN dotnet publish -c Release -o out

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime

WORKDIR /app

# Install necessary tools
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy backend build output
COPY --from=backend-build /app/backend/out .

# Copy frontend build output to wwwroot
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Create a non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose ports
EXPOSE 8080

# Environment variables
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

# Required environment variables to be set at runtime:
# Backend:
# - DB_HOST (or DB_CONNECTION_STRING)
# - DB_PORT
# - DB_NAME
# - DB_USER
# - DB_PASSWORD
# - JWT_KEY
# - JWT_ISSUER
# - JWT_AUDIENCE
# - App__BaseUrl (e.g., https://your-domain.com)
#
# Frontend (set as build args):
# - VITE_GA_MEASUREMENT_ID (Google Analytics)
# - VITE_YANDEX_METRICA_ID (Yandex Metrica)

ENTRYPOINT ["dotnet", "KazakhstanStrategyApi.dll"]
