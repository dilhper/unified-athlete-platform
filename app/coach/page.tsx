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
  FileText,
  AlertCircle,
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function CoachDashboard() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [athletes, setAthletes] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [medicalLeaves, setMedicalLeaves] = useState<any[]>([])
  
  // Medical leave decision modal
  const [selectedMedicalLeave, setSelectedMedicalLeave] = useState<any | null>(null)
  const [coachDecision, setCoachDecision] = useState("")
  const [coachNotes, setCoachNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        const [plansRes, athletesRes, achievementsRes, medicalLeavesRes] = await Promise.all([
          fetch(`/api/training-plans?coachId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
          fetch(`/api/achievements`, { cache: "no-store" }),
          fetch(`/api/medical-leaves?coachId=${currentUser.id}`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const athletesData = await athletesRes.json()
        const achievementsData = await achievementsRes.json()
        const medicalLeavesData = await medicalLeavesRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          athleteIds: plan.athlete_ids ?? plan.athleteIds ?? [],
          endDate: plan.end_date ?? plan.endDate,
          progress: plan.progress ?? 0,
        }))

        setTrainingPlans(normalizedPlans)
        setAthletes(athletesData.users || [])
        setAchievements(achievementsData.achievements || [])
        setMedicalLeaves(medicalLeavesData.medicalLeaves || [])
      } catch (error) {
        console.error("Failed to load coach dashboard", error)
      }
    }

    loadData()
  }, [currentUser])

  const handleCoachDecision = async () => {
    if (!selectedMedicalLeave || !coachDecision || !coachNotes) {
      alert("Please provide a decision and notes")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/medical-leaves/${selectedMedicalLeave.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_decision: coachDecision,
          coach_notes: coachNotes,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setMedicalLeaves(prev => prev.map(ml => ml.id === selectedMedicalLeave.id ? updated.medicalLeave : ml))
        setSelectedMedicalLeave(null)
        setCoachDecision("")
        setCoachNotes("")
        alert("Decision submitted successfully!")
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error submitting decision:", error)
      alert("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const assignedAthleteIds = useMemo(() => new Set(trainingPlans.flatMap(p => p.athleteIds || [])), [trainingPlans])
  const assignedAthletes = useMemo(() => athletes.filter(a => assignedAthleteIds.has(a.id)), [athletes, assignedAthleteIds])
  const activePlans = useMemo(() => trainingPlans.filter(p => p.status === "active"), [trainingPlans])
  const pendingMedicalLeaves = useMemo(() => medicalLeaves.filter(ml => ml.status === "pending_coach_decision"), [medicalLeaves])
  
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <p className="text-sm text-muted-foreground">Medical Leaves</p>
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
        
        {/* Medical Leave Decisions - Show if there are pending leaves */}
        {pendingMedicalLeaves.length > 0 && (
          <Card className="bg-card border-border border-yellow-500/30">
            <CardHeader className="bg-yellow-500/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-foreground">Medical Leave Decisions Required ({pendingMedicalLeaves.length})</CardTitle>
                  <CardDescription>Athletes waiting for your training decision after specialist review</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {pendingMedicalLeaves.map((leave) => (
                  <div key={leave.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {leave.athlete_name ? leave.athlete_name.split(" ").map(n => n[0]).join("") : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground">{leave.athlete_name}</h4>
                            <Badge className="bg-blue-500/20 text-blue-700 capitalize">
                              {leave.leave_type?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {leave.duration_days} days • {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-foreground mb-3">{leave.reason}</p>

                          {leave.specialist_review && (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <Label className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                  Specialist Review by Dr. {leave.specialist_name}
                                </Label>
                                {leave.specialist_recommendation && (
                                  <Badge className="bg-blue-600 text-white text-xs capitalize">
                                    {leave.specialist_recommendation.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{leave.specialist_review}</p>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Reviewed: {new Date(leave.specialist_reviewed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedMedicalLeave(leave)
                          setCoachDecision("")
                          setCoachNotes("")
                        }}
                        className="bg-primary text-primary-foreground"
                      >
                        Make Decision
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
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
                  const planAthletes = (plan.athleteIds || []).map((id: string) => athletes.find(u => u.id === id)).filter(Boolean)
                  
                  return (
                    <Link key={plan.id} href={`/coach/training-plans/${plan.id}`}>
                      <div className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {planAthletes.length > 0 ? planAthletes[0]?.name.split(" ").map(n => n[0]).join("") : "T"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium text-foreground">{plan.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {planAthletes.length === 1 
                                  ? planAthletes[0]?.name 
                                  : `${planAthletes.length} athletes`
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

        {/* Medical Leave Decision Dialog */}
        <Dialog open={!!selectedMedicalLeave} onOpenChange={() => setSelectedMedicalLeave(null)}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Medical Leave Training Decision</DialogTitle>
              <DialogDescription>
                Make your final decision on the athlete's training based on the specialist's medical review
              </DialogDescription>
            </DialogHeader>
            {selectedMedicalLeave && (
              <div className="space-y-4 py-4">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Athlete</Label>
                      <p className="font-medium text-foreground">{selectedMedicalLeave.athlete_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Leave Type</Label>
                      <p className="font-medium text-foreground capitalize">{selectedMedicalLeave.leave_type?.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Duration</Label>
                      <p className="font-medium text-foreground">{selectedMedicalLeave.duration_days} days</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Period</Label>
                      <p className="font-medium text-foreground">
                        {new Date(selectedMedicalLeave.start_date).toLocaleDateString()} - {new Date(selectedMedicalLeave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Athlete's Reason</Label>
                    <p className="text-sm text-foreground">{selectedMedicalLeave.reason}</p>
                  </div>
                </div>

                {selectedMedicalLeave.specialist_review && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Medical Specialist Review - Dr. {selectedMedicalLeave.specialist_name}
                      </Label>
                    </div>
                    <p className="text-sm text-foreground mb-2">{selectedMedicalLeave.specialist_review}</p>
                    {selectedMedicalLeave.specialist_recommendation && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Recommendation:</Label>
                        <Badge className="bg-blue-600 text-white capitalize">
                          {selectedMedicalLeave.specialist_recommendation.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-foreground">Your Training Decision *</Label>
                  <RadioGroup value={coachDecision} onValueChange={setCoachDecision}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50">
                      <RadioGroupItem value="stop_training" id="stop" />
                      <label htmlFor="stop" className="flex-1 cursor-pointer">
                        <p className="font-medium text-foreground">Stop Training</p>
                        <p className="text-xs text-muted-foreground">Athlete must take complete rest from all training activities</p>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50">
                      <RadioGroupItem value="continue_modified" id="modified" />
                      <label htmlFor="modified" className="flex-1 cursor-pointer">
                        <p className="font-medium text-foreground">Continue with Modified Training</p>
                        <p className="text-xs text-muted-foreground">Athlete can train with adjustments and reduced intensity</p>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-secondary/50">
                      <RadioGroupItem value="continue_normal" id="normal" />
                      <label htmlFor="normal" className="flex-1 cursor-pointer">
                        <p className="font-medium text-foreground">Continue Normal Training</p>
                        <p className="text-xs text-muted-foreground">Athlete can maintain current training program without changes</p>
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-foreground">Coach Notes & Instructions *</Label>
                  <Textarea
                    id="notes"
                    placeholder="Provide detailed instructions for the athlete on training adjustments, recovery plan, or any other guidance..."
                    value={coachNotes}
                    onChange={(e) => setCoachNotes(e.target.value)}
                    className="bg-input border-border min-h-[120px]"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-1">Important:</p>
                      <p className="text-muted-foreground">
                        Your decision will be communicated to the athlete via the platform's messaging system. 
                        Please provide clear, actionable guidance based on the specialist's medical recommendation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMedicalLeave(null)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCoachDecision}
                    disabled={isSubmitting || !coachDecision || !coachNotes}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Decision"}
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
