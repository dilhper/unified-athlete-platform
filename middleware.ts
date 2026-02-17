import { NextResponse, NextRequest } from 'next/server'
import { addSecurityHeaders, addCorsHeaders, checkRateLimit } from '@/lib/security'

export const config = {
  matcher: [
    '/athlete/:path*',
    '/coach/:path*',
    '/specialist/:path*',
    '/official/:path*',
    '/settings/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    '/api/:path*',
  ],
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  return request.ip || 'unknown'
}

/**
 * Enhanced middleware with security features
 */
export default async function middleware(request: NextRequest) {
  // Skip security checks for auth and health endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth') || 
      request.nextUrl.pathname === '/api/health' ||
      request.nextUrl.pathname.startsWith('/api/users/register') ||
      request.nextUrl.pathname.startsWith('/api/users/verify-email') ||
      request.nextUrl.pathname.startsWith('/api/auth/password-reset')) {
    return NextResponse.next()
  }

  let response = NextResponse.next()

  // Add security headers
  response = addSecurityHeaders(response)

  // Add CORS headers
  response = addCorsHeaders(request, response)

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response
  }

  // Rate limiting for API routes (but not for auth/registration endpoints)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientIp = getClientIp(request)
    const rateLimitCheck = checkRateLimit(clientIp)

    if (!rateLimitCheck.allowed) {
      const errorResponse = NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      )

      errorResponse.headers.set('Retry-After', String(Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)))
      return errorResponse
    }

    // Add rate limit info to response headers
    response.headers.set('X-RateLimit-Limit', String(process.env.RATE_LIMIT_MAX_REQUESTS || '100'))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitCheck.remaining))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitCheck.resetTime / 1000)))
  }

  // Request logging
  if (process.env.VERBOSE_LOGGING === 'true') {
    const log = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent')
    }
    console.log(JSON.stringify(log))
  }

  return response
}
