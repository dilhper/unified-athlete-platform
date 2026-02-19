"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Calendar, User } from "lucide-react"

export default function OfficialHistoryPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [verifiedAchievements, setVerifiedAchievements] = useState<any[]>([])
  const [rejectedAchievements, setRejectedAchievements] = useState<any[]>([])
  const [verifiedCertifications, setVerifiedCertifications] = useState<any[]>([])
  const [rejectedCertifications, setRejectedCertifications] = useState<any[]>([])
  const [userCache, setUserCache] = useState<Record<string, any>>({})

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
    const loadHistory = async () => {
      try {
        const [verifiedAchRes, rejectedAchRes, verifiedCertRes, rejectedCertRes] = await Promise.all([
          fetch("/api/verifications?type=achievement&status=verified", { cache: "no-store" }),
          fetch("/api/verifications?type=achievement&status=rejected", { cache: "no-store" }),
          fetch("/api/verifications?type=certification&status=verified", { cache: "no-store" }),
          fetch("/api/verifications?type=certification&status=rejected", { cache: "no-store" }),
        ])

        const verifiedAchData = await verifiedAchRes.json()
        const rejectedAchData = await rejectedAchRes.json()
        const verifiedCertData = await verifiedCertRes.json()
        const rejectedCertData = await rejectedCertRes.json()

        setVerifiedAchievements(verifiedAchData.verifications || [])
        setRejectedAchievements(rejectedAchData.verifications || [])
        setVerifiedCertifications(verifiedCertData.verifications || [])
        setRejectedCertifications(rejectedCertData.verifications || [])
      } catch (error) {
        console.error("Failed to load verification history", error)
      }
    }

    loadHistory()
  }, [])

  const myAchievementVerifications = useMemo(
    () => verifiedAchievements.concat(rejectedAchievements).filter(a => a.verified_by === currentUser?.id),
    [verifiedAchievements, rejectedAchievements, currentUser]
  )

  const myCertificationVerifications = useMemo(
    () => verifiedCertifications.concat(rejectedCertifications).filter(c => c.verified_by === currentUser?.id),
    [verifiedCertifications, rejectedCertifications, currentUser]
  )

  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    myAchievementVerifications.forEach((a: any) => a.athlete_id && ids.add(a.athlete_id))
    myCertificationVerifications.forEach((c: any) => c.coach_id && ids.add(c.coach_id))
    return Array.from(ids)
  }, [myAchievementVerifications, myCertificationVerifications])

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
        if (data?.user?.id) updates[data.user.id] = data.user
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

  const getUserById = (id?: string) => (id ? userCache[id] : undefined)

  return (
    <DashboardLayout role="official">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verification History</h1>
          <p className="text-muted-foreground">Your complete verification and review history</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold text-foreground">
                    {myAchievementVerifications.length + myCertificationVerifications.length}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-foreground">
                    {verifiedAchievements.length + verifiedCertifications.length}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-foreground">
                    {rejectedAchievements.length + rejectedCertifications.length}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  <p className="text-2xl font-bold text-foreground">{myAchievementVerifications.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement Verifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Achievement Verifications</CardTitle>
            <CardDescription>Your athlete achievement verification history</CardDescription>
          </CardHeader>
          <CardContent>
            {myAchievementVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No achievement verifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAchievementVerifications.map((achievement) => {
                  const athlete = getUserById(achievement.athlete_id)
                  return (
                    <div key={achievement.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        achievement.status === 'verified' ? 'bg-green-500/10' : 'bg-destructive/10'
                      }`}>
                        {achievement.status === 'verified' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{achievement.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{achievement.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {athlete?.name || "Unknown"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(achievement.verified_date || achievement.verifiedDate || '').toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge className={
                            achievement.status === 'verified'
                              ? 'bg-green-500/20 text-green-700 border-0'
                              : 'bg-destructive/20 text-destructive border-0'
                          }>
                            {achievement.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certification Verifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Certification Verifications</CardTitle>
            <CardDescription>Your coach certification verification history</CardDescription>
          </CardHeader>
          <CardContent>
            {myCertificationVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No certification verifications yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myCertificationVerifications.map((cert) => {
                  const coach = getUserById(cert.coach_id)
                  return (
                    <div key={cert.id} className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        cert.status === 'verified' ? 'bg-green-500/10' : 'bg-destructive/10'
                      }`}>
                        {cert.status === 'verified' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{cert.title}</h3>
                            <p className="text-sm text-muted-foreground">{cert.issuing_organization}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {coach?.name || "Unknown"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(cert.verified_date || cert.verifiedDate || '').toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge className={
                            cert.status === 'verified'
                              ? 'bg-green-500/20 text-green-700 border-0'
                              : 'bg-destructive/20 text-destructive border-0'
                          }>
                            {cert.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
