"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Dumbbell, 
  MessageSquare,
  User 
} from "lucide-react"

export default function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [plan, setPlan] = useState<any | null>(null)
  const [coach, setCoach] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
        console.error("Failed to load athlete user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const loadPlan = async () => {
      setIsLoading(true)
      try {
        const plansRes = await fetch(`/api/training-plans?athleteId=${currentUser.id}`, { cache: "no-store" })
        const plansData = await plansRes.json()
        const plans = (plansData.trainingPlans || []).map((p: any) => ({
          ...p,
          coachId: p.coach_id ?? p.coachId,
          startDate: p.start_date ?? p.startDate,
          endDate: p.end_date ?? p.endDate,
          progress: p.progress ?? 0,
        }))
        const found = plans.find((p: any) => p.id === id) || null

        if (!found) {
          setPlan(null)
          setCoach(null)
          setIsLoading(false)
          return
        }

        const sessionsRes = await fetch(`/api/training-sessions?planId=${found.id}`, { cache: "no-store" })
        const sessionsData = await sessionsRes.json()
        const sessions = (sessionsData.sessions || []).map((s: any) => ({
          ...s,
          completed: s.completed ?? false,
        }))

        const coachRes = await fetch(`/api/users/${found.coachId}`, { cache: "no-store" })
        const coachData = await coachRes.json()

        setPlan({ ...found, sessions })
        setCoach(coachData.user || null)
      } catch (error) {
        console.error("Failed to load training plan", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlan()
  }, [currentUser, id])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading training plan...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  if (isLoading) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading training plan...</div>
      </DashboardLayout>
    )
  }
  
  if (!plan) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-foreground mb-2">Training Plan Not Found</h2>
          <p className="text-muted-foreground mb-4">This training plan doesn't exist or has been removed.</p>
          <Link href="/athlete/training">
            <Button className="bg-primary text-primary-foreground">Back to Training</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }
  
  const completedSessions = plan.sessions.filter(s => s.completed).length
  const upcomingSessions = plan.sessions.filter(s => !s.completed)
  const completedSessionsList = plan.sessions.filter(s => s.completed)
  const progressValue = plan.sessions.length > 0
    ? Math.round((completedSessions / plan.sessions.length) * 100)
    : 0
  
  const handleCompleteSession = async (sessionId: string) => {
    await fetch(`/api/training-sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    })

    const sessionsRes = await fetch(`/api/training-sessions?planId=${plan.id}`, { cache: "no-store" })
    const sessionsData = await sessionsRes.json()
    const sessions = (sessionsData.sessions || []).map((s: any) => ({
      ...s,
      completed: s.completed ?? false,
    }))
    setPlan((prev: any) => ({ ...prev, sessions }))
  }
  
  const handleMessageCoach = async () => {
    if (!coach) return
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentUser.id,
        receiverId: coach.id,
        content: `Hi Coach! I have a question about the ${plan.name} training plan.`,
      }),
    })
    router.push("/messages")
  }
  
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/athlete/training" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training Plans
        </Link>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
              <Badge variant={
                plan.status === "active" ? "default" : 
                plan.status === "completed" ? "secondary" : "outline"
              } className={
                plan.status === "active" ? "bg-primary text-primary-foreground" : ""
              }>
                {plan.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{plan.description}</p>
          </div>
          
          {coach && (
            <Button 
              variant="outline" 
              className="border-border bg-transparent"
              onClick={handleMessageCoach}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Coach
            </Button>
          )}
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completedSessions}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Circle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{upcomingSessions.length}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{new Date(plan.startDate).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{new Date(plan.endDate).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">End Date</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Progress */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{completedSessions} of {plan.sessions.length} sessions completed</span>
                <span className="text-foreground font-medium">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-3" />
            </div>
          </CardContent>
        </Card>
        
        {/* Coach Info */}
        {coach && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground">Your Coach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{coach.name}</p>
                  <p className="text-sm text-muted-foreground">{coach.sport}</p>
                  {coach.rating && (
                    <p className="text-sm text-accent">Rating: {coach.rating}/5</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Sessions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upcoming Sessions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Upcoming Sessions</CardTitle>
              <CardDescription>Sessions you need to complete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm">All sessions completed!</p>
                </div>
              ) : (
                upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Dumbbell className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{session.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.date).toLocaleDateString()}
                          </span>
                          {session.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.duration} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleCompleteSession(session.id)}
                    >
                      Complete
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          
          {/* Completed Sessions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Completed Sessions</CardTitle>
              <CardDescription>Sessions you have finished</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedSessionsList.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No completed sessions yet</p>
                </div>
              ) : (
                completedSessionsList.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 p-4 rounded-lg bg-secondary/50">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{session.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                        {session.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.duration} min
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
