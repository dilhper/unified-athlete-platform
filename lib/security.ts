import { NextRequest, NextResponse } from 'next/server'

/**
 * Security Middleware - Handles headers, CORS, and rate limiting
 * Applied via next.config.js
 */

const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || (process.env.NODE_ENV === 'production' ? '900000' : '3600000')) // 15 min (prod) or 1 hour (dev)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'production' ? '100' : '500')) // 100 (prod) or 500 (dev)

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse) {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  )
  
  // HSTS - Enforce HTTPS (production only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

/**
 * Add CORS headers
 */
export function addCorsHeaders(request: NextRequest, response: NextResponse) {
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ].filter(Boolean)
  
  const origin = request.headers.get('origin')
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-CSRF-Token, X-Requested-With'
    )
  }
  
  return response
}

/**
 * Check rate limit for IP address
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const limitData = rateLimitStore.get(ip)
  
  if (limitData && now < limitData.resetTime) {
    const allowed = limitData.count < RATE_LIMIT_MAX
    const remaining = Math.max(0, RATE_LIMIT_MAX - limitData.count)
    
    if (allowed) {
      limitData.count++
    }
    
    return { allowed, remaining, resetTime: limitData.resetTime }
  }
  
  const resetTime = now + RATE_LIMIT_WINDOW
  rateLimitStore.set(ip, { count: 1, resetTime })
  
  return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetTime }
}

/**
 * Clean up old rate limit entries (run periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now()
  const entriesToDelete: string[] = []
  
  for (const [ip, data] of rateLimitStore) {
    if (now > data.resetTime) {
      entriesToDelete.push(ip)
    }
  }
  
  entriesToDelete.forEach(ip => rateLimitStore.delete(ip))
}

// Clean up old entries every hour
if (process.env.NODE_ENV === 'production') {
  setInterval(cleanupRateLimitStore, 3600000)
}
