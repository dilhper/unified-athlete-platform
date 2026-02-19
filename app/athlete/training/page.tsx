"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { TrainingModeRegistration } from "@/components/training-mode-registration"
import { DailyTrainingForm } from "@/components/daily-training-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dumbbell, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  User,
  Search,
  Plus,
  Stethoscope,
  AlertTriangle,
  Star,
  Radio,
  X
} from "lucide-react"

export default function AthleteTrainingPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [currentDate, setCurrentDate] = useState<string>("")
  
  const [searchQuery, setSearchQuery] = useState("")
  
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [specialists, setSpecialists] = useState<any[]>([])
  const [sportRegistrations, setSportRegistrations] = useState<any[]>([])

  useEffect(() => {
    // Set current date on client side to avoid hydration mismatch
    setCurrentDate(new Date().toISOString().split('T')[0])
    
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

    const loadData = async () => {
      try {
        const [plansRes, coachesRes, specialistsRes] = await Promise.all([
          fetch(`/api/training-plans?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=coach&limit=200`, { cache: "no-store" }),
          fetch(`/api/users?role=specialist&limit=200`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const coachesData = await coachesRes.json()
        const specialistsData = await specialistsRes.json()

        const normalizedPlans = (plansData.trainingPlans || []).map((plan: any) => ({
          ...plan,
          coachId: plan.coach_id ?? plan.coachId,
          endDate: plan.end_date ?? plan.endDate,
          startDate: plan.start_date ?? plan.startDate,
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

        setTrainingPlans(withSessions)
        setCoaches(coachesData.users || [])
        setSpecialists(specialistsData.users || [])
      } catch (error) {
        console.error("Failed to load athlete training data", error)
      }
    }

    loadData()
  }, [currentUser])

  const activePlans = useMemo(() => trainingPlans.filter(p => p.status === "active"), [trainingPlans])
  const completedPlans = useMemo(() => trainingPlans.filter(p => p.status === "completed"), [trainingPlans])
  const pausedPlans = useMemo(() => trainingPlans.filter(p => p.status === "paused"), [trainingPlans])
  
  const [showTrainingModes, setShowTrainingModes] = useState(false)
  const [selectedTrainingPlan, setSelectedTrainingPlan] = useState<any>(null)
  const [showDailyForm, setShowDailyForm] = useState(false)
  const [registeredMode, setRegisteredMode] = useState<'physical' | 'online' | null>(null)

  const coachMap = useMemo(() => {
    const map: Record<string, any> = {}
    coaches.forEach((coach) => {
      map[coach.id] = coach
    })
    return map
  }, [coaches])

  const specialistMap = useMemo(() => {
    const map: Record<string, any> = {}
    specialists.forEach((specialist) => {
      map[specialist.id] = specialist
    })
    return map
  }, [specialists])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading training...</div>
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
  
  // New handler functions
  

  
  const handleTrainingModeRegistration = (mode: 'physical' | 'online', evidence: any, files: any) => {
    console.log('Registered mode:', mode)
    console.log('Evidence:', evidence)
    console.log('Files:', files)
    setRegisteredMode(mode)
    setShowTrainingModes(false)
  }

  const handleDailyFormSubmit = (data: any, files: any) => {
    console.log('Daily training form submitted:', data)
    console.log('Evidence files:', files)
  }
  
  const renderPlanCard = (plan: typeof trainingPlans[0]) => {
    const coach = coachMap[plan.coachId]
    const completedSessions = (plan.sessions || []).filter((s: any) => s.completed).length
    
    return (
      <Link key={plan.id} href={`/athlete/training/${plan.id}`}>
        <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-foreground text-lg">{plan.name}</CardTitle>
                <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
              </div>
              <Badge variant={
                plan.status === "active" ? "default" : 
                plan.status === "completed" ? "secondary" : "outline"
              } className={
                plan.status === "active" ? "bg-primary text-primary-foreground" :
                plan.status === "completed" ? "bg-primary/20 text-primary" : ""
              }>
                {plan.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{plan.progress}%</span>
              </div>
              <Progress value={plan.progress} className="h-2" />
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span>{completedSessions}/{(plan.sessions || []).length} sessions</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(plan.endDate).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* Coach */}
            {coach && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Coach: {coach.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    )
  }
  
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Training Management</h1>
            <p className="text-muted-foreground">Manage your sports, training plans, and medical care</p>
          </div>
          
          <div className="flex gap-2">
            {/* Specialist Consultations Link */}
            <Link href="/athlete/consultations">
              <Button variant="outline" className="border-border w-full">
                <Stethoscope className="h-4 w-4 mr-2" />
                Request Specialist Consultation
              </Button>
            </Link>
            
            {/* Medical Leave Request Link */}
            <Link href="/athlete/medical-leaves">
              <Button variant="outline" className="border-border w-full">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Request Medical Leave
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sports and coaches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activePlans.length}</p>
                <p className="text-sm text-muted-foreground">Active Plans</p>
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
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pausedPlans.length}</p>
                <p className="text-sm text-muted-foreground">Paused</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{sportRegistrations.length}</p>
                <p className="text-sm text-muted-foreground">Sport Registrations</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sport Registrations */}
        {sportRegistrations.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Your Sport Registrations</CardTitle>
              <CardDescription>Multi-sport registrations with priority levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sportRegistrations.map((reg) => {
                  const coach = coachMap[reg.coachId]
                  const coachName = coach?.name || 'Loading...'
                  return (
                    <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          reg.status === 'approved' ? 'bg-primary/10' :
                          reg.status === 'pending' ? 'bg-accent/10' : 'bg-destructive/10'
                        }`}>
                          {reg.status === 'approved' ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : reg.status === 'pending' ? (
                            <Clock className="h-4 w-4 text-accent" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{reg.sport}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>Coach: {coachName}</span>
                            <span>•</span>
                            <span>Priority: {reg.priority}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          reg.status === 'approved' ? 'bg-primary/20 text-primary' :
                          reg.status === 'pending' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'
                        }>
                          {reg.status}
                        </Badge>
                        {reg.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleCancelRegistration(reg.id, reg.sport)}
                            title="Cancel registration"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Active Plans */}
        {activePlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Active Plans</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {activePlans.map(renderPlanCard)}
            </div>
          </div>
        )}
        
        {/* Completed Plans */}
        {completedPlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Completed Plans</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {completedPlans.map(renderPlanCard)}
            </div>
          </div>
        )}
        
        {/* Paused Plans */}
        {pausedPlans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Paused Plans</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {pausedPlans.map(renderPlanCard)}
            </div>
          </div>
        )}
        
        {/* Training Modes & Daily Forms */}
        {trainingPlans.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Training Modes & Progress</CardTitle>
              <CardDescription>Select your training mode and track daily progress</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="modes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="modes" className="text-foreground">Select Training Mode</TabsTrigger>
                  <TabsTrigger value="daily" className="text-foreground">Daily Training Log</TabsTrigger>
                </TabsList>
                
                {/* Training Mode Selection */}
                <TabsContent value="modes" className="space-y-4 pt-4">
                  <div className="space-y-3">
                    {trainingPlans.map((plan) => (
                      <div key={plan.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{plan.name}</h3>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                          {registeredMode && selectedTrainingPlan?.id === plan.id && (
                            <Badge className="bg-green-500/20 text-green-700">
                              {registeredMode === 'physical' ? '🏋️ Physical' : '💻 Online'}
                            </Badge>
                          )}
                        </div>
                        
                        {selectedTrainingPlan?.id === plan.id ? (
                          <TrainingModeRegistration
                            plan={plan}
                            athleteId="athlete-1"
                            isLoading={false}
                            onSubmit={handleTrainingModeRegistration}
                          />
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTrainingPlan(plan)}
                            className="border-border"
                          >
                            <Radio className="h-4 w-4 mr-2" />
                            Select Training Mode
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                {/* Daily Training Log */}
                <TabsContent value="daily" className="space-y-4 pt-4">
                  {registeredMode ? (
                    <div className="space-y-4">
                      <div className="bg-muted/50 border border-border rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-1">Selected Training Mode</p>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          <span className="font-medium text-foreground">
                            {registeredMode === 'physical' ? '🏋️ Physical Training' : '💻 Online Training'}
                          </span>
                        </div>
                      </div>
                      
                      <DailyTrainingForm
                        sessionId="session-1"
                        athleteId="athlete-1"
                        sessionDate={currentDate}
                        isLoading={false}
                        isOnlineMode={registeredMode === 'online'}
                        onSubmit={handleDailyFormSubmit}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Select a training mode first to log daily progress</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        {/* Empty State */}
        {trainingPlans.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Dumbbell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Training Plans Yet</h3>
              <p className="text-muted-foreground mb-4">Your coach will assign training plans to help you reach your goals</p>
              <Button variant="outline" className="border-border bg-transparent">
                Contact Your Coach
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
