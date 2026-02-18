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
  Pause,
  AlertTriangle,
  Star,
  Upload,
  Radio,
  X
} from "lucide-react"

export default function AthleteTrainingPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [currentDate, setCurrentDate] = useState<string>("")
  
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSport, setSelectedSport] = useState("")
  const [selectedCoach, setSelectedCoach] = useState("")
  const [sportPriority, setSportPriority] = useState(1)
  const [isSportDialogOpen, setIsSportDialogOpen] = useState(false)
  
  const [isPhysioDialogOpen, setIsPhysioDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState("")
  const [physioReason, setPhysioReason] = useState("")
  
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState("")
  const [pauseReason, setPauseReason] = useState<'medical' | 'event' | 'exam' | 'other'>('medical')
  const [pauseDescription, setPauseDescription] = useState("")
  const [needsMedicalReferral, setNeedsMedicalReferral] = useState(false)
  const [pauseAttachments, setPauseAttachments] = useState<File[]>([])
  
  // New state variables for the action buttons
  const [showSportRegistration, setShowSportRegistration] = useState(false)
  const [showPhysioBooking, setShowPhysioBooking] = useState(false)
  const [showPauseRequest, setShowPauseRequest] = useState(false)
  const [showMedicalReferral, setShowMedicalReferral] = useState(false)
  const [medicalIssue, setMedicalIssue] = useState("")
  const [medicalUrgency, setMedicalUrgency] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium')
  const [selectedSpecialist, setSelectedSpecialist] = useState("")
  const [medicalDescription, setMedicalDescription] = useState("")
  
  const [trainingPlans, setTrainingPlans] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [specialists, setSpecialists] = useState<any[]>([])
  const [sportRegistrations, setSportRegistrations] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [physioAppointments, setPhysioAppointments] = useState<any[]>([])
  const [medicalReferrals, setMedicalReferrals] = useState<any[]>([])

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
        const [plansRes, coachesRes, specialistsRes, registrationsRes, slotsRes, appointmentsRes, referralsRes] = await Promise.all([
          fetch(`/api/training-plans?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=coach&limit=200`, { cache: "no-store" }),
          fetch(`/api/users?role=specialist&limit=200`, { cache: "no-store" }),
          fetch(`/api/sport-registrations?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/physio/slots?available=true`, { cache: "no-store" }),
          fetch(`/api/physio/appointments?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/medical-referrals?athleteId=${currentUser.id}`, { cache: "no-store" }),
        ])

        const plansData = await plansRes.json()
        const coachesData = await coachesRes.json()
        const specialistsData = await specialistsRes.json()
        const registrationsData = await registrationsRes.json()
        const slotsData = await slotsRes.json()
        const appointmentsData = await appointmentsRes.json()
        const referralsData = await referralsRes.json()

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
        setSportRegistrations(
          (registrationsData.registrations || []).map((reg: any) => ({
            ...reg,
            coachId: reg.coach_id ?? reg.coachId,
            athleteId: reg.athlete_id ?? reg.athleteId,
          }))
        )
        setAvailableSlots(slotsData.slots || [])
        setPhysioAppointments(
          (appointmentsData.appointments || []).map((appt: any) => ({
            ...appt,
            specialistId: appt.specialist_id ?? appt.specialistId,
          }))
        )
        setMedicalReferrals(
          (referralsData.referrals || []).map((ref: any) => ({
            ...ref,
            specialistId: ref.specialist_id ?? ref.specialistId,
          }))
        )
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
  
  const sports = ["Track & Field", "Swimming", "Basketball", "Soccer", "Tennis", "Volleyball", "Baseball", "Football"]

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
  
  const filteredCoaches = coaches.filter(coach => 
    coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coach.sport?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const filteredSports = sports

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
  const handleSportRegistration = async () => {
    if (!selectedSport || !selectedCoach) {
      alert("Please select both a sport and a coach")
      return
    }
    
    try {
      const response = await fetch("/api/sport-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: currentUser.id,
          sport: selectedSport,
          coachId: selectedCoach,
          priority: sportPriority,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to submit sport registration")
      }

      const refreshed = await fetch(`/api/sport-registrations?athleteId=${currentUser.id}`, { cache: "no-store" })
      const refreshedData = await refreshed.json()
      setSportRegistrations(refreshedData.registrations || [])
      
      // Show success message
      alert(`Sport registration submitted successfully! Your request to join ${selectedSport} is pending coach approval.`)
      
      // Close both dialogs (there are two sport registration dialogs in this component)
      setShowSportRegistration(false)
      setIsSportDialogOpen(false)
      
      // Reset form
      setSelectedSport("")
      setSelectedCoach("")
      setSportPriority(1)
    } catch (error: any) {
      console.error("Error submitting sport registration:", error)
      alert("Error: " + (error.message || "Failed to submit sport registration. Please try again."))
    }
  }
  
  const handleCancelRegistration = async (registrationId: string, sport: string) => {
    if (!confirm(`Are you sure you want to cancel your pending registration for ${sport}?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/sport-registrations/${registrationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to cancel registration")
      }

      // Refresh the sport registrations list
      const refreshed = await fetch(`/api/sport-registrations?athleteId=${currentUser.id}`, { cache: "no-store" })
      const refreshedData = await refreshed.json()
      setSportRegistrations(refreshedData.registrations || [])
      
      alert(`Your registration for ${sport} has been cancelled successfully.`)
    } catch (error: any) {
      console.error("Error cancelling sport registration:", error)
      alert("Error: " + (error.message || "Failed to cancel registration. Please try again."))
    }
  }
  
  const handlePhysioBooking = async () => {
    if (!selectedSlot || !physioReason) return
    
    const slot = availableSlots.find(s => s.id === selectedSlot)
    if (!slot) return
    
    await fetch("/api/physio/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId: currentUser.id,
        slotId: selectedSlot,
        reason: physioReason,
      }),
    })

    const refreshedAppointments = await fetch(`/api/physio/appointments?athleteId=${currentUser.id}`, { cache: "no-store" })
    const refreshedAppointmentsData = await refreshedAppointments.json()
    setPhysioAppointments(refreshedAppointmentsData.appointments || [])
    
    setShowPhysioBooking(false)
    setSelectedSlot("")
    setPhysioReason("")
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setPauseAttachments(prev => [...prev, ...newFiles])
    }
  }
  
  const removeAttachment = (index: number) => {
    setPauseAttachments(prev => prev.filter((_, i) => i !== index))
  }
  
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
  
  const resetPauseRequestForm = () => {
    setSelectedPlan("")
    setPauseReason('medical')
    setPauseDescription("")
    setNeedsMedicalReferral(false)
    setPauseAttachments([])
  }
  
  const handlePauseRequest = async () => {
    if (!selectedPlan || !pauseDescription) return
    
    const plan = trainingPlans.find(p => p.id === selectedPlan)
    if (!plan) return
    
    // Convert files to FileAttachment objects
    const attachments = pauseAttachments.map((file, index) => ({
      id: `attachment-${Date.now()}-${index}`,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'document' as 'image' | 'document',
      url: URL.createObjectURL(file), // In a real app, this would be uploaded to a server
      size: file.size,
      uploadedAt: new Date().toISOString()
    }))
    
    await fetch("/api/training-plan-pause-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: selectedPlan,
        athleteId: currentUser.id,
        coachId: plan.coachId,
        reason: pauseReason,
        description: pauseDescription,
        needsMedicalReferral,
        attachments: attachments.map(a => a.url),
      }),
    })
    
    setShowPauseRequest(false)
    setSelectedPlan("")
    setPauseDescription("")
    setNeedsMedicalReferral(false)
    setPauseAttachments([])
    setPauseAttachments([])
  }
  
  const handleMedicalReferral = async () => {
    if (!medicalIssue || !medicalDescription || !selectedSpecialist) return
    
    await fetch("/api/medical-referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId: currentUser.id,
        specialistId: selectedSpecialist,
        reason: medicalIssue,
        urgency: medicalUrgency,
        description: medicalDescription,
      }),
    })

    const refreshed = await fetch(`/api/medical-referrals?athleteId=${currentUser.id}`, { cache: "no-store" })
    const refreshedData = await refreshed.json()
    setMedicalReferrals(refreshedData.referrals || [])

    setShowMedicalReferral(false)
    setMedicalIssue("")
    setMedicalUrgency('medium')
    setSelectedSpecialist("")
    setMedicalDescription("")
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
            {/* Sport Registration Dialog */}
            <Dialog open={isSportDialogOpen} onOpenChange={setIsSportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Sport
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Register for New Sport</DialogTitle>
                  <DialogDescription>
                    Register for additional sports with coach approval
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Select Sport</Label>
                    <Select value={selectedSport} onValueChange={setSelectedSport}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Choose a sport" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {filteredSports.map((sport) => (
                          <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">Select Coach</Label>
                    <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Choose a coach" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {filteredCoaches.map((coach) => (
                          <SelectItem key={coach.id} value={coach.id}>
                            {coach.name} - {coach.sport}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-foreground">Priority (1-3)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="3"
                      value={sportPriority}
                      onChange={(e) => setSportPriority(parseInt(e.target.value))}
                      className="bg-input border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      1 = Primary sport, 2 = Secondary, 3 = Tertiary
                    </p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSportDialogOpen(false)}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSportRegistration}
                      className="bg-primary text-primary-foreground"
                      disabled={!selectedSport || !selectedCoach}
                    >
                      Submit for Approval
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Physiotherapy Dialog */}
            <Dialog open={isPhysioDialogOpen} onOpenChange={setIsPhysioDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Book Physiotherapy
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Book Physiotherapy Session</DialogTitle>
                  <DialogDescription>
                    Schedule a physiotherapy appointment (requires coach approval)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Available Slots</Label>
                    <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select a time slot" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {availableSlots.map((slot) => {
                          const specialist = specialists.find(s => s.id === slot.specialistId)
                          return (
                            <SelectItem key={slot.id} value={slot.id}>
                              {new Date(slot.date).toLocaleDateString()} at {slot.time} 
                              ({slot.duration}min) - {specialist?.name}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="physio-reason" className="text-foreground">Reason for Visit</Label>
                    <Textarea
                      id="physio-reason"
                      placeholder="Describe your physiotherapy needs..."
                      value={physioReason}
                      onChange={(e) => setPhysioReason(e.target.value)}
                      className="bg-input border-border min-h-[80px]"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsPhysioDialogOpen(false)}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePhysioBooking}
                      className="bg-primary text-primary-foreground"
                      disabled={!selectedSlot || !physioReason}
                    >
                      Request Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* Pause Request Dialog */}
            <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Pause className="h-4 w-4 mr-2" />
                  Request Pause
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Request Training Plan Pause</DialogTitle>
                  <DialogDescription>
                    Request to pause a training plan (requires coach approval)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Select Training Plan</Label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Choose a plan to pause" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {activePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {plan.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">Reason for Pause</Label>
                    <Select value={pauseReason} onValueChange={(value: any) => setPauseReason(value)}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="medical">Medical Issue</SelectItem>
                        <SelectItem value="event">Special Event</SelectItem>
                        <SelectItem value="exam">Exams</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pause-description" className="text-foreground">Description</Label>
                    <Textarea
                      id="pause-description"
                      placeholder="Provide details about your request..."
                      value={pauseDescription}
                      onChange={(e) => setPauseDescription(e.target.value)}
                      className="bg-input border-border min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">Attachments (Optional)</Label>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="bg-input border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload images or documents to support your pause request (max 10MB each)
                      </p>
                      {pauseAttachments.length > 0 && (
                        <div className="space-y-1">
                          {pauseAttachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center space-x-2">
                                <Upload className="h-4 w-4" />
                                <span className="text-sm">{file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                                className="h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {pauseReason === 'medical' && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="medical-referral"
                        checked={needsMedicalReferral}
                        onChange={(e) => setNeedsMedicalReferral(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="medical-referral" className="text-foreground">
                        Request medical referral to specialist
                      </Label>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsPauseDialogOpen(false)
                        resetPauseRequestForm()
                      }}
                      className="border-border"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePauseRequest}
                      className="bg-primary text-primary-foreground"
                      disabled={!selectedPlan || !pauseDescription}
                    >
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Sport Registration Dialog */}
        <Dialog open={showSportRegistration} onOpenChange={setShowSportRegistration}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Register for New Sport</DialogTitle>
              <DialogDescription>
                Register for additional sports with coach approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Select Sport</Label>
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Choose a sport" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {filteredSports.map((sport) => (
                      <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Select Coach</Label>
                <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Choose a coach" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {filteredCoaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name} - {coach.sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-foreground">Priority (1-3)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  max="3"
                  value={sportPriority}
                  onChange={(e) => setSportPriority(parseInt(e.target.value))}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">
                  1 = Primary sport, 2 = Secondary, 3 = Tertiary
                </p>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSportRegistration(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSportRegistration}
                  className="bg-primary text-primary-foreground"
                  disabled={!selectedSport || !selectedCoach}
                >
                  Submit for Approval
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Physiotherapy Booking Dialog */}
        <Dialog open={showPhysioBooking} onOpenChange={setShowPhysioBooking}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Book Physiotherapy Session</DialogTitle>
              <DialogDescription>
                Schedule a physiotherapy appointment (requires coach approval)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Available Slots</Label>
                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {availableSlots.map((slot) => {
                      const specialist = specialists.find(s => s.id === slot.specialistId)
                      return (
                        <SelectItem key={slot.id} value={slot.id}>
                          {new Date(slot.date).toLocaleDateString()} at {slot.time} 
                          ({slot.duration}min) - {specialist?.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="physio-reason" className="text-foreground">Reason for Visit</Label>
                <Textarea
                  id="physio-reason"
                  placeholder="Describe your physiotherapy needs..."
                  value={physioReason}
                  onChange={(e) => setPhysioReason(e.target.value)}
                  className="bg-input border-border min-h-[80px]"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPhysioBooking(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePhysioBooking}
                  className="bg-primary text-primary-foreground"
                  disabled={!selectedSlot || !physioReason}
                >
                  Request Appointment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Pause Request Dialog */}
        <Dialog open={showPauseRequest} onOpenChange={setShowPauseRequest}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Request Training Plan Pause</DialogTitle>
              <DialogDescription>
                Request to pause a training plan (requires coach approval)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-foreground">Select Training Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Choose a plan to pause" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {activePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Reason for Pause</Label>
                <Select value={pauseReason} onValueChange={(value: any) => setPauseReason(value)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="medical">Medical Issue</SelectItem>
                    <SelectItem value="event">Special Event</SelectItem>
                    <SelectItem value="exam">Exams</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pause-description" className="text-foreground">Description</Label>
                <Textarea
                  id="pause-description"
                  placeholder="Provide details about your request..."
                  value={pauseDescription}
                  onChange={(e) => setPauseDescription(e.target.value)}
                  className="bg-input border-border min-h-[80px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Attachments (Optional)</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload images or documents to support your pause request (max 10MB each)
                  </p>
                  {pauseAttachments.length > 0 && (
                    <div className="space-y-1">
                      {pauseAttachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center space-x-2">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {pauseReason === 'medical' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="medical-referral"
                    checked={needsMedicalReferral}
                    onChange={(e) => setNeedsMedicalReferral(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="medical-referral" className="text-foreground">
                    Request medical referral to specialist
                  </Label>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowPauseRequest(false)
                    resetPauseRequestForm()
                  }}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePauseRequest}
                  className="bg-primary text-primary-foreground"
                  disabled={!selectedPlan || !pauseDescription}
                >
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Medical Referral Dialog */}
        <Dialog open={showMedicalReferral} onOpenChange={setShowMedicalReferral}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Request Medical Referral</DialogTitle>
              <DialogDescription>
                Request referral to a medical specialist (requires coach approval)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="medical-issue" className="text-foreground">Medical Issue</Label>
                <Input
                  id="medical-issue"
                  placeholder="Describe your medical issue..."
                  value={medicalIssue}
                  onChange={(e) => setMedicalIssue(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Urgency Level</Label>
                <Select value={medicalUrgency} onValueChange={(value: any) => setMedicalUrgency(value)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="low">Low - Non-urgent</SelectItem>
                    <SelectItem value="medium">Medium - Needs attention soon</SelectItem>
                    <SelectItem value="high">High - Urgent medical attention</SelectItem>
                    <SelectItem value="emergency">Emergency - Immediate attention required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-foreground">Specialist Type</Label>
                <Select value={selectedSpecialist} onValueChange={setSelectedSpecialist}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select specialist type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {specialists.map((specialist) => (
                      <SelectItem key={specialist.id} value={specialist.id}>
                        {specialist.name} - {specialist.specialization}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medical-description" className="text-foreground">Detailed Description</Label>
                <Textarea
                  id="medical-description"
                  placeholder="Provide detailed information about your medical condition..."
                  value={medicalDescription}
                  onChange={(e) => setMedicalDescription(e.target.value)}
                  className="bg-input border-border min-h-[80px]"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowMedicalReferral(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleMedicalReferral}
                  className="bg-primary text-primary-foreground"
                  disabled={!medicalIssue || !medicalDescription || !selectedSpecialist}
                >
                  Submit Referral Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
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
        
        {/* Physiotherapy Appointments */}
        {physioAppointments.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Physiotherapy Appointments</CardTitle>
              <CardDescription>Your scheduled and requested physiotherapy sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {physioAppointments.map((appt) => {
                  const specialist = specialistMap[appt.specialistId]
                  const slot = availableSlots.find(s => s.id === appt.slotId) || { date: '', time: '', duration: 0 }
                  return (
                    <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          appt.status === 'approved' ? 'bg-primary/10' :
                          appt.status === 'requested' ? 'bg-accent/10' : 'bg-secondary/10'
                        }`}>
                          <Stethoscope className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{appt.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {specialist?.name} • {slot.date} at {slot.time} ({slot.duration}min)
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        appt.status === 'approved' ? 'bg-primary/20 text-primary' :
                        appt.status === 'requested' ? 'bg-accent/20 text-accent' : 'bg-secondary/20'
                      }>
                        {appt.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Medical Referrals */}
        {medicalReferrals.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Medical Referrals</CardTitle>
              <CardDescription>Active medical referrals and specialist consultations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {medicalReferrals.map((ref) => {
                  const specialist = specialistMap[ref.specialistId]
                  return (
                    <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          ref.status === 'active' ? 'bg-destructive/10' : 'bg-primary/10'
                        }`}>
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{ref.issue}</p>
                          <p className="text-sm text-muted-foreground">
                            Specialist: {specialist?.name} • Urgency: {ref.urgency}
                          </p>
                        </div>
                      </div>
                      <Badge className={
                        ref.status === 'active' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                      }>
                        {ref.status}
                      </Badge>
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
