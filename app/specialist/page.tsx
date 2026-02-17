"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  User,
  Users,
  Target,
  Award,
  TrendingUp,
} from "lucide-react"

export default function SpecialistDashboard() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [consultations, setConsultations] = useState<any[]>([])
  const [athletes, setAthletes] = useState<Record<string, any>>({})
  const [coachCache, setCoachCache] = useState<Record<string, any>>({})
  const [athletePlans, setAthletePlans] = useState<Record<string, any>>({})
  
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/users?role=specialist&limit=1", { cache: "no-store" })
        const data = await res.json()
        setCurrentUser(data.users?.[0] || null)
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
        const [consultationsRes, athletesRes] = await Promise.all([
          fetch(`/api/consultations?specialistId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
        ])

        const consultationsData = await consultationsRes.json()
        const athletesData = await athletesRes.json()

        setConsultations(consultationsData.consultations || [])
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

  const completedConsultations = useMemo(
    () => consultations.filter(c => c.status === "completed"),
    [consultations]
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Consultations</p>
                  <p className="text-2xl font-bold text-foreground">{completedStats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
              {completedStats.total > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">By Sport:</div>
                  {Object.entries(completedStats.bySport).map(([sport, count]) => (
                    <div key={sport} className="flex justify-between text-xs">
                      <span>{sport}</span>
                      <span>{count} ({Math.round((count / completedStats.total) * 100)}%)</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-2">By Coach:</div>
                  {Object.entries(completedStats.byCoach).map(([coach, count]) => (
                    <div key={coach} className="flex justify-between text-xs">
                      <span>{coach}</span>
                      <span>{count} ({Math.round((count / completedStats.total) * 100)}%)</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-2">By Program:</div>
                  {Object.entries(completedStats.byProgram).map(([program, count]) => (
                    <div key={program} className="flex justify-between text-xs">
                      <span>{program}</span>
                      <span>{count} ({Math.round((count / completedStats.total) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                  <p className="text-2xl font-bold text-foreground">{activeClientsStats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
              </div>
              {activeClientsStats.total > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">By Sport:</div>
                  {Object.entries(activeClientsStats.bySport).map(([sport, count]) => (
                    <div key={sport} className="flex justify-between text-xs">
                      <span>{sport}</span>
                      <span>{count} ({Math.round((count / activeClientsStats.total) * 100)}%)</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-2">By Coach:</div>
                  {Object.entries(activeClientsStats.byCoach).map(([coach, count]) => (
                    <div key={coach} className="flex justify-between text-xs">
                      <span>{coach}</span>
                      <span>{count} ({Math.round((count / activeClientsStats.total) * 100)}%)</span>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-2">By Program:</div>
                  {Object.entries(activeClientsStats.byProgram).map(([program, count]) => (
                    <div key={program} className="flex justify-between text-xs">
                      <span>{program}</span>
                      <span>{count} ({Math.round((count / activeClientsStats.total) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content - Detailed Client Dashboard */}
        <Tabs defaultValue="active-clients" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active-clients">Active Clients</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
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
      </div>
    </DashboardLayout>
  )
}
