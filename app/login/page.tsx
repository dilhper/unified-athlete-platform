'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dumbbell, Shield, Stethoscope, Users } from 'lucide-react'

const roles = [
  { value: 'athlete', label: 'Athlete', icon: <Dumbbell className="h-5 w-5" />, description: 'Track training and achievements' },
  { value: 'coach', label: 'Coach', icon: <Users className="h-5 w-5" />, description: 'Manage athletes and training plans' },
  { value: 'official', label: 'Official', icon: <Shield className="h-5 w-5" />, description: 'Verify achievements and manage access' },
  { value: 'specialist', label: 'Specialist', icon: <Stethoscope className="h-5 w-5" />, description: 'Provide consultations and support' },
]

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('athlete')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        const from = searchParams.get('from') || `/${selectedRole}`
        router.push(from)
        router.refresh()
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 border-r border-gray-800">
        <div className="flex flex-col justify-center px-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white text-gray-900 flex items-center justify-center text-sm font-bold">
              UA
            </div>
            <span className="text-sm font-semibold text-gray-300">Unified Athlete</span>
          </div>
          <div className="text-4xl font-bold text-white">Unified Athlete</div>
          <p className="mt-3 text-lg text-gray-300">
            Sign in to manage your athletic journey.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800 text-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label className="text-foreground">Select Role</Label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`relative p-3 rounded-lg border transition-all text-left ${
                      selectedRole === role.value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-card hover:border-muted-foreground'
                    }`}
                  >
                    <div className={`mb-2 ${selectedRole === role.value ? 'text-primary' : 'text-muted-foreground'}`}>
                      {role.icon}
                    </div>
                    <div className="font-medium text-foreground text-sm">{role.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{role.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="athlete@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-gray-300">
              Don't have an account?{' '}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-semibold"
                onClick={() => router.push('/register')}
              >
                Register
              </Button>
            </p>
            <div className="text-xs text-center text-gray-400 space-y-1">
              <p className="font-semibold">Demo accounts:</p>
              <p>john.smith@athlete.com / password123</p>
              <p>david.martinez@coach.com / password123</p>
            </div>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  )
}
