"use client"

import React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Calendar, Clock, Upload, X } from "lucide-react"

export default function NewTrainingPlanPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [athletes, setAthletes] = useState<any[]>([])
  const [approvedRegistrations, setApprovedRegistrations] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    athleteIds: [] as string[],
    startDate: "",
    endDate: "",
  })
  const [tasks, setTasks] = useState<{ 
    name: string; 
    description: string;
    startDate: string; 
    endDate: string;
    attachments: File[];
  }[]>([
    { name: "", description: "", startDate: "", endDate: "", attachments: [] }
  ])
  
  useEffect(() => {
    // Set default dates on client side to avoid hydration mismatch
    const today = new Date().toISOString().split("T")[0]
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    setFormData(prev => ({
      ...prev,
      startDate: prev.startDate || today,
      endDate: prev.endDate || futureDate,
    }))
    
    const loadData = async () => {
      try {
        const [userRes, athletesRes, approvedRegsRes] = await Promise.all([
          fetch("/api/me", { cache: "no-store" }),
          fetch("/api/users?role=athlete&limit=200", { cache: "no-store" }),
          fetch(`/api/sport-registrations?status=approved`, { cache: "no-store" }),
        ])

        const userData = await userRes.json()
        const athletesData = await athletesRes.json()
        const approvedRegsData = await approvedRegsRes.json()

        if (userRes.ok && userData.user) {
          setCurrentUser(userData.user)
          
          // Filter approved registrations for this coach
          const coachApprovedRegs = (approvedRegsData.registrations || []).filter(
            (reg: any) => reg.coach_id === userData.user.id
          )
          setApprovedRegistrations(coachApprovedRegs)
          
          // Get athlete IDs from approved registrations
          const approvedAthleteIds = new Set(coachApprovedRegs.map((reg: any) => reg.athlete_id))
          
          // Filter athletes to only show those with approved registrations for this coach
          const coachAthletes = (athletesData.users || []).filter((athlete: any) => 
            approvedAthleteIds.has(athlete.id)
          )
          setAthletes(coachAthletes)
        } else {
          console.error("Failed to load user:", userData.error)
          setAthletes([])
        }
      } catch (error) {
        console.error("Failed to load training plan data", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadData()
  }, [])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="coach">
        <div className="text-muted-foreground">Loading training plan form...</div>
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
  
  const addTask = () => {
    setTasks([...tasks, { name: "", description: "", startDate: "", endDate: "", attachments: [] }])
  }
  
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }
  
  const updateTask = (index: number, field: string, value: string) => {
    const updated = [...tasks]
    updated[index] = { ...updated[index], [field]: value }
    setTasks(updated)
  }
  
  const handleTaskFileUpload = (taskIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      const updated = [...tasks]
      updated[taskIndex] = { 
        ...updated[taskIndex], 
        attachments: [...(updated[taskIndex].attachments || []), ...newFiles] 
      }
      setTasks(updated)
    }
  }
  
  const removeTaskAttachment = (taskIndex: number, attachmentIndex: number) => {
    const updated = [...tasks]
    updated[taskIndex] = {
      ...updated[taskIndex],
      attachments: updated[taskIndex].attachments?.filter((_, i) => i !== attachmentIndex) || []
    }
    setTasks(updated)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || formData.athleteIds.length === 0) return
    
    const validTasks = tasks
      .filter(t => t.name && t.startDate && t.endDate)
      .map((task, index) => ({
        name: task.name,
        description: task.description,
        startDate: task.startDate,
        endDate: task.endDate,
        orderIndex: index,
        attachments: task.attachments || [],
      }))
    
    try {
      const planRes = await fetch("/api/training-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          athleteIds: formData.athleteIds,
          coachId: currentUser.id,
          status: "active",
          startDate: formData.startDate,
          endDate: formData.endDate,
          tasks: validTasks,
        }),
      })

      if (!planRes.ok) {
        throw new Error("Failed to create training plan")
      }

      router.push("/coach/training-plans")
    } catch (error) {
      console.error("Failed to create training plan", error)
      alert("Failed to create training plan. Please try again.")
    }
  }
  

  
  return (
    <DashboardLayout role="coach">
      <div className="space-y-6 max-w-3xl">
        {/* Back Button */}
        <Link href="/coach/training-plans" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Training Plans
        </Link>
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Training Plan</h1>
          <p className="text-muted-foreground">Design a new training program for your athlete</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Plan Details</CardTitle>
              <CardDescription>Basic information about the training plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Plan Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sprint Excellence Program"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-input border-border"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the goals and focus of this training plan..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-input border-border min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="athletes" className="text-foreground">Select Athletes</Label>
                {athletes.length === 0 ? (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-muted-foreground">
                      No athletes available. Athletes must have approved sport registrations with you before they can be assigned to training plans.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Go to the <Link href="/coach/athletes" className="text-primary hover:underline">Athletes page</Link> to approve pending registrations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {athletes.map((athlete) => (
                      <div key={athlete.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`athlete-${athlete.id}`}
                          checked={formData.athleteIds.includes(athlete.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ 
                                ...prev, 
                                athleteIds: [...prev.athleteIds, athlete.id] 
                              }))
                            } else {
                              setFormData(prev => ({ 
                                ...prev, 
                                athleteIds: prev.athleteIds.filter(id => id !== athlete.id) 
                              }))
                            }
                          }}
                          className="rounded border-border"
                        />
                        <label htmlFor={`athlete-${athlete.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {athlete.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {athlete.name} - {athlete.sport}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {formData.athleteIds.length > 0 && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <h4 className="font-medium text-foreground mb-2">Selected Athletes ({formData.athleteIds.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.athleteIds.map(athleteId => {
                      const athlete = athletes.find(a => a.id === athleteId)
                      return athlete ? (
                        <div key={athleteId} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">
                              {athlete.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          {athlete.name}
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              athleteIds: prev.athleteIds.filter(id => id !== athleteId) 
                            }))}
                            className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-foreground">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="bg-input border-border pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-foreground">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="bg-input border-border pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tasks/Phases */}
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Training Tasks/Phases</CardTitle>
                <CardDescription>Add tasks or phases with specific goals and timeframes</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTask} className="border-border bg-transparent">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.map((task, index) => (
                <div key={index} className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="space-y-4">
                    {/* Task Name */}
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">Task/Phase Name</Label>
                      <Input
                        placeholder="e.g., Strength Building Phase"
                        value={task.name}
                        onChange={(e) => updateTask(index, "name", e.target.value)}
                        className="bg-input border-border"
                      />
                    </div>
                    
                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">Description & Instructions</Label>
                      <Textarea
                        placeholder="Describe the goals, exercises, and instructions for this task..."
                        value={task.description}
                        onChange={(e) => updateTask(index, "description", e.target.value)}
                        className="bg-input border-border min-h-[100px]"
                      />
                    </div>
                    
                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">Start Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={task.startDate}
                            onChange={(e) => updateTask(index, "startDate", e.target.value)}
                            className="bg-input border-border pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground text-sm">End Date</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={task.endDate}
                            onChange={(e) => updateTask(index, "endDate", e.target.value)}
                            className="bg-input border-border pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Attachments */}
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">Coach Materials</Label>
                      <p className="text-xs text-muted-foreground">Upload reference materials, training videos, or instructions</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={(e) => handleTaskFileUpload(index, e)}
                        className="hidden"
                        id={`task-attachments-${index}`}
                      />
                      <label htmlFor={`task-attachments-${index}`} className="flex items-center gap-2 cursor-pointer bg-secondary/50 hover:bg-secondary border border-border rounded-lg p-4 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-muted-foreground">Upload materials (images, videos, PDFs, documents)</span>
                      </label>
                      
                      {task.attachments && task.attachments.length > 0 && (
                        <div className="space-y-2">
                          {task.attachments.map((file, attachmentIndex) => (
                            <div key={attachmentIndex} className="flex items-center gap-2 bg-secondary/50 p-2 rounded-lg">
                              <span className="text-sm text-foreground flex-1">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                              <button
                                type="button"
                                onClick={() => removeTaskAttachment(index, attachmentIndex)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {tasks.length > 1 && (
                    <div className="flex justify-end mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Task
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/coach/training-plans">
              <Button type="button" variant="outline" className="border-border bg-transparent">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!formData.name || formData.athleteIds.length === 0}
            >
              Create Training Plan
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
