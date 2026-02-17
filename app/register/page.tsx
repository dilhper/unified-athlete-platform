'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dumbbell, Stethoscope, Users, Upload } from 'lucide-react'

const roles = [
  { value: 'athlete', label: 'Athlete', icon: <Dumbbell className="h-5 w-5" />, description: 'Track training and achievements' },
  { value: 'coach', label: 'Coach', icon: <Users className="h-5 w-5" />, description: 'Manage athletes and training plans' },
  { value: 'specialist', label: 'Specialist', icon: <Stethoscope className="h-5 w-5" />, description: 'Provide consultations and support' },
]

const documentTypes = {
  athlete: [
    { value: 'training_history', label: 'Training History/Certificate' },
    { value: 'medical_clearance', label: 'Medical Clearance' },
    { value: 'previous_achievements', label: 'Previous Achievements' },
  ],
  coach: [
    { value: 'coaching_license', label: 'Coaching License/Certification' },
    { value: 'credentials', label: 'Professional Credentials' },
    { value: 'background_check', label: 'Background Check' },
  ],
  specialist: [
    { value: 'license', label: 'Professional License' },
    { value: 'certifications', label: 'Certifications' },
    { value: 'credentials', label: 'Credentials' },
  ],
}

const sports = [
  'Football/Soccer',
  'Basketball',
  'Tennis',
  'Volleyball',
  'Swimming',
  'Athletics',
  'Cricket',
  'Badminton',
  'Golf',
  'Gymnastics',
  'Cycling',
  'Running',
  'Weightlifting',
  'Martial Arts',
  'Hockey',
]

const availableSports = sports

export default function RegisterPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'athlete' | 'coach' | 'specialist'>('athlete')
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  const [documentType, setDocumentType] = useState<string>('training_history')
  const [document, setDocument] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [verificationToken, setVerificationToken] = useState('')

  const needsDocument = (r: string) => ['athlete', 'coach', 'specialist'].includes(r)
  const hasSports = (r: string) => ['athlete', 'coach'].includes(r)

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB')
        return
      }
      setDocument(file)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setVerificationToken('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!email && !phone) {
      setError('Email or phone number is required')
      setLoading(false)
      return
    }

    if (needsDocument(role) && !document) {
      const roleLabel = role === 'specialist' ? 'Specialist' : role === 'coach' ? 'Coach' : 'Athlete'
      setError(`${roleLabel} registration requires document submission`)
      setLoading(false)
      return
    }

    try {
      if (needsDocument(role) && document) {
        // Use FormData for file upload
        const formData = new FormData()
        formData.append('name', name)
        if (email) formData.append('email', email)
        if (phone) formData.append('phone', phone)
        formData.append('role', role)
        formData.append('password', password)
        formData.append('document', document)
        formData.append('documentType', documentType)
        if (selectedSports.length > 0) formData.append('sports', JSON.stringify(selectedSports))

        const res = await fetch('/api/users/register', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Registration failed')
          return
        }

        setSuccess(data.message || 'Registration successful. Check your email to verify your account.')
        if (data.verificationToken) {
          setVerificationToken(data.verificationToken)
        }
      } else {
        // Use JSON for coach registration (no document required)
        const res = await fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name, 
            ...(email && { email }),
            ...(phone && { phone }),
            role, 
            password 
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Registration failed')
          return
        }

        setSuccess(data.message || 'Registration successful. Check your email to verify your account.')
        if (data.verificationToken) {
          setVerificationToken(data.verificationToken)
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Role Selection */}
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Create an account</h1>
          <p className="text-center text-gray-600 mb-6">Select your role first</p>
          
          <div className="grid grid-cols-3 gap-3">
            {roles.map((roleOption) => (
              <button
                key={roleOption.value}
                type="button"
                onClick={() => {
                  setRole(roleOption.value as 'athlete' | 'coach' | 'specialist')
                  setDocument(null)
                  setSelectedSports([])
                  setDocumentType(documentTypes[roleOption.value as 'athlete' | 'coach' | 'specialist']?.[0]?.value || 'training_history')
                }}
                className={`relative p-4 rounded-lg border transition-all text-center ${
                  role === roleOption.value
                    ? 'border-primary bg-primary/10 ring-2 ring-primary'
                    : 'border-border bg-card hover:border-muted-foreground'
                }`}
                disabled={loading}
              >
                <div className={`mb-3 flex justify-center ${role === roleOption.value ? 'text-primary' : 'text-muted-foreground'}`}>
                  {roleOption.icon}
                </div>
                <div className="font-semibold text-foreground text-sm">{roleOption.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{roleOption.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Enter your details</CardTitle>
            <CardDescription>
              Complete your {role} profile
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              {verificationToken && (
                <Alert>
                  <AlertDescription>
                    Dev token: {verificationToken}
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional - use phone if no email)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional - use email if no phone)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                />
              </div>

              {hasSports(role) && (
                <div className="space-y-2">
                  <Label>Select your sport(s)</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {availableSports.map((sport) => (
                      <label key={sport} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSports.includes(sport)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSports([...selectedSports, sport])
                            } else {
                              setSelectedSports(selectedSports.filter((s) => s !== sport))
                            }
                          }}
                          disabled={loading}
                          className="rounded"
                        />
                        <span className="text-sm">{sport}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {needsDocument(role) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Document Type</Label>
                    <select
                      id="documentType"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                    >
                    {(documentTypes[role as 'athlete' | 'coach' | 'specialist'] || []).map((doc) => (
                        <option key={doc.value} value={doc.value}>
                          {doc.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">Upload Document (PDF, JPG, PNG - Max 10MB)</Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                    >
                      <input
                        ref={fileInputRef}
                        id="document"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleDocumentChange}
                        disabled={loading}
                        className="hidden"
                      />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        {document ? document.name : 'Click to upload or drag and drop'}
                      </p>
                      {document && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(document.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading || !!success}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => router.push('/login')}
                >
                  Sign in
                </Button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
