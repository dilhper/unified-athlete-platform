# Production Troubleshooting Guide

## Common Issues and Solutions

### Application Issues

#### 1. Application Won't Start

**Symptoms**: 
- Docker container exits immediately
- `Error: listen EADDRINUSE :::3000` in logs

**Solutions**:

```bash
# Check container logs
docker-compose logs app

# Check if port is in use
sudo lsof -i :3000

# Kill process using port
sudo kill -9 <PID>

# Verify environment variables
docker-compose config | grep NODE_ENV

# Check Dockerfile CMD
docker inspect --format='{{json .Config.Cmd}}' app-image
```

#### 2. Out of Memory (OOM)

**Symptoms**:
- `JavaScript heap out of memory`
- Application crashes after some time
- `Cannot allocate memory`

**Solutions**:

```bash
# Check current memory usage
docker stats app

# Increase memory limit in docker-compose.yml
services:
  app:
    mem_limit: 2g  # Increase from 1g

# Enable Node.js memory snapshotting
NODE_OPTIONS="--max-old-space-size=2048"

# Find memory leaks
npm install -g clinic
clinic doctor -- node dist/server.js
```

#### 3. High CPU Usage

**Symptoms**:
- Application consuming 100% CPU
- `docker stats` shows high %CPU
- Slow response times

**Solutions**:

```bash
# Identify CPU bottleneck
npm run build:profile

# Check for infinite loops
# Check for blocking operations (use async)
# Use profiler
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Scale horizontally
# Add more app instances in docker-compose.yml
```

#### 4. Slow Response Times

**Symptoms**:
- Response times > 1 second
- Timeout errors from clients
- Database queries taking long time

**Solutions**:

```bash
# Check database query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = ?;

# Add missing indexes
CREATE INDEX idx_users_email ON users(email);

# Check Redis connectivity
docker-compose exec redis redis-cli --latency

# Enable query logging
LOG_LEVEL=debug npm run start

# Use APM tools
npm install @newrelic/node-agent
```

### Database Issues

#### 5. Database Connection Pool Exhausted

**Symptoms**:
- `Error: connect ECONNREFUSED`
- `Unable to connect to database`
- `Too many connections`

**Solutions**:

```bash
# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check connection pool size in .env
DATABASE_URL="...?pool=20"  # Increase from default

# Kill long-running connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE pid <> pg_backend_pid() AND state = 'idle' AND state_change < now() - interval '10 min';

# Verify docker-compose postgres service
docker-compose logs postgres
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "SELECT count(*) FROM pg_stat_activity;"
```

#### 6. Database Disk Full

**Symptoms**:
- `Error: No space left on device`
- Database write failures
- Application crashes

**Solutions**:

```bash
# Check disk usage
df -h
docker exec postgres du -sh /var/lib/postgresql/data

# Vacuum database (cleanup dead rows)
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "VACUUM FULL;"

# Clean old logs
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0');"

# Backup and restore (in smaller chunks)
pg_dump --no-privileges --no-owner | gzip > backup.sql.gz

# Expand storage
# For cloud databases: Modify database storage size
# For self-hosted: Expand underlying filesystem
```

#### 7. Slow Database Queries

**Symptoms**:
- Application hangs
- Response times spike
- High database CPU usage

**Solutions**:

```bash
# Check slow query log
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "
SELECT query, calls, mean_exec_time, max_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"

# Create missing indexes
EXPLAIN ANALYZE SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC;

# Update Prisma query strategy
// Avoid N+1 queries - use include/select
const messages = await prisma.message.findMany({
  include: { sender: true, room: true },
  take: 20,
  orderBy: { createdAt: 'desc' }
});

# Monitor with Query Insights
# AWS RDS: Use Performance Insights
# Google Cloud SQL: Use Cloud Trace
```

### Redis Issues

#### 8. Redis Connection Failed

**Symptoms**:
- `Error: connect ECONNREFUSED 127.0.0.1:6379`
- `Redis connection timeout`
- Sessions not persisting

**Solutions**:

```bash
# Check Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli -a password ping

# Verify REDIS_URL in .env
echo $REDIS_URL

# Connect to Redis CLI
docker-compose exec redis redis-cli -a password
```

#### 9. Redis Memory Full

**Symptoms**:
- `Error: OOM command not allowed when used memory > 'maxmemory'`
- `Cannot set key`
- Cache not working

