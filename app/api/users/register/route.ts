import { NextResponse } from 'next/server'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { hash } from 'bcryptjs'
import { query } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(req: Request) {
  try {
    let body: any = {}
    const contentType = req.headers.get('content-type') || ''

    // Handle both JSON and FormData
    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData()
        const document = formData.get('document') as File | null
        
        body = {
          email: formData.get('email') as string || undefined,
          phone: formData.get('phone') as string || undefined,
          name: formData.get('name') as string || undefined,
          role: formData.get('role') as string || undefined,
          password: formData.get('password') as string || undefined,
          athleteType: formData.get('athleteType') as string || undefined,
          location: formData.get('location') as string || undefined,
          yearsOfExperience: formData.get('yearsOfExperience') as string || undefined,
          document: document,
          documentType: formData.get('documentType') as string || undefined,
          sports: formData.get('sports') as string || undefined,
          schoolClub: formData.get('schoolClub') as string || undefined,
          dateOfBirth: formData.get('dateOfBirth') as string || undefined,
          nationalRanking: formData.get('nationalRanking') as string || undefined,
          district: formData.get('district') as string || undefined,
          trainingPlace: formData.get('trainingPlace') as string || undefined,
        }
      } catch (err) {
        console.error('FormData parsing error:', err)
        return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
      }
    } else {
      body = await req.json()
    }

    const {
      id,
      email,
      phone,
      name,
      role,
      password,
      athleteType,
      location,
      yearsOfExperience,
      document,
      documentType,
      sports: sportsString,
      schoolClub,
      dateOfBirth,
      nationalRanking,
      district,
      trainingPlace,
    } = body || {}

    // Parse sports if provided
    let sports: string[] = []
    if (sportsString && typeof sportsString === 'string') {
      try {
        sports = JSON.parse(sportsString)
      } catch (err) {
        console.warn('Failed to parse sports:', err)
      }
    }

    // Validate: must have name, role, password, and at least email or phone
    if (!name || !role || !password) {
      return NextResponse.json({ error: 'name, role, and password are required' }, { status: 400 })
    }

    if (!email && !phone) {
      return NextResponse.json({ error: 'email or phone number is required' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (role === 'official') {
      return NextResponse.json({ error: 'Official accounts must be provisioned by an admin' }, { status: 403 })
    }

    // Validate document submission for athlete/coach/specialist
    if (['athlete', 'coach', 'specialist'].includes(role) && !document) {
      return NextResponse.json({ error: `${role} registration requires document submission` }, { status: 400 })
    }

    const userId = id || randomUUID()
    const passwordHash = await hash(password, 10)

    // Create user first
    const result = await query(
      `INSERT INTO users (
        id,
        email,
        phone,
        name,
        role,
        password_hash,
        athlete_type,
        location,
        years_of_experience,
        sport,
        school_club,
        date_of_birth,
        national_ranking,
        district,
        training_place,
        profile_pending_verification,
        email_verified
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,false)
      RETURNING *`,
      [
        userId,
        email || null,
        phone || null,
        name,
        role,
        passwordHash || null,
        athleteType || null,
        location || null,
        yearsOfExperience || null,
        sports.length > 0 ? sports.join(',') : null,
        schoolClub || null,
        dateOfBirth || null,
        nationalRanking ? parseInt(nationalRanking) : null,
        district || null,
        trainingPlace || null,
      ]
    )

    // Handle document upload AFTER user is created
    let documentSubmissionId = null
    if (document && documentType) {
      documentSubmissionId = randomUUID()
      
      // Create documents directory if it doesn't exist
      const docsDir = join(process.cwd(), 'public', 'documents')
      if (!existsSync(docsDir)) {
        await mkdir(docsDir, { recursive: true })
      }

      // Save file
      const fileBuffer = await (document as any).arrayBuffer()
      const filename = `${userId}-${Date.now()}-${(document as any).name}`
      const filepath = join(docsDir, filename)
      
      await writeFile(filepath, Buffer.from(fileBuffer))

      // Record document submission (user now exists)
      await query(
        `INSERT INTO document_submissions (
          id, user_id, role, document_type, file_path, original_filename, file_size, mime_type, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [
          documentSubmissionId,
          userId,
          role,
          documentType,
          `/documents/${filename}`,
          (document as any).name,
          fileBuffer.byteLength,
          (document as any).type,
        ]
      )
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationTokenHash = createHash('sha256').update(verificationToken).digest('hex')
    const verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)

    await query(
      `INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at)
       VALUES ($1,$2,$3,$4)`,
      [userId, verificationTokenHash, 'email_verification', verificationExpiresAt]
    )

    const responsePayload: any = {
      user: result.rows[0],
      message: 'Registration successful. Please verify your email to continue.',
    }

    if (documentSubmissionId) {
      responsePayload.message = `Registration successful. Your ${documentType} has been submitted for verification.`
      responsePayload.documentSubmissionId = documentSubmissionId
    }

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.verificationToken = verificationToken
    }

    return NextResponse.json(responsePayload)
  } catch (error: any) {
    console.error('Registration error:', {
      code: error?.code,
      constraint: error?.constraint,
      message: error?.message,
      stack: error?.stack,
    })

    if (error?.code === '23505') {
      if (error.constraint === 'idx_users_email_unique') {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      } else if (error.constraint?.includes('phone')) {
        return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Account already exists with this email or phone' }, { status: 409 })
    }
    
    return NextResponse.json({ error: error?.message || 'Failed to register user' }, { status: 500 })
  }
}
