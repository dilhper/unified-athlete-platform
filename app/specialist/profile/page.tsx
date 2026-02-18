"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, FileText } from "lucide-react"

export default function SpecialistProfilePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    bio: "",
    certifications: [] as string[],
  })
  const [newCertification, setNewCertification] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" })
        const data = await res.json()
        
        if (!res.ok || !data.user) {
          console.error("Failed to load user:", data.error)
          setIsLoadingUser(false)
          return
        }
        
        const detailUser = data.user
        setCurrentUser({
          ...detailUser,
          profilePendingVerification: detailUser.profile_pending_verification ?? detailUser.profilePendingVerification,
            profileVerified: detailUser.profile_verified ?? detailUser.profileVerified,
            documents: detailUser.documents ?? [],
          })
      } catch (error) {
        console.error("Failed to load specialist user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!currentUser) return
    setFormData({
      name: currentUser.name || "",
      specialization: currentUser.specialization || "",
      bio: currentUser.bio || "",
      certifications: currentUser.documents || [],
    })
  }, [currentUser])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading profile...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setAttachments(prev => [...prev, ...newFiles])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const addCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }))
      setNewCertification("")
    }
  }

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Update user profile with pending verification status
      await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          specialization: formData.specialization,
          bio: formData.bio,
          documents: formData.certifications,
          profilePendingVerification: true,
          profileVerified: false,
        }),
      })

      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          title: "Profile Update Submitted",
          message: "Your profile has been submitted for official verification. You will be notified once it's approved.",
          type: "info",
        }),
      })

      const officialsRes = await fetch("/api/users?role=official&limit=200", { cache: "no-store" })
      const officialsData = await officialsRes.json()
      const officials = officialsData.users || []

      await Promise.all(
        officials.map((official: any) =>
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: official.id,
              title: "Specialist Profile Verification",
              message: `${currentUser.name} has submitted their profile for verification.`,
              type: "info",
              actionUrl: "/official/verifications",
            }),
          })
        )
      )

      setIsEditing(false)
      router.push("/specialist")
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isProfileComplete = currentUser.name && currentUser.specialization && currentUser.bio

  return (
    <DashboardLayout role="specialist">
      <div className="space-y-6 max-w-4xl">
        {/* Back Button */}
        <Link href="/specialist" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Specialist Profile</h1>
          <p className="text-muted-foreground">Manage your professional information and credentials</p>
        </div>

        {/* Profile Status */}
        {currentUser.profilePendingVerification && !currentUser.profileVerified && (
          <Alert className="border-accent bg-accent/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile is currently under review by officials. You will be notified once it's approved.
            </AlertDescription>
          </Alert>
        )}

        {currentUser.profileVerified && (
          <Alert className="border-primary bg-primary/10">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile has been verified and is publicly visible.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Display */}
        {!isEditing && (
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-foreground">Profile Information</CardTitle>
                  <CardDescription>Your current profile details</CardDescription>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isProfileComplete ? "Update Profile" : "Complete Profile"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {currentUser.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{currentUser.name}</h3>
                    <p className="text-muted-foreground">{currentUser.specialization}</p>
                  </div>

                  {currentUser.bio && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">About</h4>
                      <p className="text-muted-foreground">{currentUser.bio}</p>
                    </div>
                  )}

                  {currentUser.documents && currentUser.documents.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentUser.documents.map((cert: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-border text-foreground">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Edit Form */}
        {isEditing && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Edit Profile</CardTitle>
                <CardDescription>Update your professional information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-input border-border"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-foreground">Specialization</Label>
                    <Input
                      id="specialization"
                      value={formData.specialization}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                      className="bg-input border-border"
                      placeholder="e.g., Sports Medicine, Nutrition, Psychology"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-input border-border min-h-[120px]"
                    placeholder="Describe your experience, expertise, and approach to working with athletes..."
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-foreground">Certifications</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Add certification..."
                      className="bg-input border-border"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCertification())}
                    />
                    <Button type="button" onClick={addCertification} variant="outline" className="border-border">
                      Add
                    </Button>
                  </div>

                  {formData.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.map((cert, i) => (
                        <Badge key={i} variant="outline" className="border-border text-foreground pr-1">
                          {cert}
                          <button
                            type="button"
                            onClick={() => removeCertification(i)}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-foreground">Supporting Documents</Label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="profile-attachments"
                    />
                    <label htmlFor="profile-attachments" className="flex items-center gap-2 cursor-pointer bg-secondary/50 hover:bg-secondary border border-border rounded-lg p-4 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Click to upload certificates, licenses, or other documents</span>
                    </label>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 bg-secondary/50 p-2 rounded-lg">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-foreground flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setFormData({
                    name: currentUser.name || "",
                    specialization: currentUser.specialization || "",
                    bio: currentUser.bio || "",
                    certifications: currentUser.certifications || [],
                  })
                  setAttachments([])
                }}
                className="border-border bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? "Submitting..." : "Submit for Verification"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}