**Solutions**:

```bash
# Check Redis memory usage
docker-compose exec redis redis-cli -a password INFO memory

# Set memory limit in docker-compose.yml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

# Monitor Redis keys
docker-compose exec redis redis-cli -a password KEYS '*' | wc -l

# Clear cache (if safe)
docker-compose exec redis redis-cli -a password FLUSHDB
```

#### 10. Session Data Lost

**Symptoms**:
- Users logged out unexpectedly
- Session not found errors
- Redis container restarted

**Solutions**:

```bash
# Check session store
docker-compose exec redis redis-cli -a password KEYS 'session:*' | head

# Check session expiration
docker-compose exec redis redis-cli -a password TTL <session-key>

# Verify session configuration in app
SESSION_SECRET=<generate-new-value>
SESSION_TIMEOUT=1800  # 30 minutes

# Enable session persistence
redis:
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes --appendfsync everysec

# Configure session redundancy
# Add Redis replication or cluster
```

### Network Issues

#### 11. Connection Timeout

**Symptoms**:
- `ECONNREFUSED` errors
- `ETIMEDOUT` errors
- Services can't reach each other

**Solutions**:

```bash
# Check docker network
docker network ls
docker network inspect athlete_network

# Verify service connectivity
docker-compose exec app ping postgres
docker-compose exec app ping redis

# Check DNS resolution
docker-compose exec app nslookup postgres

# Verify service hostnames in connection strings
# Use service names: postgresql://athlete_user:pass@postgres:5432/db

# Check firewall rules
sudo iptables -L -n | grep 5432
```

#### 12. CORS Errors

**Symptoms**:
- Browser console: `Cross-Origin Request Blocked`
- `Access-Control-Allow-Origin` header missing
- API calls fail from frontend

**Solutions**:

```bash
# Check CORS configuration in middleware.ts
// Verify NEXTAUTH_URL matches domain
NEXTAUTH_URL=https://athlete-platform.example.com

// Check allowed origins list
const allowedOrigins = [
  process.env.NEXTAUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
]

# Test CORS headers
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://athlete-platform.example.com/api/users

# Check nginx CORS headers
curl -I https://athlete-platform.example.com/api/users
# Should see: Access-Control-Allow-Origin header
```

### SSL/TLS Issues

#### 13. SSL Certificate Error

**Symptoms**:
- Browser warning: `Your connection is not private`
- `NET::ERR_CERT_AUTHORITY_INVALID`
- Certificate validation failures

**Solutions**:

```bash
# Check certificate validity
openssl x509 -in /path/to/cert.pem -text -noout

# Check certificate expiration
openssl x509 -enddate -noout -in /path/to/cert.pem

# Renew certificate
sudo certbot renew --force-renewal

# Verify certificate chain
openssl verify -CAfile /path/to/chain.pem /path/to/cert.pem

# Check nginx SSL configuration
sudo nginx -t

# Test SSL
curl -vI https://athlete-platform.example.com
```

#### 14. Mixed Content Warning

**Symptoms**:
- Browser console: `Mixed Content: The page was loaded over HTTPS...`
- Some resources loaded over HTTP
- Images/scripts not loading

**Solutions**:

```bash
# Ensure all assets use HTTPS
// In html/jsx
<img src="https://..." />  // Not http://

# Configure automatic HTTPS upgrade in middleware
// Add HTTPS redirect
return NextResponse.redirect(new URL(`https://${host}${pathname}`, request.url))

# Check nginx configuration
# Verify HTTP redirects to HTTPS
```

### Monitoring & Logging Issues

#### 15. Logs Not Appearing

**Symptoms**:
- `docker-compose logs` shows nothing
- Logging is not working
- No application output

**Solutions**:

```bash
# Check logging configuration
docker-compose exec app env | grep LOG

# View full logs
docker-compose logs --no-log-prefix -f

# Check if stdout/stderr are captured
docker-compose exec app tail -f /proc/1/fd/1

# Verify Winston/Bunyan configuration
// Check lib/logger.ts configuration

# Enable debug logging
LOG_LEVEL=debug npm run start

# Check log volume mounts
docker-compose exec app ls -la /app/logs/
```

#### 16. Monitoring/Sentry Not Receiving Data

**Symptoms**:
- Sentry shows no errors
- Errors not tracked in monitoring
- Health check endpoint returns errors

**Solutions**:

```bash
# Check Sentry DSN
docker-compose config | grep SENTRY

