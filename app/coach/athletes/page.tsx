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
import { Users, Search, Trophy, ClipboardList, MessageSquare } from "lucide-react"
export default function CoachAthletesPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
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
          progress: plan.progress ?? 0,
        }))

        setTrainingPlans(normalizedPlans)
        setAthletes(athletesData.users || [])
        setAchievements(achievementsData.achievements || [])
      } catch (error) {
        console.error("Failed to load coach athletes", error)
      }
    }

    loadData()
  }, [currentUser])

  const assignedAthleteIds = useMemo(() => new Set(trainingPlans.flatMap(p => p.athleteIds || [])), [trainingPlans])
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
  
  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Athletes</h1>
          <p className="text-muted-foreground">Manage and track your assigned athletes</p>
        </div>
        
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
    </DashboardLayout>
  )
}
