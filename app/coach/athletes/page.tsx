"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Users, Search, Trophy, ClipboardList, MessageSquare, UserPlus, CheckCircle, XCircle } from "lucide-react"

export default function CoachAthletesPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [athletes, setAthletes] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([])
  const [approvedRegistrations, setApprovedRegistrations] = useState<any[]>([])
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null)
  const [rejectionNotes, setRejectionNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

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

    const loadData = async () => {
      try {
        const [plansRes, athletesRes, achievementsRes, pendingRegsRes, approvedRegsRes] = await Promise.all([
          fetch(`/api/training-plans?coachId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
          fetch(`/api/achievements`, { cache: "no-store" }),
          fetch(`/api/sport-registrations?coachId=${currentUser.id}&status=pending`, { cache: "no-store" }),
          fetch(`/api/sport-registrations?coachId=${currentUser.id}&status=approved`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const athletesData = await athletesRes.json()
        const achievementsData = await achievementsRes.json()
        const pendingRegsData = await pendingRegsRes.json()
        const approvedRegsData = await approvedRegsRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          athleteIds: plan.athlete_ids ?? plan.athleteIds ?? [],
          progress: plan.progress ?? 0,
        }))

        setTrainingPlans(normalizedPlans)
        setAthletes(athletesData.users || [])
        setAchievements(achievementsData.achievements || [])
        setPendingRegistrations(pendingRegsData.registrations || [])
        setApprovedRegistrations(approvedRegsData.registrations || [])
      } catch (error) {
        console.error("Failed to load coach athletes", error)
      }
    }

    loadData()
  }, [currentUser])

  // Include athletes from both training plans AND approved sport registrations
  const assignedAthleteIds = useMemo(() => {
    const ids = new Set(trainingPlans.flatMap(p => p.athleteIds || []))
    // Add athletes with approved sport registrations
    approvedRegistrations.forEach(reg => {
      ids.add(reg.athlete_id)
    })
    return ids
  }, [trainingPlans, approvedRegistrations])
  
  const assignedAthletes = useMemo(() => athletes.filter(a => assignedAthleteIds.has(a.id)), [athletes, assignedAthleteIds])
  
  // Get athletes with their data
  const athleteData = assignedAthletes.map(athlete => {
    const athletePlans = trainingPlans.filter(p => (p.athleteIds || []).includes(athlete.id))
    const activePlans = athletePlans.filter(p => p.status === "active")
    const avgProgress = activePlans.length > 0 
      ? Math.round(activePlans.reduce((sum, p) => sum + p.progress, 0) / activePlans.length)
      : 0
    const athleteAchievements = achievements.filter((a: any) => (a.athlete_id ?? a.athleteId) === athlete.id)
    const verifiedAchievements = athleteAchievements.filter(a => a.status === "verified")
    return { 
      ...athlete, 
      avgProgress, 
      planCount: athletePlans.length,
      activePlanCount: activePlans.length,
      achievementCount: verifiedAchievements.length,
      totalAchievements: athleteAchievements.length
    }
  })
  
  const filteredAthletes = athleteData.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.sport?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading athletes...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">No coach user found.</div>
      </DashboardLayout>
    )
  }
  
  const handleMessageAthlete = async (athleteId: string, name: string) => {
    if (!currentUser) return
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentUser.id,
        receiverId: athleteId,
        content: `Hi ${name.split(" ")[0]}! Just checking in on your progress.`,
      }),
    })
  }
  
  const handleApproveRegistration = async (registrationId: string) => {
    if (!currentUser || isProcessing) return
    setIsProcessing(true)
    
    try {
      const res = await fetch(`/api/sport-registrations/${registrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        alert(`Failed to approve registration: ${errorData.error}`)
        return
      }
      
      // Refresh both pending AND approved registrations
      const [pendingRes, approvedRes] = await Promise.all([
        fetch(`/api/sport-registrations?coachId=${currentUser.id}&status=pending`, { cache: "no-store" }),
        fetch(`/api/sport-registrations?coachId=${currentUser.id}&status=approved`, { cache: "no-store" }),
      ])
      const pendingData = await pendingRes.json()
      const approvedData = await approvedRes.json()
      setPendingRegistrations(pendingData.registrations || [])
      setApprovedRegistrations(approvedData.registrations || [])
      
      alert('Sport registration approved successfully! The athlete now appears in your athletes list.')
    } catch (error) {
      console.error("Failed to approve registration:", error)
      alert('Error approving registration')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleRejectRegistration = async () => {
    if (!currentUser || !selectedRegistration || isProcessing) return
    setIsProcessing(true)
    
    try {
      const res = await fetch(`/api/sport-registrations/${selectedRegistration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "rejected",
          notes: rejectionNotes
        }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        alert(`Failed to reject registration: ${errorData.error}`)
        return
      }
      
      // Refresh pending registrations
      const refreshRes = await fetch(`/api/sport-registrations?coachId=${currentUser.id}&status=pending`, { cache: "no-store" })
      const refreshData = await refreshRes.json()
      setPendingRegistrations(refreshData.registrations || [])
      
      setShowRejectDialog(false)
      setSelectedRegistration(null)
      setRejectionNotes("")
      alert('Sport registration rejected')
    } catch (error) {
      console.error("Failed to reject registration:", error)
      alert('Error rejecting registration')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const openRejectDialog = (registration: any) => {
    setSelectedRegistration(registration)
    setShowRejectDialog(true)
  }
  
  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Athletes</h1>
          <p className="text-muted-foreground">Manage and track your assigned athletes</p>
        </div>
        
        {/* Pending Sport Registrations */}
        {pendingRegistrations.length > 0 && (
          <Card className="bg-card border-orange-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-foreground">Pending Sport Registrations</CardTitle>
              </div>
              <CardDescription>
                Athletes waiting for your approval to join training programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingRegistrations.map((registration: any) => {
                  const athlete = athletes.find(a => a.id === registration.athlete_id)
                  const calculateAge = (dob: string) => {
                    if (!dob) return null
                    const birthDate = new Date(dob)
                    const today = new Date()
                    let age = today.getFullYear() - birthDate.getFullYear()
                    const monthDiff = today.getMonth() - birthDate.getMonth()
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                      age--
                    }
                    return age
                  }
                  
                  const age = athlete?.date_of_birth ? calculateAge(athlete.date_of_birth) : null
                  
                  return (
                    <div 
                      key={registration.id} 
                      className="p-5 bg-secondary/30 rounded-lg border border-border hover:border-orange-500/50 transition-colors"
                    >
                      {/* Header with athlete name and actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {athlete?.name?.split(" ").map(n => n[0]).join("") || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground text-lg">
                                {athlete?.name || "Unknown Athlete"}
                              </p>
                              <Badge variant="outline" className="border-orange-500 text-orange-500">
                                Pending
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {registration.sport} • Priority {registration.priority}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500 text-green-500 hover:bg-green-500/10"
                            onClick={() => handleApproveRegistration(registration.id)}
                            disabled={isProcessing}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-500 hover:bg-red-500/10"
                            onClick={() => openRejectDialog(registration)}
                            disabled={isProcessing}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                      
                      {/* Athlete Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">School/Club</p>
                          <p className="text-sm font-medium text-foreground">
                            {athlete?.school_club || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Age</p>
                          <p className="text-sm font-medium text-foreground">
                            {age ? `${age} years` : "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">National Ranking</p>
                          <p className="text-sm font-medium text-foreground">
                            {athlete?.national_ranking ? `#${athlete.national_ranking}` : "Unranked"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">District</p>
                          <p className="text-sm font-medium text-foreground">
                            {athlete?.district || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Training Place</p>
                          <p className="text-sm font-medium text-foreground">
                            {athlete?.training_place || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Athlete Type</p>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {athlete?.athlete_type || "Not specified"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Bio section if available */}
                      {athlete?.bio && (
                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">About</p>
                          <p className="text-sm text-foreground line-clamp-2">
                            {athlete.bio}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{assignedAthletes.length}</p>
                <p className="text-sm text-muted-foreground">Total Athletes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{trainingPlans.length}</p>
                <p className="text-sm text-muted-foreground">Training Plans</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {athleteData.reduce((sum, a) => sum + a.achievementCount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Achievements</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Athletes Grid */}
        {filteredAthletes.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {searchQuery ? "No Athletes Found" : "No Athletes Assigned"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Create a training plan to assign athletes"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAthletes.map((athlete) => (
              <Card key={athlete.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {athlete.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-foreground">{athlete.name}</h3>
                        <p className="text-sm text-muted-foreground">{athlete.sport}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => handleMessageAthlete(athlete.id, athlete.name)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Progress</span>
                      <span className="text-foreground font-medium">{athlete.avgProgress}%</span>
                    </div>
                    <Progress value={athlete.avgProgress} className="h-2" />
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-secondary/50 rounded-lg p-2 text-center">
                      <p className="font-medium text-foreground">{athlete.activePlanCount}</p>
                      <p className="text-xs text-muted-foreground">Active Plans</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2 text-center">
                      <p className="font-medium text-foreground">{athlete.achievementCount}</p>
                      <p className="text-xs text-muted-foreground">Achievements</p>
                    </div>
                  </div>
                  
                  <Link href={`/coach/athletes/${athlete.id}`}>
                    <Button variant="outline" className="w-full border-border bg-transparent">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Sport Registration</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this registration (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRegistration && (
              <div className="bg-secondary/30 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Athlete</p>
                <p className="font-medium text-foreground">
                  {athletes.find(a => a.id === selectedRegistration.athlete_id)?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Sport</p>
                <p className="font-medium text-foreground">{selectedRegistration.sport}</p>
              </div>
            )}
            <Textarea
              placeholder="Optional: Explain why this registration is being rejected..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              className="bg-input border-border min-h-[100px]"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false)
                  setSelectedRegistration(null)
                  setRejectionNotes("")
                }}
                disabled={isProcessing}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectRegistration}
                disabled={isProcessing}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isProcessing ? 'Rejecting...' : 'Reject Registration'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
