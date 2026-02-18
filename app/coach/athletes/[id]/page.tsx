"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  Trophy, 
  ClipboardList, 
  MessageSquare, 
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  User,
  Mail
} from "lucide-react"

export default function CoachAthleteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [athlete, setAthlete] = useState<any | null>(null)
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
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
        console.error("Failed to load coach user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!currentUser || !id) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [athleteRes, plansRes, achievementsRes] = await Promise.all([
          fetch(`/api/users/${id}`, { cache: "no-store" }),
          fetch(`/api/training-plans?coachId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/achievements?athleteId=${id}`, { cache: "no-store" }),
        ])

        const athleteData = await athleteRes.json()
        const plansData = await plansRes.json()
        const achievementsData = await achievementsRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          athleteIds: plan.athlete_ids ?? plan.athleteIds ?? [],
          endDate: plan.end_date ?? plan.endDate,
          startDate: plan.start_date ?? plan.startDate,
          progress: plan.progress ?? 0,
        }))

        setAthlete(athleteData.user || null)
        setTrainingPlans(normalizedPlans)
        setAchievements(
          (achievementsData.achievements || []).map((a: any) => ({
            ...a,
            athleteId: a.athlete_id ?? a.athleteId,
          }))
        )
      } catch (error) {
        console.error("Failed to load athlete details", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentUser, id])

  const athletePlans = useMemo(
    () => trainingPlans.filter((p) => (p.athleteIds || []).includes(id)),
    [trainingPlans, id]
  )
  const athleteAchievements = useMemo(
    () => achievements.filter((a) => a.athleteId === id),
    [achievements, id]
  )

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading athlete...</div>
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

  if (isLoading) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading athlete...</div>
      </DashboardLayout>
    )
  }
  
  if (!athlete) {
    return (
      <DashboardLayout role="coach">
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-foreground mb-2">Athlete Not Found</h2>
          <p className="text-muted-foreground mb-4">This athlete doesn't exist or has been removed.</p>
          <Link href="/coach/athletes">
            <Button className="bg-primary text-primary-foreground">Back to Athletes</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }
  
  const activePlans = athletePlans.filter(p => p.status === "active")
  const completedPlans = athletePlans.filter(p => p.status === "completed")
  const verifiedAchievements = athleteAchievements.filter(a => a.status === "verified")
  const pendingAchievements = athleteAchievements.filter(a => a.status === "pending")
  
  const avgProgress = activePlans.length > 0 
    ? Math.round(activePlans.reduce((sum, p) => sum + p.progress, 0) / activePlans.length)
    : 0
  
  const handleMessageAthlete = async () => {
    if (!currentUser || !athlete) return
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: athlete.id,
          content: `Hi ${athlete.name.split(" ")[0]}! Just checking in on your training progress.`,
        }),
      })
      router.push("/messages")
    } catch (error) {
      console.error("Failed to send message", error)
    }
  }
  
  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/coach/athletes" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Athletes
        </Link>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {athlete.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{athlete.name}</h1>
              <p className="text-muted-foreground">{athlete.sport}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-primary/20 text-primary border-0">Athlete</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="border-border bg-transparent"
              onClick={handleMessageAthlete}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Link href="/coach/training-plans/new">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ClipboardList className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{activePlans.length}</p>
                  <p className="text-xs text-muted-foreground">Active Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{verifiedAchievements.length}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{pendingAchievements.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{avgProgress}%</p>
                  <p className="text-xs text-muted-foreground">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Athlete Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Athlete Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground">{athlete.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground">{athlete.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Sport:</span>
                <span className="text-foreground">{athlete.sport || "Not specified"}</span>
              </div>
            </div>
            {athlete.bio && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bio:</p>
                <p className="text-sm text-foreground">{athlete.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Training Plans */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Training Plans</CardTitle>
            <CardDescription>Plans you have assigned to this athlete</CardDescription>
          </CardHeader>
          <CardContent>
            {athletePlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-4">No training plans assigned</p>
                <Link href="/coach/training-plans/new">
                  <Button className="bg-primary text-primary-foreground">
                    Create Training Plan
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {athletePlans.map((plan) => (
                  <Link key={plan.id} href={`/coach/training-plans/${plan.id}`}>
                    <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-foreground">{plan.name}</h4>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        <Badge variant={
                          plan.status === "active" ? "default" : 
                          plan.status === "completed" ? "secondary" : "outline"
                        } className={plan.status === "active" ? "bg-primary text-primary-foreground" : ""}>
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
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Achievements */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Achievements</CardTitle>
            <CardDescription>Athlete's accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            {athleteAchievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No achievements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {athleteAchievements.map((achievement) => (
                  <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      achievement.status === "verified" ? "bg-primary/10" : "bg-accent/10"
                    }`}>
                      {achievement.status === "verified" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Clock className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground">{achievement.title}</h4>
                        <Badge variant={achievement.status === "verified" ? "default" : "secondary"} 
                          className={achievement.status === "verified" ? "bg-primary/20 text-primary border-0" : ""}>
                          {achievement.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="border-border">{achievement.category}</Badge>
                        <span>{new Date(achievement.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
