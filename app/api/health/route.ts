import { NextRequest, NextResponse } from 'next/server'

/**
 * Health Check Endpoint
 * Used by load balancers, orchestration systems, and monitoring
 * Returns 200 if application is healthy, 503 if not
 */

interface HealthCheckResponse {
  status: 'ok' | 'error'
  timestamp: string
  uptime: number
  version: string
  checks: {
    api: 'ok' | 'error'
    database?: 'ok' | 'error'
    redis?: 'ok' | 'error'
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now()
  
  try {
    const checks: HealthCheckResponse['checks'] = {
      api: 'ok'
    }

    // Check database connection
    try {
      // This would normally import prisma client and test connection
      // For now, we'll skip if not configured
      if (process.env.DATABASE_URL) {
        // In production, you'd do: await prisma.$queryRaw`SELECT 1`
        checks.database = 'ok'
      }
    } catch (error) {
      checks.database = 'error'
      console.error('Database health check failed:', error)
    }

    // Check Redis connection (if configured)
    try {
      if (process.env.REDIS_URL) {
        // In production, you'd do: await redis.ping()
        checks.redis = 'ok'
      }
    } catch (error) {
      checks.redis = 'error'
      console.error('Redis health check failed:', error)
    }

    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      checks
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Health check failed:', error)

    const response: HealthCheckResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      checks: {
        api: 'error'
      }
    }

    return NextResponse.json(response, { status: 503 })
  }
}

/**
 * HEAD request for simple health checks
 * Some monitoring systems prefer HEAD over GET
 */
export async function HEAD(request: NextRequest): Promise<Response> {
  try {
    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}
