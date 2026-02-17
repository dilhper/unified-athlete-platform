"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  MessageSquare,
} from "lucide-react"

export default function SpecialistConsultationsPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("scheduled")
  const [consultations, setConsultations] = useState<any[]>([])
  const [athletes, setAthletes] = useState<Record<string, any>>({})

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
          athleteMap[athlete.id] = athlete
        })
        setAthletes(athleteMap)
      } catch (error) {
        console.error("Failed to load consultations", error)
      }
    }

    loadData()
  }, [currentUser])
  
  const normalizedConsultations = useMemo(() => {
    return consultations.map((c) => ({
      ...c,
      athleteId: c.athlete_id ?? c.athleteId,
      status: c.status === 'pending' ? 'scheduled' : c.status,
      priority: c.priority || 'medium',
    }))
  }, [consultations])

  const filteredConsultations = normalizedConsultations.filter(c => {
    const athlete = athletes[c.athleteId]
    const matchesSearch = athlete?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.notes || 'consultation').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === "all" || c.status === filter

  if (isLoadingUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading consultations...</div>
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
    return matchesSearch && matchesFilter
  })
  
  const scheduledCount = normalizedConsultations.filter(c => c.status === "scheduled").length
  const completedCount = normalizedConsultations.filter(c => c.status === "completed").length
  const cancelledCount = normalizedConsultations.filter(c => c.status === "cancelled").length
  
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
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge className="bg-primary/20 text-primary border-0">Scheduled</Badge>
      case "completed":
        return <Badge className="bg-primary/20 text-primary border-0">Completed</Badge>
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive border-0">Cancelled</Badge>
      default:
        return null
    }
  }
  
  const handleCompleteConsultation = async (consultationId: string) => {
    await fetch(`/api/consultations/${consultationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    const res = await fetch(`/api/consultations?specialistId=${currentUser?.id}`, { cache: "no-store" })
    const data = await res.json()
    setConsultations(data.consultations || [])
  }
  
  const handleCancelConsultation = async (consultationId: string) => {
    await fetch(`/api/consultations/${consultationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    const res = await fetch(`/api/consultations?specialistId=${currentUser?.id}`, { cache: "no-store" })
    const data = await res.json()
    setConsultations(data.consultations || [])
  }
  
  const handleMessageAthlete = async (athleteId: string, athleteName: string) => {
    if (!currentUser) return
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentUser.id,
        receiverId: athleteId,
        content: `Hi ${athleteName.split(" ")[0]}! Following up on your consultation.`,
      }),
    })
  }
  
  return (
    <DashboardLayout role="specialist">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consultations</h1>
          <p className="text-muted-foreground">Manage all your athlete consultations</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes or consultation type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === "scheduled" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("scheduled")}
              className={filter === "scheduled" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              Scheduled ({scheduledCount})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
              className={filter === "completed" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              Completed ({completedCount})
            </Button>
            <Button
              variant={filter === "cancelled" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("cancelled")}
              className={filter === "cancelled" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              Cancelled ({cancelledCount})
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
        
        {/* Consultations List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              {filter === "all" ? "All Consultations" : 
               filter === "scheduled" ? "Scheduled Consultations" :
               filter === "completed" ? "Completed Consultations" : "Cancelled Consultations"}
            </CardTitle>
            <CardDescription>
              {filteredConsultations.length} {filteredConsultations.length === 1 ? "consultation" : "consultations"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredConsultations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Consultations Found</h3>
                <p>{filter === "scheduled" ? "No scheduled consultations" : "Try adjusting your search or filter"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConsultations.map((consultation) => {
                  const athlete = athletes[consultation.athleteId]
                  
                  return (
                    <div 
                      key={consultation.id} 
                      className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {athlete?.name ? athlete.name.split(" ").map(n => n[0]).join("") : "?"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-medium text-foreground">{athlete?.name}</h3>
                            <p className="text-sm text-muted-foreground">{consultation.notes || "Consultation"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(consultation.priority)}>
                              {consultation.priority}
                            </Badge>
                            {getStatusBadge(consultation.status)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(consultation.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {consultation.time}
                          </span>
                        </div>
                        
                        {consultation.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{consultation.notes}</p>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          {athlete && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-border bg-transparent"
                              onClick={() => handleMessageAthlete(athlete.id, athlete.name)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Message
                            </Button>
                          )}
                          {consultation.status === "scheduled" && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleCompleteConsultation(consultation.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                                onClick={() => handleCancelConsultation(consultation.id)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
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
