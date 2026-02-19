"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Download,
  Image as ImageIcon,
  Video,
  FileIcon,
  AlertCircle,
  Trophy,
  XCircle,
} from "lucide-react"

export default function CoachTrainingPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [plan, setPlan] = useState<any | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [athletes, setAthletes] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<'successful' | 'unsuccessful'>('successful')
  const [completionNotes, setCompletionNotes] = useState("")
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
    if (!currentUser || !id) return

    const loadPlanData = async () => {
      setIsLoading(true)
      try {
        const [planRes, tasksRes, athletesRes, submissionsRes] = await Promise.all([
          fetch(`/api/training-plans/${id}`, { cache: "no-store" }),
          fetch(`/api/training-plans/${id}/tasks`, { cache: "no-store" }),
          fetch(`/api/users?role=athlete&limit=200`, { cache: "no-store" }),
          fetch(`/api/training-plans/${id}/submissions`, { cache: "no-store" }),
        ])

        const planData = await planRes.json()
        const tasksData = await tasksRes.json()
        const athletesData = await athletesRes.json()
        const submissionsData = await submissionsRes.json()

        setPlan(planData.trainingPlan || null)
        setTasks(tasksData.tasks || [])
        setAthletes(athletesData.users || [])
        setSubmissions(submissionsData.submissions || [])
      } catch (error) {
        console.error("Failed to load training plan details", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlanData()
  }, [currentUser, id])

  const handleMarkCompletion = async () => {
    if (!plan || !completionStatus) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/training-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completion_status: completionStatus,
          status: "completed",
          completion_notes: completionNotes,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to mark completion")
      }

      alert(`Training plan marked as ${completionStatus}!`)
      setShowCompletionDialog(false)
      router.push("/coach/training-plans")
    } catch (error) {
      console.error("Failed to mark completion:", error)
      alert("Error marking completion")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  if (isLoading) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading training plan...</div>
      </DashboardLayout>
    )
  }

  if (!plan) {
    return (
      <DashboardLayout role="coach">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Training Plan Not Found</h3>
          <Button onClick={() => router.push("/coach/training-plans")}>
            Back to Training Plans
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const planAthletes = (plan.athleteIds || [])
    .map((id: string) => athletes.find(a => a.id === id))
    .filter(Boolean)

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-4 w-4" />
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return <Video className="h-4 w-4" />
    if (['pdf'].includes(ext || '')) return <FileText className="h-4 w-4" />
    return <FileIcon className="h-4 w-4" />
  }

  const getTaskSubmissions = (taskId: string) => {
    return submissions.filter(s => s.task_id === taskId)
  }

  return (
    <DashboardLayout role="coach">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/coach/training-plans")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{plan.name}</h1>
              <p className="text-muted-foreground">{plan.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/50 text-primary">
              {plan.status}
            </Badge>
            {plan.status === 'active' && (
              <Button onClick={() => setShowCompletionDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Completion
              </Button>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Athletes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">{planAthletes.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">{tasks.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Start Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {new Date(plan.startDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">End Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {new Date(plan.endDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Athletes Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Assigned Athletes</CardTitle>
            <CardDescription>Athletes participating in this training plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planAthletes.map((athlete: any) => (
                <div key={athlete.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {athlete.name.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{athlete.name}</p>
                    <p className="text-sm text-muted-foreground">{athlete.sport}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tasks Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Training Tasks</CardTitle>
            <CardDescription>Tasks and phases for this training plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tasks created for this training plan</p>
              </div>
            ) : (
              tasks.map((task, index) => {
                const taskSubmissions = getTaskSubmissions(task.id)
                const submissionRate = planAthletes.length > 0
                  ? Math.round((taskSubmissions.length / planAthletes.length) * 100)
                  : 0

                return (
                  <div key={task.id} className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Task {index + 1}
                          </Badge>
                          <h3 className="font-semibold text-foreground">{task.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.start_date).toLocaleDateString()}
                          </span>
                          <span>→</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coach Attachments */}
                    {task.coach_attachments && task.coach_attachments.length > 0 && (
                      <div className="mb-3 p-3 rounded-md bg-background/50">
                        <Label className="text-xs text-muted-foreground mb-2 block">Coach Materials</Label>
                        <div className="space-y-1">
                          {task.coach_attachments.map((file: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              {getFileIcon(file)}
                              <span className="text-foreground">{file.split('/').pop()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submission Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Athlete Submissions</span>
                        <span className="text-foreground font-medium">
                          {taskSubmissions.length} / {planAthletes.length}
                        </span>
                      </div>
                      <Progress value={submissionRate} className="h-2" />
                    </div>

                    {/* Athlete Submissions */}
                    {taskSubmissions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Label className="text-xs text-muted-foreground mb-2 block">Submissions</Label>
                        <div className="space-y-2">
                          {taskSubmissions.map((submission: any) => {
                            const athlete = athletes.find(a => a.id === submission.athlete_id)
                            return (
                              <div key={submission.id} className="p-2 rounded-md bg-background/50">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                        {athlete?.name.split(" ").map((n: string) => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-foreground">
                                      {athlete?.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(submission.submitted_at).toLocaleDateString()}
                                  </span>
                                </div>
                                {submission.notes && (
                                  <p className="text-xs text-muted-foreground mb-1 ml-8">
                                    {submission.notes}
                                  </p>
                                )}
                                {submission.attachments && submission.attachments.length > 0 && (
                                  <div className="ml-8 space-y-1">
                                    {submission.attachments.map((file: string, idx: number) => (
                                      <div key={idx} className="flex items-center gap-2 text-xs">
                                        {getFileIcon(file)}
                                        <span className="text-foreground">{file.split('/').pop()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Completion Dialog */}
        <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Mark Training Plan Completion</DialogTitle>
              <DialogDescription>
                How would you rate the completion of this training plan?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label className="text-foreground">Completion Status</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCompletionStatus('successful')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      completionStatus === 'successful'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border bg-secondary/50 hover:border-green-500/50'
                    }`}
                  >
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="font-medium text-foreground">Successful</p>
                    <p className="text-xs text-muted-foreground">Goals achieved</p>
                  </button>
                  <button
                    onClick={() => setCompletionStatus('unsuccessful')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      completionStatus === 'unsuccessful'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-border bg-secondary/50 hover:border-red-500/50'
                    }`}
                  >
                    <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                    <p className="font-medium text-foreground">Unsuccessful</p>
                    <p className="text-xs text-muted-foreground">Goals not met</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">
                  Completion Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any final notes or observations about this training plan..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="bg-input border-border min-h-[100px]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkCompletion}
                  disabled={isSubmitting || !completionStatus}
                >
                  {isSubmitting ? 'Marking...' : 'Confirm Completion'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
