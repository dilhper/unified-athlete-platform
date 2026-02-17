# Pre-Deployment Security Checklist

## Authentication & Authorization
- [ ] JWT secret is strong (32+ characters, generated with `openssl rand -base64 32`)
- [ ] NextAuth secrets configured and secured
- [ ] All passwords meet complexity requirements (12+ chars, mixed case, numbers, symbols)
- [ ] Default accounts removed or credentials changed
- [ ] Role-based access control (RBAC) tested for all 4 roles
- [ ] Token expiration set appropriately (15 minutes for access, 7 days for refresh)
- [ ] Refresh token rotation implemented
- [ ] Session timeout configured (30 minutes inactivity)
- [ ] API key rotation documented
- [ ] OAuth provider secrets secured

## Environment & Configuration
- [ ] .env.production file created with all required variables
- [ ] No secrets in code or git history
- [ ] Environment variables validated and tested
- [ ] Database connection string uses SSL/TLS
- [ ] Redis connection uses password and SSL/TLS
- [ ] NEXTAUTH_URL set correctly for production domain
- [ ] Feature flags reviewed and set appropriately
- [ ] Feature flags default to disabled (fail-safe)
- [ ] Rate limits configured per endpoint
- [ ] API timeouts set appropriately
- [ ] Database pool size optimized for load
- [ ] Redis maxmemory policy set to LRU eviction

## Database Security
- [ ] PostgreSQL user has minimal required permissions
- [ ] Database encrypted at rest (enabled by default or configured)
- [ ] Database encrypted in transit (SSL/TLS)
- [ ] Backup encryption configured
- [ ] Backup retention policy documented (30+ days minimum)
- [ ] Test restore procedure completed successfully
- [ ] Database indexes created on all foreign keys
- [ ] Database indexes created on frequently searched fields
- [ ] SQL injection prevention verified (using Prisma ORM)
- [ ] Parameterized queries in use (verified through Prisma)
- [ ] Sensitive data masked in logs
- [ ] Point-in-time recovery (PITR) window: 7+ days
- [ ] Cross-region replication configured (optional but recommended)

## API Security
- [ ] All inputs validated and sanitized
- [ ] SQL injection prevention tested
- [ ] Cross-Site Scripting (XSS) prevention enabled
- [ ] Cross-Site Request Forgery (CSRF) tokens implemented
- [ ] Rate limiting configured (100 req/15min per IP)
- [ ] Rate limiting for login attempts (5 per 15 minutes)
- [ ] API endpoints protected with authentication
- [ ] API endpoints protected with authorization
- [ ] API error messages don't leak sensitive information
- [ ] API version headers configured
- [ ] API documentation updated and secured
- [ ] Deprecated endpoints removed or marked clearly

