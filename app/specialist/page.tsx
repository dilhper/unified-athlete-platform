"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle,
  User,
  Users,
  Target,
  Award,
  TrendingUp,
  Stethoscope,
  FileText,
  AlertCircle,
  Clock,
} from "lucide-react"

export default function SpecialistDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [consultations, setConsultations] = useState<any[]>([])
  const [pendingConsultations, setPendingConsultations] = useState<any[]>([])
  const [medicalLeaves, setMedicalLeaves] = useState<any[]>([])
  const [athletes, setAthletes] = useState<Record<string, any>>({})
  const [coachCache, setCoachCache] = useState<Record<string, any>>({})
  const [athletePlans, setAthletePlans] = useState<Record<string, any>>({})
  
  // Modal states for reviewing
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null)
  const [selectedMedicalLeave, setSelectedMedicalLeave] = useState<any | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewFormData, setReviewFormData] = useState<any>({})
  
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
        console.error("Failed to load specialist user", error)
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
        const [myConsultationsRes, pendingConsultationsRes, medicalLeavesRes, athletesRes] = await Promise.all([
          fetch(`/api/consultations?specialistId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/consultations?status=pending`, { cache: "no-store" }),
          fetch(`/api/medical-leaves?specialistId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
        ])

        const myConsultationsData = await myConsultationsRes.json()
        const pendingConsultationsData = await pendingConsultationsRes.json()
        const medicalLeavesData = await medicalLeavesRes.json()
        const athletesData = await athletesRes.json()

        setConsultations(myConsultationsData.consultations || [])
        setPendingConsultations(pendingConsultationsData.consultations || [])
        setMedicalLeaves(medicalLeavesData.medicalLeaves || [])
        
        const athleteMap: Record<string, any> = {}
        ;(athletesData.users || []).forEach((athlete: any) => {
          athleteMap[athlete.id] = {
            ...athlete,
            profileVerified: athlete.profile_verified ?? athlete.profileVerified,
            createdAt: athlete.created_at ?? athlete.createdAt,
          }
        })
        setAthletes(athleteMap)
      } catch (error) {
        console.error("Failed to load specialist dashboard", error)
      }
    }

    loadData()
  }, [currentUser])

  // Handlers for consultations and medical leaves
  const handleAcceptConsultation = async (consultationId: string) => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialist_id: currentUser.id }),
      })
      
      if (res.ok) {
        // Refresh data
        const updatedConsultation = await res.json()
        setPendingConsultations(prev => prev.filter(c => c.id !== consultationId))
        setConsultations(prev => [...prev, updatedConsultation.consultation])
        alert("Consultation accepted successfully!")
      } else {
        alert("Failed to accept consultation")
      }
    } catch (error) {
      console.error("Error accepting consultation:", error)
      alert("An error occurred")
    }
  }

  const handleReviewMedicalLeave = async () => {
    if (!selectedMedicalLeave) return
    
    setIsReviewing(true)
    try {
      const res = await fetch(`/api/medical-leaves/${selectedMedicalLeave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialist_review: reviewFormData.specialist_review,
          specialist_recommendation: reviewFormData.specialist_recommendation,
        }),
      })
      
      if (res.ok) {
        // Refresh medical leaves
        const updatedLeave = await res.json()
        setMedicalLeaves(prev => prev.map(ml => ml.id === selectedMedicalLeave.id ? updatedLeave.medicalLeave : ml))
        setSelectedMedicalLeave(null)
        setReviewFormData({})
        alert("Medical leave reviewed successfully!")
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error reviewing medical leave:", error)
      alert("An error occurred")
    } finally {
      setIsReviewing(false)
    }
  }

  const completedConsultations = useMemo(
    () => consultations.filter(c => c.status === "completed"),
    [consultations]
  )

  const pendingMedicalLeaves = useMemo(
    () => medicalLeaves.filter(ml => ml.status === "pending_specialist_review"),
    [medicalLeaves]
  )

  const clientIds = useMemo(
    () => Array.from(new Set(consultations.map(c => c.athlete_id ?? c.athleteId))),
    [consultations]
  )

  useEffect(() => {
    const loadPlansAndCoaches = async () => {
      const updates: Record<string, any> = {}
      const coachUpdates: Record<string, any> = {}
      for (const athleteId of clientIds) {
        if (!athleteId) continue
        try {
          const plansRes = await fetch(`/api/training-plans?athleteId=${athleteId}`, { cache: "no-store" })
          const plansData = await plansRes.json()
          const activePlan = (plansData.trainingPlans || []).find((p: any) => p.status === 'active')
          updates[athleteId] = activePlan || null

          if (activePlan?.coach_id) {
            const coachRes = await fetch(`/api/users/${activePlan.coach_id}`, { cache: "no-store" })
            const coachData = await coachRes.json()
            if (coachData?.user?.id) {
              coachUpdates[coachData.user.id] = coachData.user
            }
          }
        } catch {
          updates[athleteId] = null
        }
      }

      if (Object.keys(updates).length > 0) setAthletePlans((prev) => ({ ...prev, ...updates }))
      if (Object.keys(coachUpdates).length > 0) setCoachCache((prev) => ({ ...prev, ...coachUpdates }))
    }

    if (clientIds.length > 0) loadPlansAndCoaches()
  }, [clientIds])

  const clientDetails = useMemo(() => {
    return clientIds
      .map((id) => {
        const client = athletes[id]
        if (!client) return null
        const clientConsultations = consultations.filter(c => (c.athlete_id ?? c.athleteId) === id)
        const activePlan = athletePlans[id]
        const coach = activePlan?.coach_id ? coachCache[activePlan.coach_id] : null

        return {
          ...client,
          consultations: clientConsultations,
          activePlan,
          coach,
          primarySport: client.sport,
          scheduledCount: clientConsultations.filter(c => c.status === 'scheduled').length,
          completedCount: clientConsultations.filter(c => c.status === 'completed').length,
          cancelledCount: clientConsultations.filter(c => c.status === 'cancelled').length,
        }
      })
      .filter(Boolean)
  }, [clientIds, athletes, consultations, athletePlans, coachCache])
  
  // Calculate statistics for completed consultations and active clients
  const completedStats = {
    total: completedConsultations.length,
    bySport: {} as Record<string, number>,
    byCoach: {} as Record<string, number>,
    byProgram: {} as Record<string, number>
  }
  
  const activeClientsStats = {
    total: clientDetails.length,
    bySport: {} as Record<string, number>,
    byCoach: {} as Record<string, number>,
    byProgram: {} as Record<string, number>
  }
  
  // Calculate completed consultations stats
  completedConsultations.forEach(consultation => {
    const athleteDetail = clientDetails.find(c => c?.id === (consultation.athlete_id ?? consultation.athleteId))
    
    if (athleteDetail?.primarySport) {
      completedStats.bySport[athleteDetail.primarySport] = (completedStats.bySport[athleteDetail.primarySport] || 0) + 1
    }
    
    if (athleteDetail?.coach?.name) {
      completedStats.byCoach[athleteDetail.coach.name] = (completedStats.byCoach[athleteDetail.coach.name] || 0) + 1
    }
    
    if (athleteDetail?.activePlan?.name) {
      completedStats.byProgram[athleteDetail.activePlan.name] = (completedStats.byProgram[athleteDetail.activePlan.name] || 0) + 1
    }
  })
  
  // Calculate active clients stats
  clientDetails.filter(client => client !== null).forEach(client => {
    if (client.primarySport) {
      activeClientsStats.bySport[client.primarySport] = (activeClientsStats.bySport[client.primarySport] || 0) + 1
    }
    
    if (client.coach?.name) {
      activeClientsStats.byCoach[client.coach.name] = (activeClientsStats.byCoach[client.coach.name] || 0) + 1
    }
    
    if (client.activePlan?.name) {
      activeClientsStats.byProgram[client.activePlan.name] = (activeClientsStats.byProgram[client.activePlan.name] || 0) + 1
    }
  })
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/20 text-destructive"
      case "medium":
        return "bg-accent/20 text-accent"
      case "low":
        return "bg-primary/20 text-primary"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getAthleteById = (id?: string) => (id ? athletes[id] : undefined)

  if (isLoadingUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">No specialist user found.</div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout role="specialist">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {currentUser.name}</h1>
          <p className="text-muted-foreground">Monitor your clients and manage athlete care</p>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Consultations</p>
                  <p className="text-2xl font-bold text-foreground">{pendingConsultations.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Medical Leave Reviews</p>
                  <p className="text-2xl font-bold text-foreground">{pendingMedicalLeaves.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Consultations</p>
                  <p className="text-2xl font-bold text-foreground">{completedStats.total}</p>
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
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold text-foreground">{activeClientsStats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content - Detailed Client Dashboard */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Work</TabsTrigger>
            <TabsTrigger value="active-clients">Active Clients</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            {/* Pending Consultations */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Consultation Requests ({pendingConsultations.length})
                </CardTitle>
                <CardDescription>
                  New consultation requests from athletes waiting for specialist assignment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingConsultations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending consultation requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingConsultations.map((consultation) => {
                      const athleteId = consultation.athlete_id
                      const athlete = athletes[athleteId]
                      
                      return (
                        <div key={consultation.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {athlete?.name ? athlete.name.split(" ").map(n => n[0]).join("") : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-foreground">{athlete?.name || "Unknown"}</h4>
                                  <Badge className="bg-yellow-500/20 text-yellow-700">
                                    {consultation.urgency || "normal"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {consultation.consultation_type?.replace(/_/g, ' ')}
                                </p>
                                <p className="text-sm text-foreground mb-2">{consultation.reason}</p>
                                {consultation.symptoms && (
                                  <p className="text-xs text-muted-foreground">Symptoms: {consultation.symptoms}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  Requested: {new Date(consultation.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAcceptConsultation(consultation.id)}
                              className="bg-primary text-primary-foreground"
                            >
                              Accept
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Medical Leave Reviews */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Medical Leave Reviews ({pendingMedicalLeaves.length})
                </CardTitle>
                <CardDescription>
                  Medical leave requests requiring specialist review and recommendation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingMedicalLeaves.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending medical leave reviews</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingMedicalLeaves.map((leave) => {
                      const athleteId = leave.athlete_id
                      const athlete = athletes[athleteId]
                      
                      return (
                        <div key={leave.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {athlete?.name ? athlete.name.split(" ").map(n => n[0]).join("") : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-foreground">{athlete?.name || "Unknown"}</h4>
                                  <Badge className="bg-blue-500/20 text-blue-700">
                                    {leave.leave_type?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {leave.duration_days} days • {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-foreground mb-2">{leave.reason}</p>
                                <div className="flex items-center gap-2 mb-2 p-2 bg-background/50 rounded">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    Coach: {leave.coach_name || "Unknown"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Requested: {new Date(leave.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedMedicalLeave(leave)
                                setReviewFormData({})
                              }}
                              className="bg-primary text-primary-foreground"
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="active-clients" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Client Overview
                </CardTitle>
                <CardDescription>
                  Detailed information about your active clients, their programs, and coaches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientDetails.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No active clients</p>
                    <p className="text-sm">Athletes will request consultations soon</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientDetails.filter(client => client !== null).map((client) => (
                      <div key={client.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {client.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-medium text-foreground">{client.name}</h3>
                                <div className="flex gap-2">
                                  <Badge className="bg-primary/20 text-primary border-0">
                                    {client.scheduledCount} Scheduled
                                  </Badge>
                                  <Badge className="bg-primary/20 text-primary border-0">
                                    {client.completedCount} Completed
                                  </Badge>
                                  {client.cancelledCount > 0 && (
                                    <Badge className="bg-destructive/20 text-destructive border-0">
                                      {client.cancelledCount} Cancelled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Sport Community</p>
                                  <p className="font-medium text-foreground flex items-center gap-1">
                                    <Award className="h-3 w-3" />
                                    {client.primarySport || client.sport || 'Not specified'}
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-muted-foreground">Coach</p>
                                  <p className="font-medium text-foreground flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    {client.coach?.name || 'No assigned coach'}
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-muted-foreground">Training Program</p>
                                  <p className="font-medium text-foreground flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {client.activePlan?.name || 'No active program'}
                                  </p>
                                </div>
                              </div>
                              
                              {client.activePlan && (
                                <div className="mt-3 p-3 bg-background/50 rounded border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Program Progress</span>
                                    <span className="text-sm text-muted-foreground">{client.activePlan.progress}%</span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full" 
                                      style={{ width: `${client.activePlan.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-2 mt-4">
                                {client.activePlan && (
                                  <Button size="sm" variant="outline" className="border-border bg-transparent">
                                    Review Workouts
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Completed Consultations</CardTitle>
                <CardDescription>Your consultation history</CardDescription>
              </CardHeader>
              <CardContent>
                {completedConsultations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No completed consultations yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedConsultations.map((consultation) => {
                      const athleteId = consultation.athlete_id ?? consultation.athleteId
                      const athlete = getAthleteById(athleteId)
                      const athleteDetail = clientDetails.find(c => c?.id === athleteId)
                      
                      return (
                        <div key={consultation.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {athlete?.name ? athlete.name.split(" ").map(n => n[0]).join("") : "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground text-sm">{athlete?.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{consultation.notes || "Consultation"}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{athleteDetail?.primarySport || athleteDetail?.sport}</span>
                                <span>•</span>
                                <span>Coach: {athleteDetail?.coach?.name || 'N/A'}</span>
                                <span>•</span>
                                <span>Program: {athleteDetail?.activePlan?.name || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-primary/20 text-primary border-0">
                              Completed
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(consultation.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Medical Leave Review Dialog */}
        <Dialog open={!!selectedMedicalLeave} onOpenChange={() => setSelectedMedicalLeave(null)}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Review Medical Leave Request</DialogTitle>
              <DialogDescription>
                Provide your medical review and recommendation for the athlete's medical leave
              </DialogDescription>
            </DialogHeader>
            {selectedMedicalLeave && (
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Athlete</Label>
                      <p className="font-medium text-foreground">{selectedMedicalLeave.athlete_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Coach</Label>
                      <p className="font-medium text-foreground">{selectedMedicalLeave.coach_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Leave Type</Label>
                      <p className="font-medium text-foreground capitalize">{selectedMedicalLeave.leave_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <p className="font-medium text-foreground">{selectedMedicalLeave.duration_days} days</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">Reason</Label>
                    <p className="text-sm text-foreground">{selectedMedicalLeave.reason}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review" className="text-foreground">Medical Review *</Label>
                  <Textarea
                    id="review"
                    placeholder="Provide your medical assessment of the athlete's condition..."
                    value={reviewFormData.specialist_review || ""}
                    onChange={(e) => setReviewFormData({ ...reviewFormData, specialist_review: e.target.value })}
                    className="bg-input border-border min-h-[120px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recommendation" className="text-foreground">Recommendation *</Label>
                  <Select
                    value={reviewFormData.specialist_recommendation || ""}
                    onValueChange={(value) => setReviewFormData({ ...reviewFormData, specialist_recommendation: value })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select recommendation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve_full_rest">Approve - Full Rest Required</SelectItem>
                      <SelectItem value="approve_modified_training">Approve - Modified Training Allowed</SelectItem>
                      <SelectItem value="needs_examination">Needs Further Medical Examination</SelectItem>
                      <SelectItem value="reject">Reject - Not Medically Necessary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-1">Review Process:</p>
                      <p className="text-muted-foreground">
                        Your medical review and recommendation will be sent to the coach ({selectedMedicalLeave.coach_name}) 
                        who will make the final decision on training adjustments for the athlete.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMedicalLeave(null)}
                    disabled={isReviewing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReviewMedicalLeave}
                    disabled={isReviewing || !reviewFormData.specialist_review || !reviewFormData.specialist_recommendation}
                  >
                    {isReviewing ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
