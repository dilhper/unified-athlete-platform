"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Users,
  ClipboardList,
  Trophy,
  TrendingUp,
  ChevronRight,
  Plus,
  Calendar,
  Star,
} from "lucide-react"

export default function CoachDashboard() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [athletes, setAthletes] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])

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
        const [plansRes, athletesRes, achievementsRes] = await Promise.all([
          fetch(`/api/training-plans?coachId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
          fetch(`/api/achievements`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const athletesData = await athletesRes.json()
        const achievementsData = await achievementsRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          athleteIds: plan.athlete_ids ?? plan.athleteIds ?? [],
          endDate: plan.end_date ?? plan.endDate,
          progress: plan.progress ?? 0,
        }))

        setTrainingPlans(normalizedPlans)
        setAthletes(athletesData.users || [])
        setAchievements(achievementsData.achievements || [])
      } catch (error) {
        console.error("Failed to load coach dashboard", error)
      }
    }

    loadData()
  }, [currentUser])

  const assignedAthleteIds = useMemo(() => new Set(trainingPlans.flatMap(p => p.athleteIds || [])), [trainingPlans])
  const assignedAthletes = useMemo(() => athletes.filter(a => assignedAthleteIds.has(a.id)), [athletes, assignedAthleteIds])
  const activePlans = useMemo(() => trainingPlans.filter(p => p.status === "active"), [trainingPlans])
  
  // Get athletes with their progress
  const athleteProgress = assignedAthletes.map(athlete => {
    const athletePlans = trainingPlans.filter(p => (p.athleteIds || []).includes(athlete.id))
    const avgProgress = athletePlans.length > 0 
      ? Math.round(athletePlans.reduce((sum, p) => sum + p.progress, 0) / athletePlans.length)
      : 0
    const athleteAchievements = achievements.filter((a: any) => (a.athlete_id ?? a.athleteId) === athlete.id && a.status === "verified")
    return { ...athlete, avgProgress, planCount: athletePlans.length, achievementCount: athleteAchievements.length }
  })

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading dashboard...</div>
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
  
  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, Coach {currentUser.name.split(" ")[0]}</h1>
            <p className="text-muted-foreground">Manage your athletes and training programs</p>
          </div>
          <Link href="/coach/training-plans/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Training Plan
            </Button>
          </Link>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Athletes</p>
                  <p className="text-2xl font-bold text-foreground">{assignedAthletes.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold text-foreground">{activePlans.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Plans</p>
                  <p className="text-2xl font-bold text-foreground">{trainingPlans.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {activePlans.length > 0 
                      ? Math.round(activePlans.reduce((sum, p) => sum + p.progress, 0) / activePlans.length)
                      : 0}%
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid gap-6">
          {/* Active Training Plans */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-foreground">Active Training Plans</CardTitle>
                <CardDescription>Monitor your athletes' progress</CardDescription>
              </div>
              <Link href="/coach/training-plans">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {activePlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active training plans</p>
                  <Link href="/coach/training-plans/new">
                    <Button className="mt-4 bg-primary text-primary-foreground">
                      Create Your First Plan
                    </Button>
                  </Link>
                </div>
              ) : (
                activePlans.slice(0, 4).map((plan) => {
                  const athletes = (plan.athleteIds || []).map((id: string) => athletes.find(u => u.id === id)).filter(Boolean)
                  
                  return (
                    <Link key={plan.id} href={`/coach/training-plans/${plan.id}`}>
                      <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
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
                          <Badge variant="outline" className="border-primary/50 text-primary">
                            {plan.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-foreground font-medium">{plan.progress}%</span>
                          </div>
                          <Progress value={plan.progress} className="h-2" />
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Ends {new Date(plan.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Athlete Progress */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-foreground">Athlete Progress</CardTitle>
              <CardDescription>Track your athletes' training progress</CardDescription>
            </div>
            <Link href="/coach/athletes">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {athleteProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No athletes assigned yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {athleteProgress.map((athlete) => (
                  <Link key={athlete.id} href={`/coach/athletes/${athlete.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {athlete.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{athlete.name}</p>
                          <p className="text-xs text-muted-foreground">{athlete.sport}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Progress</span>
                          <span className="text-foreground font-medium">{athlete.avgProgress}%</span>
                        </div>
                        <Progress value={athlete.avgProgress} className="h-2" />
                      </div>
                      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                        <span>{athlete.planCount} plans</span>
                        <span>{athlete.achievementCount} achievements</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