# Verify error reporting middleware
grep -r "Sentry.captureException" app/

# Test Sentry connectivity
npm install @sentry/cli
sentry-cli releases list

# Check network connectivity to Sentry
docker-compose exec app curl -I https://sentry.io/

# Enable Sentry debug mode
SENTRY_DEBUG=true npm run start
```

### Performance Issues

#### 17. High Latency / Slow API

**Symptoms**:
- API responses > 1s
- Consistent slowness across all endpoints
- High database/Redis usage

**Solutions**:

```bash
# Profile requests
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/api/endpoint

# Check network latency
ping postgres
ping redis

# Enable tracing
npm install @opentelemetry/api @opentelemetry/sdk-node

# Monitor resource usage
docker stats

# Enable caching
// Use Redis for frequently accessed data
const cached = await redis.get(`user:${userId}`)

# Add CDN for static assets
# Cloudflare, AWS CloudFront, etc.
```

#### 18. Container Keeps Restarting

**Symptoms**:
- `docker-compose ps` shows "Restarting"`
- Service never stays healthy
- Logs show repeated errors

**Solutions**:

```bash
# Check restart policy
docker inspect app | grep RestartPolicy

# View last few lines of logs
docker-compose logs --tail 50 app

# Check exit code
docker ps -a | grep app

# Test command locally
docker run --rm -it athlete-platform:1.0.0 npm run start

# Adjust restart policy if needed
services:
  app:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

## Diagnostic Commands

### Docker/Container Diagnostics

```bash
# View container logs with timestamps
docker-compose logs --timestamps app

# Follow logs in real-time
docker-compose logs -f --tail 100

# Check container resource usage
docker stats

# Inspect container configuration
docker inspect app | jq '.Config'

# View container processes
docker top app

# Execute command in running container
docker-compose exec app ps aux

# Check container networking
docker network inspect athlete_network

# View docker events
docker events --filter 'service=app'
```

### Database Diagnostics

```bash
# Connect to database
docker-compose exec postgres psql -U athlete_user -d athlete_platform

# Common PostgreSQL commands
SELECT version();  -- Check version
SELECT pg_database_size('athlete_platform');  -- Check size
SELECT pg_stat_database;  -- Database statistics
SELECT * FROM pg_stat_activity;  -- Active connections
SELECT * FROM pg_stat_statements;  -- Query statistics

# View slow queries
SELECT query, calls, mean_time, max_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Redis Diagnostics

```bash
# Connect to Redis
docker-compose exec redis redis-cli -a password

# Redis info command
INFO
INFO server
INFO clients
INFO memory
INFO stats

# View all keys
KEYS *

# View key details
TTL <key>
TYPE <key>
GET <key>

# Monitor Redis commands in real-time
MONITOR

# Check memory usage by key pattern
SCAN 0 MATCH "session:*" COUNT 1000
```

### Network Diagnostics

```bash
# Test DNS resolution
docker-compose exec app nslookup postgres
docker-compose exec app getent hosts postgres

# Check connectivity between services
docker-compose exec app ping postgres
docker-compose exec app curl http://postgres:5432

# View network interfaces
docker-compose exec app ip addr show

# Check routing
docker-compose exec app ip route show
```

## Recovery Procedures

### Database Recovery from Backup

```bash
# Stop application
docker-compose down

# Restore from backup
psql postgresql://athlete_user:password@localhost/athlete_platform < backup.sql

# Verify recovery
docker-compose exec postgres psql -U athlete_user -d athlete_platform -c "SELECT COUNT(*) FROM users;"

# Start application
docker-compose up -d
```

### Complete System Reset (WARNING: Data Loss)

```bash
# Stop all services
docker-compose down --volumes

# WARNING: This deletes all data!
# Only use in development or with proper backup

# Remove Docker images
docker rmi athlete-platform:1.0.0

# Start fresh
docker-compose up -d
```

### Emergency Rollback

```bash
# If current version is broken
docker-compose down
docker pull athlete-platform:1.0.0-previous
docker-compose up -d

# Rollback database (if applicable)
# Use PITR (Point-in-Time Recovery) from backups
```

---

**Last Updated**: 2024
**Maintained By**: DevOps Team
**Emergency Contact**: on-call@athlete-platform.com
