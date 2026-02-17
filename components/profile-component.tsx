'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { AchievementScoringCriteria } from '@/components/achievement-scoring-criteria'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  bio?: string
  phone?: string
  location?: string
  rating?: number
  sport?: string
  createdAt: string
}

interface EditingState {
  name: string
  bio: string
  phone: string
  location: string
}

export function ProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [ratingBreakdown, setRatingBreakdown] = useState({ achievement: 0, performance: 0, hybrid: 0 })
  const [editing, setEditing] = useState(false)
  const [editingData, setEditingData] = useState<EditingState>({
    name: '',
    bio: '',
    phone: '',
    location: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/users?role=athlete&limit=1', { cache: 'no-store' })
        const data = await res.json()
        const user = data.users?.[0] || null

        if (!user?.id) {
          setIsLoading(false)
          return
        }

        const detailRes = await fetch(`/api/users/${user.id}`, { cache: 'no-store' })
        const detailData = await detailRes.json()
        const detailUser = detailData.user || user

        const profileData = {
          ...detailUser,
          phone: detailUser.phone || '',
          location: detailUser.location || '',
          createdAt: detailUser.created_at || new Date().toISOString(),
        }

        setProfile(profileData)
        setRatingBreakdown({
          achievement: 0,
          performance: 0,
          hybrid: detailUser.rating || 0,
        })
        setEditingData({
          name: detailUser.name,
          bio: detailUser.bio || '',
          phone: detailUser.phone || '',
          location: detailUser.location || '',
        })
      } catch (err) {
        console.error('Error loading profile:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleSaveProfile = async () => {
    if (!profile) return

    try {
      setIsSaving(true)
      setError('')
      setSuccess('')

      await fetch(`/api/users/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingData.name,
          bio: editingData.bio,
        }),
      })

      // Update local profile state
      setProfile({
        ...profile,
        name: editingData.name,
        bio: editingData.bio,
        phone: editingData.phone,
        location: editingData.location,
      })

      setSuccess('Profile updated successfully')
      setEditing(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('An error occurred while saving')
      console.error('Error saving profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Profile not found</CardTitle>
          <CardDescription>Unable to load your profile information</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Avatar and Name */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar} />
                <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                {editing ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editingData.name}
                      onChange={(e) =>
                        setEditingData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      disabled={isSaving}
                      className="max-w-xs"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                      {profile.rating && (
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                          <span className="text-yellow-600 dark:text-yellow-400">★</span>
                          <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                            {profile.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">{profile.role}</p>
                    {profile.sport && (
                      <p className="text-sm text-primary font-medium">{profile.sport}</p>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            {!editing && (
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
                disabled={isSaving}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardHeader className="py-3 px-4">
            <div className="flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardHeader>
        </Card>
      )}

      {success && (
        <Card className="bg-green-50/50 border-green-200/50">
          <CardHeader className="py-3 px-4">
            <div className="flex gap-3 items-start">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Bio and Details */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editingData.bio}
                  onChange={(e) =>
                    setEditingData((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  disabled={isSaving}
                  placeholder="Tell us about yourself..."
                  className="max-w-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editingData.phone}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    disabled={isSaving}
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editingData.location}
                    onChange={(e) =>
                      setEditingData((prev) => ({ ...prev, location: e.target.value }))
                    }
                    disabled={isSaving}
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="bg-primary"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    setEditingData({
                      name: profile.name,
                      bio: profile.bio || '',
                      phone: profile.phone || '',
                      location: profile.location || '',
                    })
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Bio</h3>
                <p className="text-muted-foreground">
                  {profile.bio || 'No bio added yet'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {profile.phone && (
                  <div>
                    <h4 className="font-semibold text-foreground text-sm mb-1">
                      Phone
                    </h4>
                    <p className="text-muted-foreground text-sm">{profile.phone}</p>
                  </div>
                )}

                {profile.location && (
                  <div>
                    <h4 className="font-semibold text-foreground text-sm mb-1">
                      Location
                    </h4>
                    <p className="text-muted-foreground text-sm">{profile.location}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Role</h4>
              <p className="text-muted-foreground text-sm capitalize">{profile.role}</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Email</h4>
              <p className="text-muted-foreground text-sm">{profile.email}</p>
            </div>
            {profile.sport && (
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Sport</h4>
                <p className="text-muted-foreground text-sm">{profile.sport}</p>
              </div>
            )}
            {profile.rating && (
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Performance Rating</h4>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-600 dark:text-yellow-400">★</span>
                  <p className="text-muted-foreground text-sm font-semibold">
                    {profile.rating.toFixed(1)} / 5.0
                  </p>
                </div>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Joined</h4>
              <p className="text-muted-foreground text-sm">
                {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Breakdown */}
      {profile.role === 'athlete' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Rating Breakdown</CardTitle>
            <CardDescription>
              Your rating is calculated using two metrics: achievements and training performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Achievement-Based Rating */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Achievement-Based</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average score from verified achievements
                    </p>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400">📜</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {ratingBreakdown.achievement.toFixed(1)}
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">★</span>
                </div>
              </div>

              {/* Performance-Based Rating */}
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Performance-Based</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Training completion rate × 5
                    </p>
                  </div>
                  <span className="text-green-600 dark:text-green-400">🏋️</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {ratingBreakdown.performance.toFixed(1)}
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">★</span>
                </div>
              </div>

              {/* Hybrid Rating */}
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">Overall Rating</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average of both metrics
                    </p>
                  </div>
                  <span className="text-purple-600 dark:text-purple-400">⭐</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {ratingBreakdown.hybrid.toFixed(1)}
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">★</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-secondary rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-2">Calculation Details:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Achievement-Based:</strong> Verified achievements scored by category (Competition/Award: 5pts, Performance: 4pts, Training: 3pts)</li>
                <li><strong>Performance-Based:</strong> Percentage of completed training sessions multiplied by 5</li>
                <li><strong>Overall:</strong> Average of both ratings (0.0 - 5.0 scale)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Scoring Criteria Section */}
      <div className="mt-8">
        <AchievementScoringCriteria />
      </div>
    </div>
  )
}
