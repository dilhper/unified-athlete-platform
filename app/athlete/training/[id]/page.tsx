"use client"

import { use, useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Dumbbell, 
  MessageSquare,
  User,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  FileIcon,
  Download,
  AlertCircle,
} from "lucide-react"

export default function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [plan, setPlan] = useState<any | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [coach, setCoach] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [submissionNotes, setSubmissionNotes] = useState("")
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        console.error("Failed to load athlete user", error)
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
        const [planRes, tasksRes, submissionsRes] = await Promise.all([
          fetch(`/api/training-plans/${id}`, { cache: "no-store" }),
          fetch(`/api/training-plans/${id}/tasks`, { cache: "no-store" }),
          fetch(`/api/task-submissions?athleteId=${currentUser.id}&planId=${id}`, { cache: "no-store" }),
        ])

        const planData = await planRes.json()
        const tasksData = await tasksRes.json()
        const submissionsData = await submissionsRes.json()

        console.log("Plan API Response:", planData)
        console.log("Plan Response Status:", planRes.status)
        console.log("Tasks API Response:", tasksData)
        console.log("Tasks Response Status:", tasksRes.status)

        if (!planRes.ok) {
          console.error("Plan API Error:", planData.error)
          setPlan(null)
          setIsLoading(false)
          return
        }

        const foundPlan = planData.trainingPlan

        if (!foundPlan) {
          console.error("No training plan found in response")
          setPlan(null)
          setIsLoading(false)
          return
        }

        // Get coach info
        const coachRes = await fetch(`/api/users/${foundPlan.coachId}`, { cache: "no-store" })
        const coachData = await coachRes.json()

        setPlan(foundPlan)
        setTasks(tasksData.tasks || [])
        setMySubmissions(submissionsData.submissions || [])
        setCoach(coachData.user || null)
      } catch (error) {
        console.error("Failed to load training plan", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPlanData()
  }, [currentUser, id])


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setSubmissionFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setSubmissionFiles(prev => prev.filter((_, i) => i !== index))
  }

  const openSubmissionDialog = (task: any) => {
    setSelectedTask(task)
    const existing = mySubmissions.find(s => s.task_id === task.id)
    if (existing) {
      setSubmissionNotes(existing.notes || "")
      // Note: Can't re-populate files from existing submission
    } else {
      setSubmissionNotes("")
      setSubmissionFiles([])
    }
    setShowSubmissionDialog(true)
  }

  const handleSubmitTask = async () => {
    if (!selectedTask || !currentUser) return

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('taskId', selectedTask.id)
      formData.append('athleteId', currentUser.id)
      formData.append('notes', submissionNotes)
      
      submissionFiles.forEach((file) => {
        formData.append('files', file)
      })

      const res = await fetch('/api/task-submissions', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit task')
      }

      // Reload submissions
      const submissionsRes = await fetch(`/api/task-submissions?athleteId=${currentUser.id}&planId=${id}`, { cache: "no-store" })
      const submissionsData = await submissionsRes.json()
      setMySubmissions(submissionsData.submissions || [])

      alert('Task submitted successfully!')
      setShowSubmissionDialog(false)
      setSelectedTask(null)
      setSubmissionNotes("")
      setSubmissionFiles([])
    } catch (error: any) {
      console.error("Failed to submit task:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-4 w-4" />
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return <Video className="h-4 w-4" />
    if (['pdf'].includes(ext || '')) return <FileText className="h-4 w-4" />
    return <FileIcon className="h-4 w-4" />
  }

  const hasSubmitted = (taskId: string) => {
    return mySubmissions.some(s => s.task_id === taskId)
  }

  const getSubmission = (taskId: string) => {
    return mySubmissions.find(s => s.task_id === taskId)
  }

  const completedTasks = tasks.filter(t => hasSubmitted(t.id)).length
  const progressValue = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  const handleMessageCoach = async () => {
    if (!coach) return
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentUser.id,
        receiverId: coach.id,
        content: `Hi Coach! I have a question about the ${plan.name} training plan.`,
      }),
    })
    router.push("/messages")
  }

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  if (isLoading) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading training plan...</div>
      </DashboardLayout>
    )
  }
  
  if (!plan) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground mb-2">Training Plan Not Found</h2>
          <p className="text-muted-foreground mb-4">This training plan doesn't exist or has been removed.</p>
          <Link href="/athlete/training">
            <Button className="bg-primary text-primary-foreground">Back to Training</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/athlete/training" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training Plans
        </Link>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
              <Badge variant={
                plan.status === "active" ? "default" : 
                plan.status === "completed" ? "secondary" : "outline"
              } className={
                plan.status === "active" ? "bg-primary text-primary-foreground" : ""
              }>
                {plan.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{plan.description}</p>
          </div>
          
          {coach && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Your Coach</p>
                    <p className="font-medium text-foreground">{coach.name}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleMessageCoach}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Progress Overview */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Overall Progress</CardTitle>
            <CardDescription>
              {completedTasks} of {tasks.length} tasks completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium text-foreground">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Start Date</span>
                </div>
                <p className="font-medium text-foreground">{new Date(plan.startDate).toLocaleDateString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">End Date</span>
                </div>
                <p className="font-medium text-foreground">{new Date(plan.endDate).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Training Tasks */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Training Tasks</CardTitle>
            <CardDescription>Complete each task by uploading your progress materials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tasks assigned yet</p>
              </div>
            ) : (
              tasks.map((task, index) => {
                const submission = getSubmission(task.id)
                const isSubmitted = !!submission

                return (
                  <div key={task.id} className={`p-4 rounded-lg border-2 transition-all ${
                    isSubmitted 
                      ? 'border-green-500 bg-green-500/5' 
                      : 'border-border bg-secondary/50'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isSubmitted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            Task {index + 1}
                          </Badge>
                          <h3 className="font-semibold text-foreground">{task.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 ml-7">{task.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground ml-7">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.start_date).toLocaleDateString()}
                          </span>
                          <span>→</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(task.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => openSubmissionDialog(task)}
                        variant={isSubmitted ? "outline" : "default"}
                        size="sm"
                      >
                        {isSubmitted ? 'Update Submission' : 'Submit Task'}
                      </Button>
                    </div>

                    {/* Coach Materials */}
                    {task.coach_attachments && task.coach_attachments.length > 0 && (
                      <div className="ml-7 p-3 rounded-md bg-background/50 mb-3">
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

                    {/* My Submission */}
                    {submission && (
                      <div className="ml-7 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-green-700 dark:text-green-400">Your Submission</Label>
                          <span className="text-xs text-muted-foreground">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        {submission.notes && (
                          <p className="text-sm text-foreground mb-2">{submission.notes}</p>
                        )}
                        {submission.attachments && submission.attachments.length > 0 && (
                          <div className="space-y-1">
                            {submission.attachments.map((file: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {getFileIcon(file)}
                                <span className="text-foreground">{file.split('/').pop()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Submission Dialog */}
        <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Submit Task Materials</DialogTitle>
              <DialogDescription>
                Upload your training materials, videos, and progress documentation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {selectedTask && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <h4 className="font-semibold text-foreground mb-1">{selectedTask.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about your progress, challenges, or achievements..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="bg-input border-border min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Upload Materials</Label>
                <p className="text-sm text-muted-foreground">
                  Upload images, videos, or documents showing your progress
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Click to upload files
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Images, Videos, PDFs, Documents
                  </p>
                </div>

                {submissionFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {submissionFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50">
                        {getFileIcon(file.name)}
                        <span className="text-sm text-foreground flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSubmissionDialog(false)
                    setSelectedTask(null)
                    setSubmissionNotes("")
                    setSubmissionFiles([])
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitTask}
                  disabled={isSubmitting || submissionFiles.length === 0}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
