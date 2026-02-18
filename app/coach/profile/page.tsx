"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Mail,
  Users,
  ClipboardList,
  Star,
  Edit2,
  Save,
  Award,
  Upload,
  Plus
} from "lucide-react"

export default function CoachProfilePage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [athletes, setAthletes] = useState<any[]>([])
  const [certifications, setCertifications] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    sport: "",
    specialization: "",
  })
  const [showCertificationForm, setShowCertificationForm] = useState(false)
  const [certificationForm, setCertificationForm] = useState({
    title: "",
    issuingOrganization: "",
    issueDate: "",
    expiryDate: "",
    credentialId: "",
  })
  const [certificationAttachments, setCertificationAttachments] = useState<File[]>([])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" })
        const data = await res.json()
        
        if (res.ok && data.user) {
          setCurrentUser(data.user)
        } else {
          console.error("Failed to load user:", data.error)
        }
      } catch (error) {
        console.error("Failed to load coach user", error)
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
      email: currentUser.email || "",
      bio: currentUser.bio || "",
      sport: currentUser.sport || "",
      specialization: currentUser.specialization || "",
    })

    const loadData = async () => {
      try {
        const [plansRes, athletesRes, certificationsRes] = await Promise.all([
          fetch(`/api/training-plans?coachId=${currentUser.id}`, { cache: "no-store" }),
          fetch("/api/users?role=athlete&limit=200", { cache: "no-store" }),
          fetch(`/api/certifications?coachId=${currentUser.id}`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const athletesData = await athletesRes.json()
        const certificationsData = await certificationsRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          athleteIds: plan.athlete_ids ?? plan.athleteIds ?? [],
          progress: plan.progress ?? 0,
        }))

        const normalizedCertifications = (certificationsData.certifications || []).map((c: any) => ({
          ...c,
          coachId: c.coach_id ?? c.coachId,
          issuingOrganization: c.issuing_organization ?? c.issuingOrganization,
          issueDate: c.issue_date ?? c.issueDate,
          expiryDate: c.expiry_date ?? c.expiryDate,
          credentialId: c.credential_id ?? c.credentialId,
          verifiedBy: c.verified_by ?? c.verifiedBy,
          verifiedDate: c.verified_date ?? c.verifiedDate,
        }))

        setTrainingPlans(normalizedPlans)
        setAthletes(athletesData.users || [])
        setCertifications(normalizedCertifications)
      } catch (error) {
        console.error("Failed to load coach profile data", error)
      }
    }

    loadData()
  }, [currentUser])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading profile...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  const assignedAthleteIds = new Set(trainingPlans.flatMap(p => p.athleteIds || []))
  const assignedAthletes = athletes.filter(a => assignedAthleteIds.has(a.id))
  const activePlans = trainingPlans.filter(p => p.status === "active")
  const completedPlans = trainingPlans.filter(p => p.status === "completed")
  const verifiedCertifications = certifications.filter(c => c.status === "verified")

  const handleSave = async () => {
    try {
      await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to update profile", error)
    }
  }

  const handleCertificationSubmit = async () => {
    if (!certificationForm.title || !certificationForm.issuingOrganization || !certificationForm.issueDate) return

    const attachments = certificationAttachments.map((file) => file.name)

    await fetch("/api/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coachId: currentUser.id,
        title: certificationForm.title,
        issuingOrganization: certificationForm.issuingOrganization,
        issueDate: certificationForm.issueDate,
        expiryDate: certificationForm.expiryDate || undefined,
        credentialId: certificationForm.credentialId || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    })

    const refreshed = await fetch(`/api/certifications?coachId=${currentUser.id}`, { cache: "no-store" })
    const refreshedData = await refreshed.json()
    const normalized = (refreshedData.certifications || []).map((c: any) => ({
      ...c,
      coachId: c.coach_id ?? c.coachId,
      issuingOrganization: c.issuing_organization ?? c.issuingOrganization,
      issueDate: c.issue_date ?? c.issueDate,
      expiryDate: c.expiry_date ?? c.expiryDate,
      credentialId: c.credential_id ?? c.credentialId,
      verifiedBy: c.verified_by ?? c.verifiedBy,
      verifiedDate: c.verified_date ?? c.verifiedDate,
    }))
    setCertifications(normalized)

    setCertificationForm({
      title: "",
      issuingOrganization: "",
      issueDate: "",
      expiryDate: "",
      credentialId: "",
    })
    setCertificationAttachments([])
    setShowCertificationForm(false)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setCertificationAttachments(prev => [...prev, ...newFiles])
    }
  }

  const removeAttachment = (index: number) => {
    setCertificationAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <DashboardLayout role="coach">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground">Manage your coach profile and information</p>
          </div>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={isEditing ? "bg-primary text-primary-foreground" : "border-border"}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </>
            )}
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {currentUser.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <Badge className="bg-primary/20 text-primary border-0">Coach</Badge>
                {currentUser.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-accent fill-accent" />
                    <span className="text-sm text-accent font-medium">{currentUser.rating}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="bg-input border-border"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {currentUser.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    {isEditing ? (
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-input border-border"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {currentUser.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sport" className="text-foreground">Sport</Label>
                    {isEditing ? (
                      <Input
                        id="sport"
                        value={formData.sport}
                        onChange={(e) => setFormData(prev => ({ ...prev, sport: e.target.value }))}
                        className="bg-input border-border"
                        placeholder="e.g., Track & Field"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        {currentUser.sport || "Not specified"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-foreground">Specialization</Label>
                    {isEditing ? (
                      <Input
                        id="specialization"
                        value={formData.specialization}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                        className="bg-input border-border"
                        placeholder="e.g., Sprint Training"
                      />
                    ) : (
                      <p className="text-foreground flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        {currentUser.specialization || "Not specified"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      className="bg-input border-border min-h-[100px]"
                      placeholder="Tell us about your coaching experience..."
                    />
                  ) : (
                    <p className="text-muted-foreground">
                      {currentUser.bio || "No bio added yet"}
                    </p>
                  )}
                </div>

                {certifications.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-foreground">Certifications</Label>
                    <div className="flex flex-wrap gap-2">
                      {certifications.map((cert) => (
                        <Badge key={cert.id} variant="outline" className="border-border text-foreground">
                          {cert.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certification Submission */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-foreground">Certifications</CardTitle>
              <CardDescription>Submit certifications for official verification</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCertificationForm(!showCertificationForm)}
              className="border-border"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Certification
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCertificationForm && (
              <div className="space-y-4 p-4 border border-border rounded-lg bg-secondary/50">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cert-title" className="text-foreground">Certification Title</Label>
                    <Input
                      id="cert-title"
                      placeholder="e.g., USATF Level 3 Coach Certification"
                      value={certificationForm.title}
                      onChange={(e) => setCertificationForm(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuing-org" className="text-foreground">Issuing Organization</Label>
                    <Input
                      id="issuing-org"
                      placeholder="e.g., USA Track & Field"
                      value={certificationForm.issuingOrganization}
                      onChange={(e) => setCertificationForm(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-date" className="text-foreground">Issue Date</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      value={certificationForm.issueDate}
                      onChange={(e) => setCertificationForm(prev => ({ ...prev, issueDate: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry-date" className="text-foreground">Expiry Date (Optional)</Label>
                    <Input
                      id="expiry-date"
                      type="date"
                      value={certificationForm.expiryDate}
                      onChange={(e) => setCertificationForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credential-id" className="text-foreground">Credential ID (Optional)</Label>
                    <Input
                      id="credential-id"
                      placeholder="e.g., USATF-L3-2024-001"
                      value={certificationForm.credentialId}
                      onChange={(e) => setCertificationForm(prev => ({ ...prev, credentialId: e.target.value }))}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Supporting Documents</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="bg-input border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload certification documents, certificates, or proof of completion (max 10MB each)
                    </p>
                    {certificationAttachments.length > 0 && (
                      <div className="space-y-1">
                        {certificationAttachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center space-x-2">
                              <Upload className="h-4 w-4" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024 / 1024).toFixed(1)}MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCertificationForm(false)
                      setCertificationForm({
                        title: "",
                        issuingOrganization: "",
                        issueDate: "",
                        expiryDate: "",
                        credentialId: "",
                      })
                      setCertificationAttachments([])
                    }}
                    className="border-border"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCertificationSubmit}
                    className="bg-primary text-primary-foreground"
                    disabled={!certificationForm.title || !certificationForm.issuingOrganization || !certificationForm.issueDate}
                  >
                    Submit for Review
                  </Button>
                </div>
              </div>
            )}

            {/* Display submitted certifications */}
            <div className="space-y-3">
              {certifications.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No certifications submitted yet. Click "Add Certification" to get started.
                </p>
              ) : (
                certifications.map((cert) => (
                  <div key={cert.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{cert.title}</h3>
                        <p className="text-sm text-muted-foreground">{cert.issuingOrganization}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                          {cert.expiryDate && (
                            <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                          )}
                          {cert.credentialId && (
                            <span>ID: {cert.credentialId}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={cert.status === 'verified' ? 'default' : cert.status === 'pending' ? 'secondary' : 'destructive'}
                        className={
                          cert.status === 'verified'
                            ? 'bg-primary/20 text-primary border-primary/50'
                            : cert.status === 'pending'
                            ? 'bg-accent/20 text-accent border-accent/50'
                            : 'bg-destructive/20 text-destructive border-destructive/50'
                        }
                      >
                        {cert.status === 'verified' ? 'Verified' : cert.status === 'pending' ? 'Pending Review' : 'Rejected'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{assignedAthletes.length}</p>
              <p className="text-xs text-muted-foreground">Assigned Athletes</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{activePlans.length}</p>
              <p className="text-xs text-muted-foreground">Active Plans</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <p className="text-2xl font-bold text-foreground">{completedPlans.length}</p>
              <p className="text-xs text-muted-foreground">Completed Plans</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                <Star className="h-5 w-5 text-secondary-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {currentUser.rating || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}