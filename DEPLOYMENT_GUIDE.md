# Production Deployment Guide

## Overview

This guide walks through deploying the Unified Athlete Platform to production using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+ 
- Docker Compose 2.0+
- Nginx 1.18+ (for reverse proxy)
- PostgreSQL 15 or cloud database
- Redis 7 or cloud cache
- SSL/TLS certificates (Let's Encrypt recommended)
- Domain name configured with DNS

## Pre-Deployment Checklist

- [ ] All environment variables configured in `.env.production`
- [ ] Database backups configured
- [ ] SSL/TLS certificates obtained
- [ ] Monitoring/alerting configured (Sentry, CloudWatch, etc.)
- [ ] Secrets stored securely (AWS Secrets Manager, Vault, etc.)
- [ ] CI/CD pipeline tested (GitHub Actions)
- [ ] Load balancer configured (if needed)
- [ ] CDN configured for static assets (Cloudflare, CloudFront, etc.)
- [ ] Email service tested (SendGrid, AWS SES, etc.)
- [ ] File storage configured (S3, Azure Blob, etc.)
- [ ] Database size estimates verified
- [ ] Rate limits reviewed and adjusted
- [ ] Security headers validated
- [ ] CORS origins configured
- [ ] Logging aggregation configured (DataDog, ELK, etc.)

## Step 1: Environment Setup

### 1.1 Create Production Environment File

Copy the template and fill in production values:

```bash
cp .env.production .env.production.local
```

Edit `.env.production.local` with:
- Database credentials
- Redis URL
- NextAuth secrets (generate with: `openssl rand -base64 32`)
- JWT secret
- API keys (SendGrid, Sentry, etc.)
- Stripe/Twilio credentials
- AWS credentials for S3
- Domain and URLs

### 1.2 Verify Secrets Management

Production should NOT store secrets in `.env` files. Use:
- **AWS Secrets Manager**: Store and rotate secrets
- **HashiCorp Vault**: Enterprise secret management
- **Azure Key Vault**: Azure-native solution
- **Docker Secrets**: For Swarm deployments
- **Kubernetes Secrets**: For K8s deployments

Mount secrets into containers at runtime:

```bash
# Example with AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id athlete-platform --query SecretString --output text > secrets.json
```

## Step 2: Database Setup

### 2.1 PostgreSQL Setup

#### Option A: Self-Hosted PostgreSQL

```bash
# Create database directory
mkdir -p /data/postgres
chmod 700 /data/postgres

# Run PostgreSQL container
docker run -d \
  --name postgres \
  -e POSTGRES_USER=athlete_user \
  -e POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  -e POSTGRES_DB=athlete_platform \
  -v /data/postgres:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine
```

#### Option B: Managed Database (Recommended)

Use cloud-managed databases:
- **AWS RDS**: PostgreSQL 15
- **Azure Database for PostgreSQL**: Flexible Server
- **Google Cloud SQL**: PostgreSQL 15
- **DigitalOcean Managed Database**: PostgreSQL
- **Heroku Postgres**: Managed PostgreSQL

Benefits:
- Automated backups
- High availability
- Point-in-time recovery
- No maintenance overhead
- Built-in monitoring

### 2.2 Run Migrations

```bash
# Create .env file with DATABASE_URL
export DATABASE_URL="postgresql://athlete_user:password@db.example.com:5432/athlete_platform"

# Run Prisma migrations
npx prisma migrate deploy

# Verify database
npx prisma db execute --stdin < health_check.sql
```

### 2.3 Database Backup Strategy

```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR=/backups/postgres
DATE=$(date +%Y%m%d_%H%M%S)

# Full backup
pg_dump $DATABASE_URL > $BACKUP_DIR/full_$DATE.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/full_$DATE.sql s3://athlete-backups/

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

Schedule with cron:
```bash
0 2 * * * /scripts/backup-database.sh  # Daily at 2 AM
```

## Step 3: Redis Setup

### Option A: Self-Hosted Redis

```bash
# Create Redis container
docker run -d \
  --name redis \
  -e REDIS_PASSWORD=$(openssl rand -base64 32) \
  -v /data/redis:/data \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --requirepass password --appendonly yes
```

### Option B: Managed Redis

- **AWS ElastiCache**: Managed Redis with clustering
- **Azure Cache for Redis**: Fully managed service
- **Google Cloud Memorystore**: Serverless Redis
- **Heroku Redis**: Simple managed Redis

## Step 4: Build and Deploy Docker Image

### 4.1 Build Image

```bash
# Build locally
docker build -t athlete-platform:1.0.0 .

# Tag for registry
docker tag athlete-platform:1.0.0 ghcr.io/yourorg/athlete-platform:1.0.0
```

### 4.2 Push to Registry

```bash
# Login to container registry
docker login ghcr.io

# Push image
docker push ghcr.io/yourorg/athlete-platform:1.0.0
```

### 4.3 Deploy with Docker Compose

```bash
# On production server
mkdir -p /app/athlete-platform
cd /app/athlete-platform

# Copy docker-compose.yml
curl -o docker-compose.yml https://raw.githubusercontent.com/yourorg/athlete-platform/main/docker-compose.yml

# Start services
docker-compose -f docker-compose.yml up -d

# Verify services
docker-compose ps
docker-compose logs -f
```

### 4.4 Deploy to Kubernetes (Optional)

For high-scale deployments:

```bash
# Create namespace
kubectl create namespace athlete-platform

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=redis-url=$REDIS_URL \
  -n athlete-platform

# Deploy
kubectl apply -f k8s/deployment.yml -n athlete-platform
```

## Step 5: Configure Nginx Reverse Proxy

### 5.1 Install and Configure Nginx

```bash
# Install Nginx
sudo apt-get install nginx-full

# Copy configuration
sudo cp nginx.conf /etc/nginx/conf.d/athlete-platform.conf

# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5.2 Setup SSL/TLS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --webroot -w /var/www/certbot \
  -d athlete-platform.example.com

# Setup auto-renewal
sudo systemctl enable certbot.timer
```

## Step 6: Configure Monitoring and Logging

### 6.1 Sentry Setup

```bash
# Install Sentry SDK
npm install @sentry/nextjs

# Configure in app
# See: lib/sentry.ts
SENTRY_DSN=https://your-sentry-dsn@sentry.io/projectid
```

### 6.2 Structured Logging

```bash
# Logs are output to stdout in JSON format
# Collect with:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- AWS CloudWatch
- DataDog
- Splunk
- Google Cloud Logging
```

### 6.3 Health Checks

```bash
# Monitor /api/health endpoint
curl https://athlete-platform.example.com/api/health

# Setup monitoring
- Uptime Robot
- Datadog
- New Relic
- CloudWatch
```

## Step 7: Performance Optimization

### 7.1 Enable Gzip Compression

Configured in nginx.conf - automatically compresses responses

### 7.2 CDN Configuration

```bash
# Cloudflare example
1. Add domain to Cloudflare
2. Configure DNS to point to Cloudflare nameservers
3. Enable caching for static assets
4. Enable minification
5. Enable security features (WAF, DDoS)
```

### 7.3 Database Optimization

```sql
-- Create indexes on frequently queried fields
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_messages_room_id ON messages(room_id, created_at DESC);
CREATE INDEX idx_training_plans_user_id ON training_plans(user_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

## Step 8: Scaling for Production

### 8.1 Horizontal Scaling

Deploy multiple app instances:

```yaml
# docker-compose.yml
services:
  app1:
    image: athlete-platform:1.0.0
    ports:
      - "3001:3000"
  
  app2:
    image: athlete-platform:1.0.0
    ports:
      - "3002:3000"
  
  app3:
    image: athlete-platform:1.0.0
    ports:
      - "3003:3000"
  
  nginx:
    image: nginx:latest
    # Load balancer configuration
```

### 8.2 Database Connection Pooling

```env
# .env.production
DATABASE_URL="postgresql://user:pass@localhost/db?schema=public&pool=20&idleTimeout=30000&connect_timeout=10"
```

### 8.3 Redis Cluster

For high availability:
```bash
# AWS ElastiCache cluster
# 3 shards x 2 replicas = 6 nodes
# Automatic failover and replication
```

## Step 9: Disaster Recovery

### 9.1 Database Backups

- Daily automated backups
- 30-day retention
- Monthly archival
- Cross-region replication
- Test restore procedures monthly

### 9.2 Secrets Recovery

- Store backup encryption keys securely
- Test secret recovery procedures
- Document secret rotation process

### 9.3 Rollback Procedures

```bash
# Rollback to previous version
docker pull ghcr.io/yourorg/athlete-platform:1.0.0-previous
docker-compose down
docker-compose up -d

# Database rollback (point-in-time recovery)
# PIT recovery window: last 7 days
```

## Step 10: Security Hardening

### 10.1 Firewall Rules

```bash
# Allow only necessary ports
- 443: HTTPS
- 80: HTTP (redirect to HTTPS)
- 22: SSH (from VPN/specific IPs only)
- 5432: PostgreSQL (internal only)
- 6379: Redis (internal only)
```

### 10.2 SSL/TLS Configuration

- TLS 1.2+ only
- Strong cipher suites
- HSTS enabled (max-age: 1 year)
- Certificate pinning (optional)

### 10.3 Rate Limiting

- API: 100 requests/15 minutes per IP
- Login: 5 attempts/15 minutes per IP
- Custom limits per endpoint

### 10.4 WAF Configuration (Cloudflare)

- Enable DDoS protection
- Enable Bot Management
- Configure rules for common attacks
- Enable rate limiting rules

## Monitoring Commands

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f app

# View specific service logs
docker-compose logs app | tail -100

# Access database
docker-compose exec postgres psql -U athlete_user -d athlete_platform

# Access Redis
docker-compose exec redis redis-cli -a password

# Health check
curl https://athlete-platform.example.com/api/health

# Performance monitoring
curl https://athlete-platform.example.com/api/metrics
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs

# Verify configuration
docker-compose config

# Validate environment variables
env | grep NEXTAUTH
```

### Database Connection Issues

```bash
# Test connection
psql postgresql://user:pass@host:5432/db

# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Monitor slow queries
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC;
```

### Memory/Performance Issues

```bash
# Monitor container resources
docker stats

# Check application memory usage
node --max-old-space-size=2048 (in Dockerfile)

# Enable profiling
npm run build:profile
```

## Support and Contact

- Documentation: https://github.com/yourorg/athlete-platform/wiki
- Issues: https://github.com/yourorg/athlete-platform/issues
- Email: support@athlete-platform.example.com
- Slack: #athlete-platform-deployment

---

**Last Updated**: 2024
**Maintained By**: DevOps Team
**Version**: 1.0.0
