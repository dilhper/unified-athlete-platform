'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle, Loader, Edit, Upload } from 'lucide-react'
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
  athlete_type?: string
  school_club?: string
  date_of_birth?: string
  national_ranking?: number
  district?: string
  training_place?: string
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
  
  // Profile change request state
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false)
  const [athleteProfile, setAthleteProfile] = useState({
    athleteType: '',
    schoolClub: '',
    dateOfBirth: '',
    nationalRanking: '',
    district: '',
    trainingPlace: '',
  })
  const [changeReason, setChangeReason] = useState('')
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        const data = await res.json()
        
        if (!res.ok || !data.user) {
          setIsLoading(false)
          return
        }
        
        const detailUser = data.user

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
        
        // Load athlete-specific fields
        if (detailUser.role === 'athlete') {
          setAthleteProfile({
            athleteType: detailUser.athlete_type || '',
            schoolClub: detailUser.school_club || '',
            dateOfBirth: detailUser.date_of_birth || '',
            nationalRanking: detailUser.national_ranking?.toString() || '',
            district: detailUser.district || '',
            trainingPlace: detailUser.training_place || '',
          })
        }
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
  
  const handleSubmitProfileChangeRequest = async () => {
    if (!changeReason.trim() || !supportingDocument || !profile) {
      setError('Please provide a reason and upload a supporting document.')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError('')
      setSuccess('')
      
      const formData = new FormData()
      formData.append('userId', profile.id)
      formData.append('requestedChanges', JSON.stringify({
        athleteType: athleteProfile.athleteType,
        schoolClub: athleteProfile.schoolClub,
        dateOfBirth: athleteProfile.dateOfBirth,
        nationalRanking: athleteProfile.nationalRanking ? parseInt(athleteProfile.nationalRanking) : null,
        district: athleteProfile.district,
        trainingPlace: athleteProfile.trainingPlace,
      }))
      formData.append('reason', changeReason)
      formData.append('document', supportingDocument)
      
      const res = await fetch('/api/profile-change-requests', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit request')
      }
      
      setSuccess('Profile change request submitted successfully! It will be reviewed by an official.')
      setShowChangeRequestDialog(false)
      setChangeReason('')
      setSupportingDocument(null)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit profile change request')
      console.error('Error submitting profile change request:', err)
    } finally {
      setIsSubmitting(false)
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

            {!editing && profile.role !== 'athlete' && (
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
                disabled={isSaving}
              >
                Edit Profile
              </Button>
            )}
            
            {!editing && profile.role === 'athlete' && (
              <Button
                variant="outline"
                onClick={() => setShowChangeRequestDialog(true)}
                disabled={isSaving}
              >
                <Edit className="h-4 w-4 mr-2" />
                Request Update
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

      {/* Athlete Profile Details */}
      {profile.role === 'athlete' && (
        <Card>
          <CardHeader>
            <CardTitle>Athlete Profile Details</CardTitle>
            <CardDescription>
              Your athlete-specific information. To update, click "Request Update" above.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Athlete Type</h4>
                <p className="text-muted-foreground text-sm capitalize">
                  {profile.athlete_type || 'Not specified'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">School/Club</h4>
                <p className="text-muted-foreground text-sm">
                  {profile.school_club || 'Not specified'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Date of Birth</h4>
                <p className="text-muted-foreground text-sm">
                  {profile.date_of_birth 
                    ? new Date(profile.date_of_birth).toLocaleDateString() 
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">National Ranking</h4>
                <p className="text-muted-foreground text-sm">
                  {profile.national_ranking ? `#${profile.national_ranking}` : 'Unranked'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">District</h4>
                <p className="text-muted-foreground text-sm">
                  {profile.district || 'Not specified'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-1">Training Place</h4>
                <p className="text-muted-foreground text-sm">
                  {profile.training_place || 'Not specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Profile Change Request Dialog */}
      {profile.role === 'athlete' && (
        <Dialog open={showChangeRequestDialog} onOpenChange={setShowChangeRequestDialog}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Request Profile Update</DialogTitle>
              <DialogDescription>
                Update your athlete profile information. Changes require official approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Editable Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="athleteType">Athlete Type</Label>
                  <select
                    id="athleteType"
                    value={athleteProfile.athleteType}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, athleteType: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="">Select type</option>
                    <option value="normal">Normal</option>
                    <option value="student">Student</option>
                    <option value="university">University</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolClub">School/Club Name</Label>
                  <Input
                    id="schoolClub"
                    value={athleteProfile.schoolClub}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, schoolClub: e.target.value })}
                    placeholder="St. Joseph College"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={athleteProfile.dateOfBirth}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, dateOfBirth: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nationalRanking">National Ranking (Optional)</Label>
                  <Input
                    id="nationalRanking"
                    type="number"
                    value={athleteProfile.nationalRanking}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, nationalRanking: e.target.value })}
                    placeholder="e.g., 5"
                    min="1"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={athleteProfile.district}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, district: e.target.value })}
                    placeholder="Colombo"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trainingPlace">Training Place</Label>
                  <Input
                    id="trainingPlace"
                    value={athleteProfile.trainingPlace}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, trainingPlace: e.target.value })}
                    placeholder="National Stadium"
                    className="bg-input border-border"
                  />
                </div>
              </div>
              
              {/* Reason for Change */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-foreground">
                  Reason for Changes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you need to update your profile information..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="bg-input border-border min-h-[100px]"
                  required
                />
              </div>
              
              {/* Document Upload */}
              <div className="space-y-2">
                <Label htmlFor="document" className="text-foreground">
                  Supporting Document <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a document to verify your profile changes (e.g., school ID, birth certificate, ranking certificate)
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSupportingDocument(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {supportingDocument ? supportingDocument.name : 'Click to upload or drag and drop'}
                  </p>
                  {supportingDocument && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(supportingDocument.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                  {!supportingDocument && (
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG (Max 10MB)
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangeRequestDialog(false)
                    setChangeReason("")
                    setSupportingDocument(null)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitProfileChangeRequest}
                  disabled={isSubmitting || !changeReason.trim() || !supportingDocument}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Achievement Scoring Criteria Section */}
      <div className="mt-8">
        <AchievementScoringCriteria />
      </div>
    </div>
  )
}