## Transport Security
- [ ] SSL/TLS certificate obtained and installed (Let's Encrypt recommended)
- [ ] SSL/TLS certificate valid for all domains
- [ ] TLS 1.2+ enforced (TLS 1.3 preferred)
- [ ] Strong cipher suites configured
- [ ] Weak ciphers disabled
- [ ] HSTS header enabled (max-age: 31536000)
- [ ] HSTS preload list submission considered
- [ ] Certificate renewal automated (Certbot)
- [ ] Certificate expiration monitoring configured
- [ ] HTTP redirects to HTTPS
- [ ] Secure cookies (HttpOnly, Secure, SameSite=Strict)

## Application Security
- [ ] Security headers configured in middleware:
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-XSS-Protection: 1; mode=block
  - [ ] Content-Security-Policy configured
  - [ ] Strict-Transport-Security (HSTS)
  - [ ] Referrer-Policy: strict-origin-when-cross-origin
  - [ ] Permissions-Policy: disable all unnecessary features
- [ ] Content Security Policy (CSP) tested and working
- [ ] CSP violations logged and monitored
- [ ] CORS configured with origin whitelist (not *)
- [ ] CORS credentials handling secure
- [ ] File upload size limits enforced (10MB)
- [ ] File upload type validation (whitelist approach)
- [ ] File upload virus scanning configured (optional)
- [ ] Sensitive data not logged
- [ ] Debug mode disabled in production
- [ ] Source maps disabled in production

## Infrastructure Security
- [ ] Firewall rules configured (whitelist approach)
- [ ] Only necessary ports open (443, 80, 22 from VPN)
- [ ] Database port (5432) not exposed to internet
- [ ] Redis port (6379) not exposed to internet
- [ ] SSH key authentication enforced (no passwords)
- [ ] Root login disabled
- [ ] Sudo access restricted to necessary users
- [ ] Server updated with latest security patches
- [ ] Security updates configured to auto-install
- [ ] Intrusion detection/prevention system (IDS/IPS) configured
- [ ] Web Application Firewall (WAF) configured
- [ ] DDoS protection enabled (Cloudflare, AWS Shield, etc.)
- [ ] Load balancer health checks configured
- [ ] Load balancer HTTPS termination enabled
- [ ] Load balancer security groups configured

## Container Security
- [ ] Docker image built from minimal base (Alpine)
- [ ] Non-root user running application (nextjs:1001)
- [ ] Container runs with read-only root filesystem (where possible)
- [ ] No secrets in container image
- [ ] Container image vulnerability scanned (Trivy, Aqua)
- [ ] Image registry access controlled
- [ ] Image signing/verification implemented
- [ ] Container runtime security enabled (AppArmor/SELinux)
- [ ] Resource limits configured (CPU, memory)
- [ ] Health checks configured and tested
- [ ] Logging configured (stdout/stderr)
- [ ] Container restart policy appropriate

## Monitoring & Logging
- [ ] Application logging configured (Winston, Bunyan, or similar)
- [ ] Logs in structured JSON format
- [ ] Logs contain timestamp, level, message, context
- [ ] Sensitive data redacted from logs
- [ ] Log retention policy configured (30+ days)
- [ ] Log aggregation configured (ELK, DataDog, Splunk, etc.)
- [ ] Real-time alerting configured
- [ ] Error tracking configured (Sentry, Rollbar, etc.)
- [ ] Performance monitoring configured (New Relic, DataDog, etc.)
- [ ] Uptime monitoring configured (Datadog, Uptime Robot, etc.)
- [ ] Database monitoring configured
- [ ] Application metrics exported (/api/metrics endpoint)
- [ ] Health check endpoint accessible (/api/health)
- [ ] PagerDuty/incident management integrated
- [ ] Slack/email notifications configured for alerts
- [ ] Log analysis and dashboards created

## Deployment Process
- [ ] Deployment documentation complete and tested
- [ ] Deployment checklist created
- [ ] Rollback procedures documented and tested
- [ ] Canary deployment strategy planned (optional but recommended)
- [ ] Blue-green deployment strategy configured
- [ ] Database migration rollback tested
- [ ] Zero-downtime deployment configured (health checks, graceful shutdown)
- [ ] Deployment notifications configured
- [ ] Post-deployment verification steps documented
- [ ] Team trained on deployment procedures

## CI/CD Pipeline
- [ ] GitHub Actions workflows configured
- [ ] Build pipeline tests all code (unit, integration)
- [ ] Security scanning configured (SAST, dependency scanning)
- [ ] Container image scanning configured (Trivy)
- [ ] Automated deployment on main branch push
- [ ] Manual approval required for production deployment
- [ ] Deployment history logged
- [ ] Rollback automated or one-click
- [ ] CI/CD pipeline secrets secured
- [ ] CI/CD logs don't leak sensitive information

## Dependency Management
- [ ] All dependencies up-to-date
- [ ] Dependency security vulnerabilities scanned (npm audit, Snyk)
- [ ] Known vulnerable versions excluded
- [ ] Dependency updates automated (Dependabot, Renovate)
- [ ] Lock files committed to git (package-lock.json, pnpm-lock.yaml)
- [ ] Minimum Node.js version specified (18.x+)
- [ ] Deprecated packages removed
- [ ] Unused dependencies removed

## Backup & Disaster Recovery
- [ ] Database backups automated (daily)
- [ ] Database backup retention: 30+ days
- [ ] Database backup encryption enabled
- [ ] Database backup testing: monthly restore test
- [ ] Database backup location: off-site/cloud storage
- [ ] Secrets backup procedure documented
- [ ] Secrets backup testing completed
- [ ] Recovery Time Objective (RTO): documented
- [ ] Recovery Point Objective (RPO): documented
- [ ] Disaster recovery plan documented
- [ ] Disaster recovery drill completed (annually minimum)

## Third-Party Integrations
- [ ] SendGrid API key secured (not in code)
- [ ] Stripe API key secured (use webhook signing)
- [ ] AWS credentials secured (IAM roles for EC2)
- [ ] Database credentials secured (secrets manager)
- [ ] Third-party API rate limits understood
- [ ] Third-party API error handling implemented
- [ ] Third-party API SLAs reviewed
- [ ] Third-party API incidents monitored
- [ ] PCI-DSS compliance if handling payments (Stripe)
- [ ] GDPR compliance if handling EU user data

## Data Protection
- [ ] User data encrypted at rest
- [ ] User data encrypted in transit
- [ ] Personally identifiable information (PII) logged carefully
- [ ] User consent collected for data collection
- [ ] Data retention policy documented and enforced
- [ ] Right to be forgotten (GDPR) implemented
- [ ] Data export functionality available (GDPR)
- [ ] Sensitive data fields encrypted separately
- [ ] Encryption keys managed by KMS/Vault
- [ ] Encryption key rotation implemented

## Testing
- [ ] Unit tests pass (target: 80%+ coverage)
- [ ] Integration tests pass
- [ ] End-to-end tests pass
- [ ] Security tests pass (OWASP Top 10 coverage)
- [ ] Load testing completed (expected traffic + 2x buffer)
- [ ] Penetration testing completed (optional but recommended)
- [ ] Vulnerability scanning completed (SAST, DAST)
- [ ] Cross-browser testing completed
- [ ] Mobile device testing completed
- [ ] Accessibility testing completed (WCAG 2.1)

## Documentation
- [ ] Deployment guide complete
- [ ] Troubleshooting guide complete
- [ ] API documentation complete and accessible
- [ ] Architecture documentation complete
- [ ] Security documentation complete
- [ ] Incident response procedures documented
- [ ] Runbooks created for common operations
- [ ] Runbooks created for incident response
- [ ] Team training completed
- [ ] Documentation reviewed and approved

## Legal & Compliance
- [ ] Terms of Service reviewed and updated
- [ ] Privacy Policy reviewed and updated
- [ ] GDPR compliance verified (if applicable)
- [ ] CCPA compliance verified (if applicable)
- [ ] Data processing agreements signed
- [ ] Compliance audit scheduled
- [ ] Insurance coverage verified
- [ ] Liability limitations documented
- [ ] Cookie consent configured
- [ ] Analytics privacy compliance verified

## Final Review
- [ ] Security team review completed ✓
- [ ] DevOps team review completed ✓
- [ ] Product owner review completed ✓
- [ ] All critical items marked ✓
- [ ] All high-priority items marked ✓
- [ ] All medium-priority items marked ✓
- [ ] Outstanding items tracked with dates
- [ ] Deployment approval obtained
- [ ] Deployment scheduled
- [ ] Rollback plan ready
- [ ] Team on-call for deployment

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Reviewed By**: _______________
**Approved By**: _______________

**Notes/Issues**:
[Space for notes]

---

**Last Updated**: 2024
**Next Review**: [30 days after deployment]
