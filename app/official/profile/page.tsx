'use client'

import { useEffect, useRef, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Camera, Copy, Check } from 'lucide-react'

export default function OfficialProfilePage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraPermission, setCameraPermission] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [editedPhone, setEditedPhone] = useState('')
  const [isSavingPhone, setIsSavingPhone] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        const data = await res.json()
        if (res.ok && data.user) {
          setCurrentUser(data.user)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setIsLoadingUser(false)
      }
    }
    loadUser()
  }, [])

  // Start camera
  const startCamera = async () => {
    try {
      // First try with constraints
      let stream: MediaStream | null = null
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
      } catch (err: any) {
        console.warn('Camera request with constraints failed, trying without constraints', err)
        // Fallback: try without specific constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      if (!stream) {
        throw new Error('Failed to get media stream')
      }

      streamRef.current = stream
      setCameraPermission('granted')
      setShowCamera(true)

      // Wait a tiny bit for DOM to update, then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
          // Wait for metadata to load
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, starting playback')
            videoRef.current?.play().catch((playError: any) => {
              console.error('Play failed:', playError)
            })
          }

          videoRef.current.onplay = () => {
            console.log('Video playing successfully')
          }
          
          videoRef.current.onerror = (error: any) => {
            console.error('Video element error:', error)
          }

          // Fallback: try to play immediately
          videoRef.current.play().catch((playError: any) => {
            console.warn('Immediate play failed, waiting for metadata', playError)
          })
        }
      }, 50)
    } catch (error: any) {
      console.error('Full camera error:', error)
      setCameraPermission('denied')

      let errorMessage = 'Camera access denied'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'You denied camera permission. Please check your browser settings and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application'
      } else {
        errorMessage = error.message || error.toString()
      }

      alert(`Camera Error: ${errorMessage}`)
      console.log('To fix: Check browser camera permissions in settings')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('Camera not ready. Please try again.')
      return
    }

    const context = canvasRef.current.getContext('2d')
    if (!context) {
      alert('Failed to access canvas context')
      return
    }

    try {
      const video = videoRef.current
      
      // Check if video is actually playing
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        alert('Camera stream not ready. Please wait a moment and try again.')
        console.log('Video ready state:', {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          paused: video.paused,
          ended: video.ended,
        })
        return
      }

      // Ensure we have valid video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        alert('Camera stream dimensions invalid. Please try again.')
        return
      }

      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to image data
      const imageData = canvas.toDataURL('image/jpeg', 0.95)
      setCapturedImage(imageData)
      stopCamera()
    } catch (error) {
      console.error('Failed to capture photo:', error)
      alert('Failed to capture photo. Please try again.')
    }
  }

  // Copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Upload photo
  const uploadPhoto = async () => {
    if (!capturedImage || !currentUser) return

    try {
      const blob = await fetch(capturedImage).then((res) => res.blob())
      const formData = new FormData()
      formData.append('file', blob, 'profile.jpg')

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUser({ ...currentUser, avatar: data.url })
        setCapturedImage(null)
        alert('Profile picture updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload photo')
      }
    } catch (error: any) {
      console.error('Failed to upload photo:', error)
      alert(`Failed to upload photo: ${error.message || 'Unknown error'}`)
    }
  }

  // Save phone number
  const savePhoneNumber = async () => {
    if (!editedPhone.trim()) {
      alert('Phone number cannot be empty')
      return
    }

    setIsSavingPhone(true)
    try {
      const response = await fetch('/api/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: editedPhone.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
        setIsEditingPhone(false)
        alert('Phone number updated successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update phone number')
      }
    } catch (error) {
      console.error('Failed to save phone:', error)
      alert('Failed to update phone number')
    } finally {
      setIsSavingPhone(false)
    }
  }

  if (isLoadingUser) {
    return (
      <DashboardLayout role="official">
        <div className="text-muted-foreground">Loading...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) {
    return (
      <DashboardLayout role="official">
        <div className="text-muted-foreground">No official user found.</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="official">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Official Profile</h1>
          <p className="text-muted-foreground mt-2">View and manage your official credentials</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="bg-card border-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-foreground">Profile Picture</CardTitle>
              <CardDescription>Your official profile image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-32 w-32 border-2 border-primary/20">
                  <AvatarImage src={capturedImage || currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="text-2xl">{currentUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>

                {capturedImage ? (
                  <div className="w-full space-y-2">
                    <p className="text-sm text-muted-foreground text-center">Preview captured image</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={uploadPhoto}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Save Picture
                      </Button>
                      <Button
                        onClick={() => setCapturedImage(null)}
                        variant="outline"
                        className="flex-1 border-border"
                      >
                        Retake
                      </Button>
                    </div>
                  </div>
                ) : showCamera ? (
                  <div className="w-full space-y-2">
                    <div className="relative bg-black rounded-lg overflow-hidden w-full" style={{ paddingBottom: '75%' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={capturePhoto}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture
                      </Button>
                      <Button
                        onClick={stopCamera}
                        variant="outline"
                        className="flex-1 border-border"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={startCamera}
                    variant="outline"
                    className="w-full border-border text-foreground hover:bg-secondary"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Picture
                  </Button>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            </CardContent>
          </Card>

          {/* Official Information Card */}
          <Card className="bg-card border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Official Credentials</CardTitle>
              <CardDescription>Your official identification and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Full Name</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentUser.name || ''}
                    readOnly
                    className="bg-muted border-border text-foreground"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(currentUser.name, 'name')}
                    className="border-border"
                  >
                    {copiedField === 'name' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentUser.email || ''}
                    readOnly
                    type="email"
                    className="bg-muted border-border text-foreground"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(currentUser.email, 'email')}
                    className="border-border"
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Official ID */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Official ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={currentUser.id || ''}
                    readOnly
                    className="bg-muted border-border text-foreground font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(currentUser.id, 'id')}
                    className="border-border"
                  >
                    {copiedField === 'id' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier for verification purposes
                </p>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Role</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Badge className="bg-primary/20 text-primary border-0 text-base px-3 py-1">
                      {currentUser.role?.charAt(0).toUpperCase() +
                        currentUser.role?.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(currentUser.role, 'role')}
                    className="border-border"
                  >
                    {copiedField === 'role' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Profile Verified Status */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Profile Status</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      currentUser.profile_verified
                        ? 'bg-green-500/20 text-green-700 border-0'
                        : 'bg-amber-500/20 text-amber-700 border-0'
                    }
                  >
                    {currentUser.profile_verified ? 'Verified' : 'Pending Verification'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Info Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Account Information</CardTitle>
            <CardDescription>Your account details and activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-foreground font-medium text-sm">Account Created</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <Label className="text-foreground font-medium text-sm">Phone Number</Label>
                {isEditingPhone ? (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="tel"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="border-border text-foreground"
                    />
                    <Button
                      size="sm"
                      onClick={savePhoneNumber}
                      disabled={isSavingPhone}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSavingPhone ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingPhone(false)}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {currentUser.phone || 'Not provided'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditedPhone(currentUser.phone || '')
                        setIsEditingPhone(true)
                      }}
                      className="border-border"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
