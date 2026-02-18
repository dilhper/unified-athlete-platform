"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { RegistrationReview } from "@/components/registration-review"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Calendar,
  Shield,
  AlertCircle,
  FileCheck,
  Users,
} from "lucide-react"

export default function OfficialDashboard() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([])
  const [pendingAchievements, setPendingAchievements] = useState<any[]>([])
  const [verifiedAchievements, setVerifiedAchievements] = useState<any[]>([])
  const [rejectedAchievements, setRejectedAchievements] = useState<any[]>([])
  const [pendingCertifications, setPendingCertifications] = useState<any[]>([])
  const [verifiedCertifications, setVerifiedCertifications] = useState<any[]>([])
  const [rejectedCertifications, setRejectedCertifications] = useState<any[]>([])
  const [pendingSpecialists, setPendingSpecialists] = useState<any[]>([])
  const [userCache, setUserCache] = useState<Record<string, any>>({})
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false)
  const [profileChangeRequests, setProfileChangeRequests] = useState<any[]>([])
  const [isLoadingProfileChanges, setIsLoadingProfileChanges] = useState(false)

  const normalizeRegistration = (user: any) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    role: user.role,
    athleteType: user.athlete_type ?? user.athleteType,
    documents: user.documents || [],
    location: user.location,
    yearsOfExperience: user.years_of_experience ?? user.yearsOfExperience,
    sport: user.sport,
    specialty: user.specialty,
    specialization: user.specialization,
    isAdmin: user.is_admin ?? false,
    profileVerified: user.profile_verified ?? false,
    profilePendingVerification: user.profile_pending_verification ?? true,
    createdAt: user.created_at ?? user.createdAt,
  })

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
        console.error("Failed to load official user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [registrationsRes, pendingAchRes, verifiedAchRes, rejectedAchRes, pendingCertRes, verifiedCertRes, rejectedCertRes, pendingSpecialistsRes, profileChangesRes] = await Promise.all([
          fetch("/api/official/registrations", { cache: "no-store" }),
          fetch("/api/verifications?type=achievement&status=pending", { cache: "no-store" }),
          fetch("/api/verifications?type=achievement&status=verified", { cache: "no-store" }),
          fetch("/api/verifications?type=achievement&status=rejected", { cache: "no-store" }),
          fetch("/api/verifications?type=certification&status=pending", { cache: "no-store" }),
          fetch("/api/verifications?type=certification&status=verified", { cache: "no-store" }),
          fetch("/api/verifications?type=certification&status=rejected", { cache: "no-store" }),
          fetch("/api/official/pending-specialists", { cache: "no-store" }),
          fetch("/api/profile-change-requests", { cache: "no-store" }),
        ])

        const registrationsData = await registrationsRes.json()
        const pendingAchData = await pendingAchRes.json()
        const verifiedAchData = await verifiedAchRes.json()
        const rejectedAchData = await rejectedAchRes.json()
        const pendingCertData = await pendingCertRes.json()
        const verifiedCertData = await verifiedCertRes.json()
        const rejectedCertData = await rejectedCertRes.json()
        const pendingSpecialistsData = await pendingSpecialistsRes.json()
        const profileChangesData = await profileChangesRes.json()

        setPendingRegistrations((registrationsData.registrations || []).map(normalizeRegistration))
        setPendingAchievements(pendingAchData.verifications || [])
        setVerifiedAchievements(verifiedAchData.verifications || [])
        setRejectedAchievements(rejectedAchData.verifications || [])
        setPendingCertifications(pendingCertData.verifications || [])
        setVerifiedCertifications(verifiedCertData.verifications || [])
        setRejectedCertifications(rejectedCertData.verifications || [])
        setPendingSpecialists(
          (pendingSpecialistsData.specialists || []).map((specialist: any) => ({
            ...specialist,
            createdAt: specialist.created_at ?? specialist.createdAt,
          }))
        )
        setProfileChangeRequests(profileChangesData.requests || [])
      } catch (error) {
        console.error("Failed to load official dashboard data", error)
      }
    }

    loadData()
  }, [])

  const pendingVerifications = pendingAchievements

  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    pendingAchievements.forEach((a: any) => a.athlete_id && ids.add(a.athlete_id))
    verifiedAchievements.forEach((a: any) => a.athlete_id && ids.add(a.athlete_id))
    rejectedAchievements.forEach((a: any) => a.athlete_id && ids.add(a.athlete_id))
    pendingCertifications.forEach((c: any) => c.coach_id && ids.add(c.coach_id))
    verifiedCertifications.forEach((c: any) => c.coach_id && ids.add(c.coach_id))
    rejectedCertifications.forEach((c: any) => c.coach_id && ids.add(c.coach_id))
    pendingRegistrations.forEach((u: any) => u.id && ids.add(u.id))
    pendingSpecialists.forEach((u: any) => u.id && ids.add(u.id))
    profileChangeRequests.forEach((r: any) => r.user_id && ids.add(r.user_id))
    return Array.from(ids)
  }, [pendingAchievements, verifiedAchievements, rejectedAchievements, pendingCertifications, verifiedCertifications, rejectedCertifications, pendingRegistrations, pendingSpecialists, profileChangeRequests])

  useEffect(() => {
    const loadUsers = async () => {
      const missing = allUserIds.filter((id) => !userCache[id])
      if (missing.length === 0) return

      const responses = await Promise.all(
        missing.map((id) => fetch(`/api/users/${id}`, { cache: "no-store" }))
      )
      const payloads = await Promise.all(responses.map((res) => res.json()))

      const updates: Record<string, any> = {}
      payloads.forEach((data) => {
        if (data?.user?.id) {
          updates[data.user.id] = data.user
        }
      })

      if (Object.keys(updates).length > 0) {
        setUserCache((prev) => ({ ...prev, ...updates }))
      }
    }

    loadUsers()
  }, [allUserIds, userCache])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="official">
        <div className="text-muted-foreground">Loading dashboard...</div>
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
  
  const myVerifications = verifiedAchievements.filter((a: any) => a.verified_by === currentUser.id)
  const myCertificationReviews = verifiedCertifications.filter((c: any) => c.verified_by === currentUser.id)

  const getUserById = (id?: string) => (id ? userCache[id] : undefined)

  const handleApprove = async (userId: string, comments: string) => {
    if (!currentUser) return
    setIsLoadingRegistrations(true)
    try {
      const res = await fetch("/api/official/approve-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, officialId: currentUser.id, comments }),
      })
      
      if (!res.ok) {
        let errorMsg = 'Unknown error'
        let fullError: any = null
        try {
          const text = await res.text()
          try {
            fullError = text ? JSON.parse(text) : null
          } catch {
            fullError = text ? { raw: text } : null
          }
          errorMsg =
            fullError?.error ||
            fullError?.details ||
            fullError?.raw ||
            `Server error (${res.status} ${res.statusText})`
        } catch {
          errorMsg = `Server error (${res.status} ${res.statusText})`
        }
        console.error("Approval failed:", errorMsg, fullError)
        alert('Failed to approve registration: ' + errorMsg)
        return
      }

      const refreshed = await fetch("/api/official/registrations", { cache: "no-store", credentials: "include" })
      const data = await refreshed.json()
      setPendingRegistrations(data.registrations || [])
    } catch (error) {
      console.error("Failed to approve registration", error)
      alert('Error approving registration')
    } finally {
      setIsLoadingRegistrations(false)
    }
  }

  const handleReject = async (userId: string, reason: string) => {
    if (!currentUser) return
    setIsLoadingRegistrations(true)
    try {
      const res = await fetch("/api/official/reject-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, officialId: currentUser.id, reason }),
      })
      
      if (!res.ok) {
        let errorMsg = 'Unknown error'
        let fullError: any = null
        try {
          const text = await res.text()
          try {
            fullError = text ? JSON.parse(text) : null
          } catch {
            fullError = text ? { raw: text } : null
          }
          errorMsg =
            fullError?.error ||
            fullError?.details ||
            fullError?.raw ||
            `Server error (${res.status} ${res.statusText})`
        } catch {
          errorMsg = `Server error (${res.status} ${res.statusText})`
        }
        console.error("Rejection failed:", errorMsg, fullError)
        alert('Failed to reject registration: ' + errorMsg)
        return
      }

      const refreshed = await fetch("/api/official/registrations", { cache: "no-store", credentials: "include" })
      const data = await refreshed.json()
      setPendingRegistrations(data.registrations || [])
    } catch (error) {
      console.error("Failed to reject registration", error)
      alert('Error rejecting registration')
    } finally {
      setIsLoadingRegistrations(false)
    }
  }
  
  return (
    <DashboardLayout role="official">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {currentUser.name}</h1>
          <p className="text-muted-foreground">Review registrations, achievements, and certifications</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Registrations</p>
                  <p className="text-2xl font-bold text-foreground">{pendingRegistrations.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Verifications</p>
                  <p className="text-2xl font-bold text-foreground">{pendingVerifications.length + pendingCertifications.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-foreground">{verifiedAchievements.length + verifiedCertifications.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-foreground">{rejectedAchievements.length + rejectedCertifications.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Reviews</p>
                  <p className="text-2xl font-bold text-foreground">{myVerifications.length + myCertificationReviews.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content with Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger value="overview" className="text-foreground">Overview</TabsTrigger>
            <TabsTrigger value="registrations" className="text-foreground">
              Registrations
              {pendingRegistrations.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-700">
                  {pendingRegistrations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="verifications" className="text-foreground">
              Verifications
              {(pendingVerifications.length + pendingCertifications.length) > 0 && (
                <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700">
                  {pendingVerifications.length + pendingCertifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile-changes" className="text-foreground">
              Profile Changes
              {profileChangeRequests.filter((r: any) => r.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-700">
                  {profileChangeRequests.filter((r: any) => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 pt-6">
        
        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pending Verifications */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-foreground">Pending Reviews</CardTitle>
                <CardDescription>Achievements and certifications waiting for review</CardDescription>
              </div>
              <Link href="/official/verifications">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {(pendingVerifications.length + pendingCertifications.length + pendingSpecialists.length) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-primary opacity-50" />
                  <p>No pending reviews</p>
                  <p className="text-sm">All submissions have been reviewed</p>
                </div>
              ) : (
                <>
                  {/* Pending Achievements */}
                  {pendingVerifications.slice(0, 3).map((achievement) => {
                    const athlete = getUserById(achievement.athlete_id)
                    
                    return (
                      <Link key={achievement.id} href={`/official/verifications/${achievement.id}`}>
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-foreground">{achievement.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{achievement.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">Achievement • {athlete?.name || "Unknown"}</p>
                              </div>
                              <Badge className="bg-accent/20 text-accent border-0 flex-shrink-0">
                                Pending
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  
                  {/* Pending Certifications */}
                  {pendingCertifications.slice(0, 3).map((certification) => {
                    const coach = getUserById(certification.coach_id)
                    
                    return (
                      <Link key={certification.id} href={`/official/verifications/${certification.id}`}>
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Shield className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-foreground">{certification.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{certification.issuing_organization}</p>
                                <p className="text-xs text-muted-foreground mt-1">Certification • {coach?.name || "Unknown"}</p>
                              </div>
                              <Badge className="bg-primary/20 text-primary border-0 flex-shrink-0">
                                Pending
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  
                  {/* Pending Specialist Profiles */}
                  {pendingSpecialists.slice(0, 3).map((specialist) => (
                    <Link key={specialist.id} href="/official/verifications">
                      <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium text-foreground">{specialist.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">{specialist.specialization}</p>
                              <p className="text-xs text-muted-foreground mt-1">Specialist Profile • Pending Verification</p>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-0 flex-shrink-0">
                              Pending
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Verification Guidelines */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Verification Guidelines</CardTitle>
              <CardDescription>Standards for reviewing achievements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Verify Evidence</p>
                    <p className="text-xs text-muted-foreground">Check for official documentation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <FileCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Confirm Details</p>
                    <p className="text-xs text-muted-foreground">Validate dates and competition info</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm">Review Thoroughly</p>
                    <p className="text-xs text-muted-foreground">Ensure accuracy before approval</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Verifications */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-foreground">Recent Verifications</CardTitle>
              <CardDescription>Your recent verification decisions</CardDescription>
            </div>
            <Link href="/official/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View History <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {myVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No verifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                  {myVerifications.slice(0, 4).map((achievement) => {
                  const athlete = getUserById(achievement.athlete_id)
                  
                  return (
                    <div key={achievement.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          achievement.status === "verified" ? "bg-primary/10" : "bg-destructive/10"
                        }`}>
                          {achievement.status === "verified" ? (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{achievement.title}</p>
                          <p className="text-xs text-muted-foreground">{athlete?.name || "Unknown"}</p>
                        </div>
                      </div>
                      <Badge className={achievement.status === "verified" 
                        ? "bg-primary/20 text-primary border-0" 
                        : "bg-destructive/20 text-destructive border-0"
                      }>
                        {achievement.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
          
          {/* Registrations Tab */}
          <TabsContent value="registrations" className="space-y-6 pt-6">
            {pendingRegistrations.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Pending Registrations</h3>
                  <p className="text-muted-foreground">All user registrations have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRegistrations.map((user) => (
                  <RegistrationReview
                    key={user.id}
                    user={user}
                    onApprove={(userId, comments) => {
                      handleApprove(userId, comments)
                    }}
                    onReject={(userId, reason) => {
                      handleReject(userId, reason)
                    }}
                    isLoading={isLoadingRegistrations}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Verifications Tab */}
          <TabsContent value="verifications" className="space-y-6 pt-6">
            <Tabs defaultValue="athletes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-secondary">
                <TabsTrigger value="athletes" className="text-foreground">
                  Athletes
                  {pendingVerifications.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-500/20 text-blue-700">
                      {pendingVerifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="coaches" className="text-foreground">
                  Coaches
                  {pendingCertifications.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-700">
                      {pendingCertifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="specialists" className="text-foreground">
                  Specialists
                  {pendingSpecialists.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700">
                      {pendingSpecialists.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              {/* Athletes Verifications */}
              <TabsContent value="athletes" className="space-y-4 pt-4">
                {pendingVerifications.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="py-16 text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Pending Athlete Verifications</h3>
                      <p className="text-muted-foreground">All athlete achievements have been reviewed</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Athlete Achievement Verifications</CardTitle>
                      <CardDescription>Review and verify athlete achievements</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingVerifications.map((achievement) => {
                        const athlete = getUserById(achievement.athlete_id)
                        return (
                          <Link key={achievement.id} href={`/official/verifications/${achievement.id}`}>
                            <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-medium text-foreground">{achievement.title}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    By {athlete?.name || "Unknown"} • {new Date(achievement.date).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge className="bg-accent/20 text-accent border-0">
                                  {achievement.category}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {/* Coaches Verifications */}
              <TabsContent value="coaches" className="space-y-4 pt-4">
                {pendingCertifications.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="py-16 text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Pending Coach Certifications</h3>
                      <p className="text-muted-foreground">All coach credentials have been reviewed</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Coach Certification Verifications</CardTitle>
                      <CardDescription>Review coach credentials and certifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingCertifications.map((cert) => {
                        const coach = getUserById(cert.coach_id)
                        return (
                          <div key={cert.id} className="p-4 rounded-lg border border-border">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground">{cert.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{coach?.name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Issued by {cert.issuing_organization} • {new Date(cert.issue_date).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge className="bg-purple-500/20 text-purple-700 border-0">
                                Certification
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {/* Specialists Verifications */}
              <TabsContent value="specialists" className="space-y-4 pt-4">
                {pendingSpecialists.length === 0 ? (
                  <Card className="bg-card border-border">
                    <CardContent className="py-16 text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Pending Specialist Profiles</h3>
                      <p className="text-muted-foreground">All specialist profiles have been reviewed</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Specialist Profile Verifications</CardTitle>
                      <CardDescription>Review specialist credentials and licenses</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pendingSpecialists.map((specialist) => (
                        <div key={specialist.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground">{specialist.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {specialist.specialization || specialist.specialty}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {specialist.email} • Registered {new Date(specialist.createdAt || new Date()).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className="bg-amber-500/20 text-amber-700 border-0">
                              Profile
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          {/* Profile Changes Tab */}
          <TabsContent value="profile-changes" className="space-y-6 pt-6">
            {profileChangeRequests.filter((r: any) => r.status === 'pending').length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Pending Profile Changes</h3>
                  <p className="text-muted-foreground">All profile change requests have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {profileChangeRequests
                  .filter((r: any) => r.status === 'pending')
                  .map((request) => {
                    const athlete = getUserById(request.user_id);
                    const changes = JSON.parse(request.requested_changes || '{}');
                    
                    return (
                      <Card key={request.id} className="bg-card border-border">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-foreground flex items-center gap-2">
                                {athlete?.name || 'Loading...'}
                                <Badge className="bg-purple-500/20 text-purple-700 border-0">
                                  Pending Review
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                Submitted {new Date(request.created_at).toLocaleDateString()} • {athlete?.email}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Reason */}
                          <div>
                            <Label className="text-foreground font-medium">Reason for Changes</Label>
                            <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted rounded-md">
                              {request.reason}
                            </p>
                          </div>
                          
                          {/* Supporting Document */}
                          {request.document_url && (
                            <div>
                              <Label className="text-foreground font-medium">Supporting Document</Label>
                              <div className="mt-2">
                                <a 
                                  href={request.document_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                >
                                  <FileCheck className="h-4 w-4" />
                                  {request.document_name || 'View Document'}
                                </a>
                                {request.document_size && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({(parseInt(request.document_size) / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Requested Changes */}
                          <div>
                            <Label className="text-foreground font-medium">Requested Changes</Label>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              {Object.entries(changes).map(([field, value]) => {
                                const fieldLabels: Record<string, string> = {
                                  athleteType: 'Athlete Type',
                                  schoolClub: 'School/Club',
                                  dateOfBirth: 'Date of Birth',
                                  nationalRanking: 'National Ranking',
                                  district: 'District',
                                  trainingPlace: 'Training Place',
                                };
                                
                                const currentFieldName = field.replace(/([A-Z])/g, '_$1').toLowerCase();
                                const currentValue = athlete ? athlete[currentFieldName] : 'N/A';
                                
                                return (
                                  <div key={field} className="p-3 bg-muted rounded-md">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {fieldLabels[field] || field}
                                    </p>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Current:</span>
                                        <span className="text-sm text-foreground line-through opacity-60">
                                          {currentValue || 'Not set'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">New:</span>
                                        <span className="text-sm font-medium text-primary">
                                          {String(value) || 'Not set'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Review Notes */}
                          <div>
                            <Label htmlFor={`notes-${request.id}`} className="text-foreground font-medium">
                              Review Notes (Optional)
                            </Label>
                            <Textarea
                              id={`notes-${request.id}`}
                              placeholder="Add any comments or notes about your decision..."
                              className="mt-2 bg-input border-border"
                            />
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-4 border-t border-border">
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                const notesTextarea = document.getElementById(`notes-${request.id}`) as HTMLTextAreaElement;
                                const notes = notesTextarea?.value || '';
                                
                                if (!confirm('Are you sure you want to reject this profile change request?')) return;
                                
                                setIsLoadingProfileChanges(true);
                                try {
                                  const res = await fetch(`/api/profile-change-requests/${request.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      action: 'reject',
                                      reviewNotes: notes 
                                    }),
                                  });
                                  
                                  if (!res.ok) {
                                    const error = await res.json();
                                    throw new Error(error.error || 'Failed to reject request');
                                  }
                                  
                                  // Refresh the list
                                  const refreshRes = await fetch('/api/profile-change-requests', { cache: 'no-store' });
                                  const refreshData = await refreshRes.json();
                                  setProfileChangeRequests(refreshData.requests || []);
                                } catch (error: any) {
                                  console.error('Failed to reject profile change request:', error);
                                  alert('Error: ' + error.message);
                                } finally {
                                  setIsLoadingProfileChanges(false);
                                }
                              }}
                              disabled={isLoadingProfileChanges}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={async () => {
                                const notesTextarea = document.getElementById(`notes-${request.id}`) as HTMLTextAreaElement;
                                const notes = notesTextarea?.value || '';
                                
                                if (!confirm('Approve this profile change request? The athlete\'s profile will be updated immediately.')) return;
                                
                                setIsLoadingProfileChanges(true);
                                try {
                                  const res = await fetch(`/api/profile-change-requests/${request.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      action: 'approve',
                                      reviewNotes: notes 
                                    }),
                                  });
                                  
                                  if (!res.ok) {
                                    const error = await res.json();
                                    throw new Error(error.error || 'Failed to approve request');
                                  }
                                  
                                  // Refresh the list
                                  const refreshRes = await fetch('/api/profile-change-requests', { cache: 'no-store' });
                                  const refreshData = await refreshRes.json();
                                  setProfileChangeRequests(refreshData.requests || []);
                                } catch (error: any) {
                                  console.error('Failed to approve profile change request:', error);
                                  alert('Error: ' + error.message);
                                } finally {
                                  setIsLoadingProfileChanges(false);
                                }
                              }}
                              disabled={isLoadingProfileChanges}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve Changes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
