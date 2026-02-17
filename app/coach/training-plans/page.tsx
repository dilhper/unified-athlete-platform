"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ClipboardList, Plus, Calendar, CheckCircle2, Clock, Pause } from "lucide-react"

export default function CoachTrainingPlansPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [athleteMap, setAthleteMap] = useState<Record<string, any>>({})

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/users?role=coach&limit=1", { cache: "no-store" })
        const data = await res.json()
        setCurrentUser(data.users?.[0] || null)
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
        const [plansRes, athletesRes] = await Promise.all([
          fetch(`/api/training-plans?coachId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const athletesData = await athletesRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          athleteIds: plan.athlete_ids ?? plan.athleteIds ?? [],
          endDate: plan.end_date ?? plan.endDate,
          progress: plan.progress ?? 0,
          sessions: [],
        }))

        const withSessions = await Promise.all(
          normalizedPlans.map(async (plan: any) => {
            try {
              const sessionsRes = await fetch(`/api/training-sessions?planId=${plan.id}`, { cache: "no-store" })
              const sessionsData = await sessionsRes.json()
              return { ...plan, sessions: sessionsData.sessions || [] }
            } catch {
              return plan
            }
          })
        )

        const map: Record<string, any> = {}
        ;(athletesData.users || []).forEach((athlete: any) => {
          map[athlete.id] = athlete
        })

        setTrainingPlans(withSessions)
        setAthleteMap(map)
      } catch (error) {
        console.error("Failed to load training plans", error)
      }
    }

    loadData()
  }, [currentUser])

  const activePlans = useMemo(() => trainingPlans.filter(p => p.status === "active"), [trainingPlans])
  const completedPlans = useMemo(() => trainingPlans.filter(p => p.status === "completed"), [trainingPlans])
  const pausedPlans = useMemo(() => trainingPlans.filter(p => p.status === "paused"), [trainingPlans])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading training plans...</div>
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
  
  const renderPlanCard = (plan: typeof trainingPlans[0]) => {
    const athletes = (plan.athleteIds || []).map((id: string) => athleteMap[id]).filter(Boolean)
    const completedSessions = (plan.sessions || []).filter((s: any) => s.completed).length
    
    return (
      <Link key={plan.id} href={`/coach/training-plans/${plan.id}`}>
        <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {athletes.length > 0 ? athletes[0]?.name.split(" ").map(n => n[0]).join("") : "T"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {athletes.length === 1 
                      ? athletes[0]?.name 
                      : `${athletes.length} athletes`
                    }
                  </p>
                </div>
              </div>
              <Badge variant={
                plan.status === "active" ? "default" : 
                plan.status === "completed" ? "secondary" : "outline"
              } className={plan.status === "active" ? "bg-primary text-primary-foreground" : ""}>
                {plan.status}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{plan.description}</p>
            
            {/* Progress */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{plan.progress}%</span>
              </div>
              <Progress value={plan.progress} className="h-2" />
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {completedSessions}/{(plan.sessions || []).length} sessions
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(plan.endDate).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }
  
  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Training Plans</h1>
            <p className="text-muted-foreground">Create and manage training programs for your athletes</p>
          </div>
          <Link href="/coach/training-plans/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Training Plan
            </Button>
          </Link>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activePlans.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedPlans.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Pause className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pausedPlans.length}</p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Active Plans */}
        {activePlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Active Plans</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activePlans.map(renderPlanCard)}
            </div>
          </div>
        )}
        
        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Completed Plans</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedPlans.map(renderPlanCard)}
            </div>
          </div>
        )}
        
        {/* Paused Plans */}
        {pausedPlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Paused Plans</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pausedPlans.map(renderPlanCard)}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {trainingPlans.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Training Plans Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first training plan to get started</p>
              <Link href="/coach/training-plans/new">
                <Button className="bg-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Training Plan
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
