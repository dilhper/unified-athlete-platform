# Quick Reference - Production Deployment Card

## Pre-Deployment Checklist (15 minutes)

```bash
# ✅ Step 1: Environment Setup
cp .env.production .env.production.local
# Edit with production secrets:
# - DATABASE_URL
# - REDIS_URL  
# - NEXTAUTH_SECRET
# - SENTRY_DSN
# - All API keys

# ✅ Step 2: Verify Configuration
docker-compose config  # No errors?
env | grep DATABASE   # Variables set?

# ✅ Step 3: Build and Test
docker build -t athlete-platform:1.0.0 .
docker-compose up -d
curl http://localhost:3000/api/health  # Should return 200

# ✅ Step 4: Database Check
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "SELECT COUNT(*) FROM users;"

# ✅ Step 5: Test APIs
curl -X GET http://localhost:3000/api/users
curl -X GET http://localhost:3000/api/health

# ✅ Step 6: Cleanup
docker-compose down
```

## Deployment Steps (30 minutes)

```bash
# 1. SSH to production server
ssh -i /path/to/key user@production-server.com

# 2. Create deployment directory
mkdir -p /app/athlete-platform
cd /app/athlete-platform

# 3. Pull latest code
git clone https://github.com/yourorg/athlete-platform.git .
# OR
git pull origin main

# 4. Copy production files
cp .env.production .env  # Use secrets manager instead!
curl -o docker-compose.yml https://raw.githubusercontent.com/yourorg/athlete-platform/main/docker-compose.yml

# 5. Build and pull images
docker-compose pull
docker build -t athlete-platform:1.0.0 .
docker tag athlete-platform:1.0.0 ghcr.io/yourorg/athlete-platform:1.0.0
docker push ghcr.io/yourorg/athlete-platform:1.0.0

# 6. Start services
docker-compose up -d

# 7. Run migrations
docker-compose exec app npx prisma migrate deploy

# 8. Verify deployment
docker-compose ps  # All healthy?
curl https://athlete-platform.example.com/api/health
curl https://athlete-platform.example.com/api/users  # Login required

# 9. Monitor logs
docker-compose logs -f app
```

## Post-Deployment Verification (10 minutes)

```bash
# ✅ Health Check
curl -I https://athlete-platform.example.com/api/health
# Should return: HTTP/2 200

# ✅ Database Connected
curl https://athlete-platform.example.com/api/users
# Should return: 401 (not logged in, but connection works)

# ✅ SSL/TLS Valid
curl -vI https://athlete-platform.example.com
# Should show: TLS 1.2/1.3, no certificate errors

# ✅ Security Headers Present
curl -I https://athlete-platform.example.com/api/health
# Should include:
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Strict-Transport-Security: max-age=31536000

# ✅ Rate Limiting Working
for i in {1..105}; do curl https://athlete-platform.example.com/api/health; done
# Request 101+ should return 429 (Too Many Requests)

# ✅ Monitor Dashboard
# 1. Sentry: Check for any errors
# 2. Nginx access log: Check request patterns
# 3. Docker stats: Monitor memory/CPU
# 4. PostgreSQL: Check connection count
```

## If Something Goes Wrong

```bash
# 🔴 Service Won't Start
docker-compose logs app | tail -20
# Check: DATABASE_URL, REDIS_URL, API keys

# 🔴 High Error Rate
docker-compose logs app | grep ERROR | tail -10
# Check Sentry dashboard for specific errors

# 🔴 Database Connection Failed
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "SELECT 1;"
# Check: DATABASE_URL format, credentials, network access

# 🔴 SSL Certificate Invalid
openssl x509 -in /path/to/cert.pem -text -noout
# Renew: sudo certbot renew --force-renewal

# 🔴 Out of Memory
docker stats
# Increase memory: mem_limit: 2g in docker-compose.yml

# 🔴 Rate Limit Too Strict
# Edit .env: RATE_LIMIT_MAX_REQUESTS=200  (increase from 100)
# Restart: docker-compose restart app

# ROLLBACK (Last Resort)
docker pull athlete-platform:1.0.0-previous
docker-compose down
docker-compose up -d
```

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | __________ | __________ | __________ |
| Tech Lead | __________ | __________ | __________ |
| DevOps Lead | __________ | __________ | __________ |

## Quick Links

- **Health Check**: https://athlete-platform.example.com/api/health
- **Sentry Dashboard**: https://sentry.io/...
- **Nginx Logs**: `/var/log/nginx/athlete-platform-access.log`
- **App Logs**: `docker-compose logs app`
- **Documentation**: See DEPLOYMENT_GUIDE.md

## Critical Settings

```env
# Database
DATABASE_URL=postgresql://athlete_user:PASSWORD@postgres:5432/athlete_platform?pool=20

# Redis
REDIS_URL=redis://:PASSWORD@redis:6379

# NextAuth
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>
NEXTAUTH_URL=https://athlete-platform.example.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes

# Monitoring
SENTRY_DSN=https://key@sentry.io/projectid
NODE_ENV=production

# Feature Flags
ENABLE_REAL_TIME_MESSAGING=true
ENABLE_FILE_UPLOADS=true
ENABLE_NOTIFICATIONS=true
```

## Key Files

| File | Purpose | Location |
|------|---------|----------|
| `.env.production` | Production secrets | Root directory |
| `Dockerfile` | Container definition | Root directory |
| `docker-compose.yml` | Full stack orchestration | Root directory |
| `middleware.ts` | Security middleware | Root directory |
| `lib/security.ts` | Security utilities | lib/ directory |
| `app/api/health/route.ts` | Health check endpoint | app/api/ |
| `nginx.conf` | Reverse proxy config | Root directory |
| `DEPLOYMENT_GUIDE.md` | Full deployment guide | Documentation |
| `SECURITY_CHECKLIST.md` | Security verification | Documentation |
| `TROUBLESHOOTING_GUIDE.md` | Problem solutions | Documentation |

## Monitoring Commands

```bash
# Real-time logs
docker-compose logs -f app

# Container status
docker-compose ps

# Resource usage
docker stats

# Database health
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "SELECT NOW(), pg_database_size('athlete_platform');"

# Redis health
docker-compose exec redis redis-cli -a password INFO

# Last 50 errors
docker-compose logs app | grep ERROR | tail -50

# Performance stats
curl https://athlete-platform.example.com/api/metrics
```

## Backup & Recovery

```bash
# Daily backup (automated via cron)
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
aws s3 cp backup_*.sql.gz s3://athlete-backups/

# Restore from backup
gunzip backup_20241215.sql.gz
psql $DATABASE_URL < backup_20241215.sql
```

## Version Information

- **Node.js**: 18+
- **PostgreSQL**: 15
- **Redis**: 7
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Next.js**: 16.0.10

---

**Last Updated**: December 2024  
**Deployment Version**: 1.0.0  
**Maintain in**: War Room / Slack

*Keep printed copy in server room for emergency access*
