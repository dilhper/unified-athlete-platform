"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Search,
  AlertCircle,
} from "lucide-react"

export default function OfficialVerificationsPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [achievements, setAchievements] = useState<any[]>([])
  const [certifications, setCertifications] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, any>>({})
  const [pendingSpecialists, setPendingSpecialists] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">("pending")

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

  const reloadData = async () => {
    if (!currentUser) return

    try {
      const [pendingAchRes, verifiedAchRes, rejectedAchRes, pendingCertRes, verifiedCertRes, rejectedCertRes, usersRes, pendingSpecialistsRes] = await Promise.all([
        fetch("/api/verifications?type=achievement&status=pending", { cache: "no-store" }),
        fetch("/api/verifications?type=achievement&status=verified", { cache: "no-store" }),
        fetch("/api/verifications?type=achievement&status=rejected", { cache: "no-store" }),
        fetch("/api/verifications?type=certification&status=pending", { cache: "no-store" }),
        fetch("/api/verifications?type=certification&status=verified", { cache: "no-store" }),
        fetch("/api/verifications?type=certification&status=rejected", { cache: "no-store" }),
        fetch("/api/users?limit=200", { cache: "no-store" }),
        fetch("/api/official/pending-specialists", { cache: "no-store" }),
      ])

      const pendingAchData = await pendingAchRes.json()
      const verifiedAchData = await verifiedAchRes.json()
      const rejectedAchData = await rejectedAchRes.json()
      const pendingCertData = await pendingCertRes.json()
      const verifiedCertData = await verifiedCertRes.json()
      const rejectedCertData = await rejectedCertRes.json()
      const usersData = await usersRes.json()
      const pendingSpecialistsData = await pendingSpecialistsRes.json()

      const normalizedAchievements = [
        ...(pendingAchData.verifications || []),
        ...(verifiedAchData.verifications || []),
        ...(rejectedAchData.verifications || []),
      ].map((a: any) => ({
        ...a,
        athleteId: a.athlete_id ?? a.athleteId,
        verifiedBy: a.verified_by ?? a.verifiedBy,
        verifiedDate: a.verified_date ?? a.verifiedDate,
      }))

      const normalizedCertifications = [
        ...(pendingCertData.verifications || []),
        ...(verifiedCertData.verifications || []),
        ...(rejectedCertData.verifications || []),
      ].map((c: any) => ({
        ...c,
        coachId: c.coach_id ?? c.coachId,
        issuingOrganization: c.issuing_organization ?? c.issuingOrganization,
        issueDate: c.issue_date ?? c.issueDate,
        expiryDate: c.expiry_date ?? c.expiryDate,
        credentialId: c.credential_id ?? c.credentialId,
        verifiedBy: c.verified_by ?? c.verifiedBy,
        verifiedDate: c.verified_date ?? c.verifiedDate,
      }))

      const userMap: Record<string, any> = {}
      ;(usersData.users || []).forEach((user: any) => {
        userMap[user.id] = user
      })

      setAchievements(normalizedAchievements)
      setCertifications(normalizedCertifications)
      setUsers(userMap)
      setPendingSpecialists(pendingSpecialistsData.specialists || [])
    } catch (error) {
      console.error("Failed to load verifications", error)
    }
  }

  useEffect(() => {
    reloadData()
  }, [currentUser])

  const getUserById = (id?: string) => (id ? users[id] : undefined)

  if (isLoadingUser) {
    return (
      <DashboardLayout role="official">
        <div className="text-muted-foreground">Loading verifications...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null
  
  const filteredAchievements = achievements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserById(a.athleteId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || a.status === filter
    return matchesSearch && matchesFilter
  })
  
  const filteredCertifications = certifications.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserById(c.coachId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || c.status === filter
    return matchesSearch && matchesFilter
  })
  
  const filteredSpecialists = pendingSpecialists.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.specialization && s.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesSearch
  })
  
  const pendingCount = achievements.filter(a => a.status === "pending").length + certifications.filter(c => c.status === "pending").length + pendingSpecialists.length
  const verifiedCount = achievements.filter(a => a.status === "verified").length + certifications.filter(c => c.status === "verified").length
  const rejectedCount = achievements.filter(a => a.status === "rejected").length + certifications.filter(c => c.status === "rejected").length
  
  const handleQuickVerify = async (achievementId: string) => {
    await fetch(`/api/achievements/${achievementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "verified", verifiedBy: currentUser.id }),
    })
    await reloadData()
  }

  const handleQuickReject = async (achievementId: string) => {
    await fetch(`/api/achievements/${achievementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", verifiedBy: currentUser.id }),
    })
    await reloadData()
  }

  const handleCertificationVerify = async (certificationId: string) => {
    await fetch(`/api/certifications/${certificationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "verified", verifiedBy: currentUser.id }),
    })
    await reloadData()
  }

  const handleCertificationReject = async (certificationId: string) => {
    await fetch(`/api/certifications/${certificationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", verifiedBy: currentUser.id }),
    })
    await reloadData()
  }

  const handleSpecialistVerify = async (specialistId: string) => {
    await fetch(`/api/users/${specialistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileVerified: true,
        profilePendingVerification: false,
      }),
    })

    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: specialistId,
        title: "Profile Verified",
        message: "Your specialist profile has been verified and is now publicly visible.",
        type: "success",
      }),
    })

    await reloadData()
  }

  const handleSpecialistReject = async (specialistId: string) => {
    await fetch(`/api/users/${specialistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileVerified: false,
        profilePendingVerification: false,
      }),
    })

    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: specialistId,
        title: "Profile Verification Rejected",
        message: "Your profile submission was not approved. Please update your information and resubmit.",
        type: "warning",
      }),
    })

    await reloadData()
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-5 w-5 text-primary" />
      case "pending":
        return <AlertCircle className="h-5 w-5 text-accent" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return null
    }
  }
  
  return (
    <DashboardLayout role="official">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verifications</h1>
          <p className="text-muted-foreground">Review and verify athlete achievements</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search achievements or athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
              className={filter === "pending" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              <Clock className="h-4 w-4 mr-1" />
              Pending ({pendingCount})
            </Button>
            <Button
              variant={filter === "verified" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("verified")}
              className={filter === "verified" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Verified ({verifiedCount})
            </Button>
            <Button
              variant={filter === "rejected" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("rejected")}
              className={filter === "rejected" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejected ({rejectedCount})
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              All
            </Button>
          </div>
        </div>
        
        {/* Reviews List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              {filter === "all" ? "All Reviews" : 
               filter === "pending" ? "Pending Reviews" :
               filter === "verified" ? "Verified Submissions" : "Rejected Submissions"}
            </CardTitle>
            <CardDescription>
              {(filteredAchievements.length + filteredCertifications.length + filteredSpecialists.length)} {(filteredAchievements.length + filteredCertifications.length + filteredSpecialists.length) === 1 ? "submission" : "submissions"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(filteredAchievements.length + filteredCertifications.length + filteredSpecialists.length) === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Submissions Found</h3>
                <p>{filter === "pending" ? "No pending verifications" : "Try adjusting your search or filter"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Achievements */}
                {filteredAchievements.map((achievement) => {
                  const athlete = getUserById(achievement.athleteId)
                  const verifier = achievement.verifiedBy ? getUserById(achievement.verifiedBy) : null
                  
                  return (
                    <div 
                      key={achievement.id} 
                      className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        achievement.status === "verified" ? "bg-primary/10" :
                        achievement.status === "pending" ? "bg-accent/10" : "bg-destructive/10"
                      }`}>
                        {getStatusIcon(achievement.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{achievement.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Achievement • {athlete?.name}</p>
                          </div>
                          <Badge className={
                            achievement.status === "verified" ? "bg-primary/20 text-primary border-0" :
                            achievement.status === "pending" ? "bg-accent/20 text-accent border-0" :
                            "bg-destructive/20 text-destructive border-0"
                          }>
                            {achievement.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(achievement.date).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className="border-border">
                            {achievement.category}
                          </Badge>
                          {verifier && (
                            <span>Verified by {verifier.name}</span>
                          )}
                        </div>
                        
                        {achievement.status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => handleQuickVerify(achievement.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verify
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleQuickReject(achievement.id)}
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                            <Link href={`/official/verifications/${achievement.id}`}>
                              <Button size="sm" variant="ghost">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {/* Certifications */}
                {filteredCertifications.map((certification) => {
                  const coach = getUserById(certification.coachId)
                  const verifier = certification.verifiedBy ? getUserById(certification.verifiedBy) : null
                  
                  return (
                    <div 
                      key={certification.id} 
                      className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        certification.status === "verified" ? "bg-primary/10" :
                        certification.status === "pending" ? "bg-accent/10" : "bg-destructive/10"
                      }`}>
                        {getStatusIcon(certification.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{certification.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{certification.issuingOrganization}</p>
                            <p className="text-xs text-muted-foreground mt-1">Certification • {coach?.name}</p>
                          </div>
                          <Badge className={
                            certification.status === "verified" ? "bg-primary/20 text-primary border-0" :
                            certification.status === "pending" ? "bg-accent/20 text-accent border-0" :
                            "bg-destructive/20 text-destructive border-0"
                          }>
                            {certification.status}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Issued: {new Date(certification.issueDate).toLocaleDateString()}
                          </span>
                          {certification.expiryDate && (
                            <span>Expires: {new Date(certification.expiryDate).toLocaleDateString()}</span>
                          )}
                          {certification.credentialId && (
                            <span>ID: {certification.credentialId}</span>
                          )}
                          {verifier && (
                            <span>Verified by {verifier.name}</span>
                          )}
                        </div>
                        
                        {certification.status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => handleCertificationVerify(certification.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verify
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCertificationReject(certification.id)}
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                            <Link href={`/official/verifications/${certification.id}`}>
                              <Button size="sm" variant="ghost">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {/* Specialist Profiles */}
                {filteredSpecialists.map((specialist) => (
                  <div 
                    key={specialist.id} 
                    className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                  >
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 bg-accent/10`}>
                      <AlertCircle className="h-5 w-5 text-accent" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{specialist.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{specialist.specialization}</p>
                          <p className="text-xs text-muted-foreground mt-1">Specialist Profile • Pending Verification</p>
                        </div>
                        <Badge className="bg-accent/20 text-accent border-0">
                          Pending
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted for verification
                        </span>
                        {specialist.certifications && specialist.certifications.length > 0 && (
                          <span>{specialist.certifications.length} certification(s)</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          onClick={() => handleSpecialistVerify(specialist.id)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSpecialistReject(specialist.id)}
                          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
