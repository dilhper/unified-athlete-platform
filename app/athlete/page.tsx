"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Dumbbell,
  Briefcase,
  TrendingUp,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

export default function AthleteDashboard() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/users?role=athlete&limit=1", { cache: "no-store" })
        const data = await res.json()
        setCurrentUser(data.users?.[0] || null)
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

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [plansRes, achievementsRes, opportunitiesRes] = await Promise.all([
          fetch(`/api/training-plans?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/achievements?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/opportunities`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const achievementsData = await achievementsRes.json()
        const opportunitiesData = await opportunitiesRes.json()

        const rawPlans = plansData.trainingPlans || []
        const rawAchievements = achievementsData.achievements || []
        const rawOpportunities = opportunitiesData.opportunities || []

        const normalizedPlans = rawPlans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          coachId: plan.coach_id ?? plan.coachId,
          status: plan.status,
          mode: plan.mode,
          startDate: plan.start_date ?? plan.startDate,
          endDate: plan.end_date ?? plan.endDate,
          progress: plan.progress ?? 0,
          sessions: [],
        }))

        const planSessions = await Promise.all(
          normalizedPlans.map(async (plan: any) => {
            try {
              const sessionsRes = await fetch(`/api/training-sessions?planId=${plan.id}`, {
                cache: "no-store",
              })
              const sessionsData = await sessionsRes.json()
              const sessions = (sessionsData.sessions || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                date: s.date,
                completed: s.completed ?? false,
                mode: s.mode,
                duration: s.duration ?? 0,
              }))
              return { ...plan, sessions }
            } catch {
              return plan
            }
          })
        )

        setTrainingPlans(planSessions)
        setAchievements(
          rawAchievements.map((a: any) => ({
            ...a,
            athleteId: a.athlete_id ?? a.athleteId,
          }))
        )
        setOpportunities(
          rawOpportunities.map((o: any) => ({
            ...o,
            status: o.status ?? "open",
          }))
        )
      } catch (error) {
        console.error("Failed to load athlete dashboard", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentUser])

  const activePlans = useMemo(() => trainingPlans.filter(p => p.status === "active"), [trainingPlans])
  const verifiedAchievements = useMemo(() => achievements.filter(a => a.status === "verified"), [achievements])
  const pendingAchievements = useMemo(() => achievements.filter(a => a.status === "pending"), [achievements])
  const openOpportunities = useMemo(() => opportunities.filter(o => o.status === "open"), [opportunities])
  
  // Get upcoming sessions from active plans
  const upcomingSessions = activePlans.flatMap(plan => 
    (plan.sessions || []).filter(s => !s.completed).slice(0, 2).map(s => ({
      ...s,
      planName: plan.name,
      planId: plan.id
    }))
  ).slice(0, 4)

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">No athlete user found.</div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {currentUser.name.split(" ")[0]}</h1>
            <p className="text-muted-foreground">Track your progress and manage your athletic journey</p>
          </div>
          <div className="flex gap-2">
            <Link href="/athlete/achievements">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Trophy className="h-4 w-4 mr-2" />
                Add Achievement
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Plans</p>
                  <p className="text-2xl font-bold text-foreground">{activePlans.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verified</p>
                  <p className="text-2xl font-bold text-foreground">{verifiedAchievements.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">{pendingAchievements.length}</p>
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
                  <p className="text-sm text-muted-foreground">Opportunities</p>
                  <p className="text-2xl font-bold text-foreground">{openOpportunities.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Training Progress */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-foreground">Training Progress</CardTitle>
                <CardDescription>Your active training plans</CardDescription>
              </div>
              <Link href="/athlete/training">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading training plans...</div>
              ) : activePlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No active training plans</p>
                  <p className="text-sm">Your coach will assign you a training plan soon</p>
                </div>
              ) : (
                activePlans.map((plan) => (
                  <Link key={plan.id} href={`/athlete/training/${plan.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-foreground">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
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
                          <CheckCircle2 className="h-4 w-4" />
                          {(plan.sessions || []).filter(s => s.completed).length}/{(plan.sessions || []).length} sessions
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Ends {new Date(plan.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
          
          {/* Upcoming Sessions */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-foreground">Upcoming Sessions</CardTitle>
              <CardDescription>Your next training sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading sessions...</div>
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming sessions</p>
                </div>
              ) : (
                upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{session.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.planName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(session.date).toLocaleDateString()} • {session.duration} min
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Achievements & Opportunities */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Achievements */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-foreground">Recent Achievements</CardTitle>
                <CardDescription>Your latest accomplishments</CardDescription>
              </div>
              <Link href="/athlete/achievements">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {achievements.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    achievement.status === "verified" ? "bg-primary/10" : "bg-accent/10"
                  }`}>
                    {achievement.status === "verified" ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={achievement.status === "verified" ? "default" : "secondary"} className="text-xs">
                        {achievement.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(achievement.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Open Opportunities */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-foreground">Open Opportunities</CardTitle>
                <CardDescription>Scholarships, competitions & more</CardDescription>
              </div>
              <Link href="/athlete/opportunities">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {openOpportunities.slice(0, 3).map((opp) => (
                <div key={opp.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{opp.title}</p>
                    <p className="text-xs text-muted-foreground">{opp.organization}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs capitalize border-border">
                        {opp.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due {new Date(opp.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
