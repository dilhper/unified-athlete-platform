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
import { FileText, Plus, Calendar, User, AlertCircle, CheckCircle2, Clock } from "lucide-react"

export default function AthleteMedicalLeavesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [medicalLeaves, setMedicalLeaves] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Form state
  const [coachId, setCoachId] = useState("")
  const [leaveType, setLeaveType] = useState("")
  const [reason, setReason] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" })
        const data = await res.json()
        
        if (res.ok && data.user) {
          setCurrentUser(data.user)
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

    const loadData = async () => {
      setIsLoading(true)
      try {
        const [leavesRes, coachesRes] = await Promise.all([
          fetch(`/api/medical-leaves?athleteId=${currentUser.id}`, { cache: "no-store" }),
          fetch(`/api/users?role=coach&limit=100`, { cache: "no-store" }),
        ])

        const leavesData = await leavesRes.json()
        const coachesData = await coachesRes.json()
        
        if (leavesRes.ok) {
          setMedicalLeaves(leavesData.medicalLeaves || [])
        }
        if (coachesRes.ok) {
          setCoaches(coachesData.users || [])
        }
      } catch (error) {
        console.error("Failed to load data", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentUser])

  const handleSubmitRequest = async () => {
    if (!coachId || !leaveType || !reason || !startDate || !endDate) {
      alert("Please fill in all required fields")
      return
    }

    setIsSubmitting (true)
    try {
      const res = await fetch("/api/medical-leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: coachId,
          leave_type: leaveType,
          reason,
          start_date: startDate,
          end_date: endDate,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMedicalLeaves([data.medicalLeave, ...medicalLeaves])
        setShowCreateDialog(false)
        setCoachId("")
        setLeaveType("")
        setReason("")
        setStartDate("")
        setEndDate("")
        alert("Medical leave request submitted successfully!")
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Failed to submit medical leave request:", error)
      alert("Failed to submit request. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { class: string; label: string }> = {
      pending_specialist_review: { class: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30", label: "Pending Specialist Review" },
      specialist_reviewed: { class: "bg-blue-500/20 text-blue-700 border-blue-500/30", label: "Specialist Reviewed" },
      pending_coach_decision: { class: "bg-purple-500/20 text-purple-700 border-purple-500/30", label: "Pending Coach Decision" },
      approved: { class: "bg-green-500/20 text-green-700 border-green-500/30", label: "Approved" },
      rejected: { class: "bg-red-500/20 text-red-700 border-red-500/30", label: "Rejected" },
      cancelled: { class: "bg-gray-500/20 text-gray-700 border-gray-500/30", label: "Cancelled" },
    }
    const variant = variants[status] || variants.pending_specialist_review
    return <Badge className={variant.class}>{variant.label}</Badge>
  }

  const getDecisionBadge = (decision: string) => {
    const variants: Record<string, { class: string; label: string }> = {
      stop_training: { class: "bg-red-500/20 text-red-700", label: "Stop Training" },
      continue_modified: { class: "bg-yellow-500/20 text-yellow-700", label: "Modified Training" },
      continue_normal: { class: "bg-green-500/20 text-green-700", label: "Continue Normal" },
    }
    const variant = variants[decision]
    return variant ? <Badge className={variant.class}>{variant.label}</Badge> : null
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
            <h1 className="text-3xl font-bold text-foreground">Medical Leave Requests</h1>
            <p className="text-muted-foreground">Submit and track medical leave requests with specialist review</p>
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
                <DialogTitle className="text-foreground">Request Medical Leave</DialogTitle>
                <DialogDescription>
                  Submit a medical leave request for specialist review and coach approval
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="coach" className="text-foreground">Select Your Coach *</Label>
                  <Select value={coachId} onValueChange={setCoachId}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select coach" />
                    </SelectTrigger>
                    <SelectContent>
                      {coaches.map((coach) => (
                        <SelectItem key={coach.id} value={coach.id}>
                          {coach.name} - {coach.sport || 'General'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-foreground">Leave Type *</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="injury">Injury</SelectItem>
                      <SelectItem value="illness">Illness</SelectItem>
                      <SelectItem value="surgery_recovery">Surgery Recovery</SelectItem>
                      <SelectItem value="mental_health">Mental Health</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-foreground">Reason / Medical Condition *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe your medical condition and reason for leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-input border-border min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start" className="text-foreground">Start Date *</Label>
                    <Input
                      id="start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end" className="text-foreground">End Date *</Label>
                    <Input
                      id="end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-1">Review Process:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>A specialist will review your request and medical condition</li>
                        <li>The specialist will provide a medical recommendation</li>
                        <li>Your coach will make the final decision on training adjustments</li>
                        <li>You'll be notified at each step via the platform</li>
                      </ol>
                    </div>
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
                    disabled={isSubmitting || !coachId || !leaveType || !reason || !startDate || !endDate}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Medical Leaves List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Loading medical leave requests...</p>
          </div>
        ) : medicalLeaves.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Medical Leave Requests</h3>
              <p className="text-muted-foreground mb-4">
                You haven't submitted any medical leave requests yet
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {medicalLeaves.map((leave) => (
              <Card key={leave.id} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-foreground capitalize">
                          {leave.leave_type.replace(/_/g, ' ')}
                        </CardTitle>
                        {getStatusBadge(leave.status)}
                        {leave.coach_decision && getDecisionBadge(leave.coach_decision)}
                      </div>
                      <CardDescription>
                        Requested {new Date(leave.created_at).toLocaleDateString()} • 
                        {leave.duration_days} days ({new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Reason</Label>
                    <p className="text-foreground">{leave.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Coach</Label>
                      <p className="text-sm font-medium text-foreground">{leave.coach_name}</p>
                    </div>
                  </div>

                  {leave.specialist_name && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Reviewing Specialist</Label>
                        <p className="text-sm font-medium text-foreground">Dr. {leave.specialist_name}</p>
                      </div>
                    </div>
                  )}

                  {leave.specialist_review && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <div className="flex items-start gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <Label className="text-xs text-blue-700 dark:text-blue-400">Specialist Medical Review</Label>
                          {leave.specialist_recommendation && (
                            <Badge className="ml-2 bg-blue-600 text-white text-xs">
                              {leave.specialist_recommendation.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{leave.specialist_review}</p>
                    </div>
                  )}

                  {leave.coach_notes && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <div className="flex items-start gap-2 mb-2">
                        <User className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                        <Label className="text-xs text-green-700 dark:text-green-400">Coach Decision & Notes</Label>
                      </div>
                      <p className="text-sm text-foreground">{leave.coach_notes}</p>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="border-t border-border pt-4">
                    <Label className="text-xs text-muted-foreground mb-3 block">Timeline</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="text-foreground">{new Date(leave.created_at).toLocaleString()}</span>
                      </div>
                      {leave.specialist_reviewed_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          <span className="text-muted-foreground">Specialist Reviewed:</span>
                          <span className="text-foreground">{new Date(leave.specialist_reviewed_at).toLocaleString()}</span>
                        </div>
                      )}
                      {leave.coach_decided_at && (
                        <div className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-muted-foreground">Coach Decided:</span>
                          <span className="text-foreground">{new Date(leave.coach_decided_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
