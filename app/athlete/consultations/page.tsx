"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Stethoscope, Plus, Calendar, User, MessageSquare, FileText, Clock } from "lucide-react"

export default function AthleteConsultationsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [consultations, setConsultations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Form state
  const [consultationType, setConsultationType] = useState("")
  const [reason, setReason] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [urgency, setUrgency] = useState("normal")
  const [preferredDate, setPreferredDate] = useState("")
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
        console.error("Failed to load user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const loadConsultations = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/consultations?athleteId=${currentUser.id}`, { cache: "no-store" })
        const data = await res.json()
        
        if (res.ok) {
          setConsultations(data.consultations || [])
        } else {
          console.error("Failed to load consultations:", data.error)
        }
      } catch (error) {
        console.error("Failed to load consultations", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConsultations()
  }, [currentUser])

  const handleSubmitRequest = async () => {
    if (!consultationType || !reason) {
      alert("Please fill in consultation type and reason")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_type: consultationType,
          reason,
          symptoms,
          urgency,
          preferred_date: preferredDate || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setConsultations([data.consultation, ...consultations])
        setShowCreateDialog(false)
        setConsultationType("")
        setReason("")
        setSymptoms("")
        setUrgency("normal")
        setPreferredDate("")
        alert("Consultation request submitted successfully!")
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to submit consultation request:", error)
      alert("Failed to submit request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMessageSpecialist = async (consultation: any) => {
    if (!consultation.specialist_id) {
      alert("No specialist assigned yet")
      return
    }

    // Create initial message
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentUser.id,
        receiverId: consultation.specialist_id,
        content: `Hi Dr. ${consultation.specialist_name || 'Specialist'}, I have a question about my ${consultation.consultation_type} consultation.`,
      }),
    })

    router.push("/messages")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
      assigned: "bg-blue-500/20 text-blue-700 border-blue-500/30",
      in_progress: "bg-purple-500/20 text-purple-700 border-purple-500/30",
      completed: "bg-green-500/20 text-green-700 border-green-500/30",
      cancelled: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    }
    return variants[status] || variants.pending
  }

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, string> = {
      low: "bg-gray-500/20 text-gray-700",
      normal: "bg-blue-500/20 text-blue-700",
      high: "bg-orange-500/20 text-orange-700",
      emergency: "bg-red-500/20 text-red-700",
    }
    return variants[urgency] || variants.normal
  }

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Specialist Consultations</h1>
            <p className="text-muted-foreground">Request and manage consultations with sports medicine specialists</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-foreground">Request Specialist Consultation</DialogTitle>
                <DialogDescription>
                  Submit a request to consult with a sports medicine specialist
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-foreground">Consultation Type *</Label>
                  <Select value={consultationType} onValueChange={setConsultationType}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Check-up</SelectItem>
                      <SelectItem value="sports_medicine">Sports Medicine</SelectItem>
                      <SelectItem value="injury">Injury Assessment</SelectItem>
                      <SelectItem value="nutrition">Nutrition Consultation</SelectItem>
                      <SelectItem value="psychology">Sports Psychology</SelectItem>
                      <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-foreground">Reason for Consultation *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe why you need this consultation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-input border-border min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms" className="text-foreground">Symptoms (Optional)</Label>
                  <Textarea
                    id="symptoms"
                    placeholder="Describe any symptoms you're experiencing..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="urgency" className="text-foreground">Urgency</Label>
                    <Select value={urgency} onValueChange={setUrgency}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-foreground">Preferred Date (Optional)</Label>
                    <Input
                      id="date"
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitRequest}
                    disabled={isSubmitting || !consultationType || !reason}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Consultations List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Loading consultations...</p>
          </div>
        ) : consultations.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-12">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Consultations Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't requested any specialist consultations yet
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Request Consultation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card key={consultation.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-foreground capitalize">
                          {consultation.consultation_type.replace(/_/g, ' ')}
                        </CardTitle>
                        <Badge className={getStatusBadge(consultation.status)}>
                          {consultation.status}
                        </Badge>
                        <Badge className={getUrgencyBadge(consultation.urgency)}>
                          {consultation.urgency}
                        </Badge>
                      </div>
                      <CardDescription>
                        Requested {new Date(consultation.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Reason</Label>
                    <p className="text-foreground">{consultation.reason}</p>
                  </div>

                  {consultation.symptoms && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Symptoms</Label>
                      <p className="text-foreground">{consultation.symptoms}</p>
                    </div>
                  )}

                  {consultation.specialist_name && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Assigned Specialist</Label>
                        <p className="text-sm font-medium text-foreground">Dr. {consultation.specialist_name}</p>
                      </div>
                    </div>
                  )}

                  {consultation.scheduled_date && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(consultation.scheduled_date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {consultation.consultation_notes && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <Label className="text-xs text-green-700 dark:text-green-400">Specialist Notes</Label>
                      <p className="text-sm text-foreground mt-1">{consultation.consultation_notes}</p>
                    </div>
                  )}

                  {consultation.recommendation && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <Label className="text-xs text-blue-700 dark:text-blue-400">Recommendation</Label>
                      <p className="text-sm text-foreground mt-1">{consultation.recommendation}</p>
                    </div>
                  )}

                  {consultation.specialist_id && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessageSpecialist(consultation)}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message Specialist
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
