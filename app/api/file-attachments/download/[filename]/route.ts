import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'public/uploads')

// GET /api/file-attachments/download/[filename] - Download a file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  try {
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      )
    }

    const filepath = join(UPLOAD_DIR, filename)

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read and return file
    const fileBuffer = await readFile(filepath)

    // Set appropriate headers
    const response = new NextResponse(fileBuffer)
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    response.headers.set('Content-Type', 'application/octet-stream')

    return response
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
