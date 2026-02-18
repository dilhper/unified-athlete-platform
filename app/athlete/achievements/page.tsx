"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trophy, CheckCircle2, Clock, XCircle, Plus, Calendar, Upload } from "lucide-react"

const categories = ["Competition", "Performance", "Training", "Academic", "Community", "Other"]

export default function AthleteAchievementsPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [achievements, setAchievements] = useState<any[]>([])
  const [userCache, setUserCache] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAchievement, setNewAchievement] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
  })
  const [achievementAttachments, setAchievementAttachments] = useState<File[]>([])

  useEffect(() => {
    // Set default date on client side to avoid hydration mismatch
    setNewAchievement(prev => ({
      ...prev,
      date: prev.date || new Date().toISOString().split("T")[0]
    }))
    
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

    const loadAchievements = async () => {
      try {
        const res = await fetch(`/api/achievements?athleteId=${currentUser.id}`, { cache: "no-store" })
        const data = await res.json()
        const normalized = (data.achievements || []).map((a: any) => ({
          ...a,
          athleteId: a.athlete_id ?? a.athleteId,
          verifiedBy: a.verified_by ?? a.verifiedBy,
          verifiedDate: a.verified_date ?? a.verifiedDate,
        }))
        setAchievements(normalized)
      } catch (error) {
        console.error("Failed to load achievements", error)
      }
    }

    loadAchievements()
  }, [currentUser])

  useEffect(() => {
    const verifierIds = Array.from(
      new Set(achievements.map((a) => a.verified_by ?? a.verifiedBy).filter(Boolean))
    ) as string[]

    const missing = verifierIds.filter((id) => !userCache[id])
    if (missing.length === 0) return

    const loadUsers = async () => {
      const responses = await Promise.all(
        missing.map((id) => fetch(`/api/users/${id}`, { cache: "no-store" }))
      )
      const payloads = await Promise.all(responses.map((res) => res.json()))
      const updates: Record<string, any> = {}
      payloads.forEach((data) => {
        if (data?.user?.id) updates[data.user.id] = data.user
      })
      if (Object.keys(updates).length > 0) {
        setUserCache((prev) => ({ ...prev, ...updates }))
      }
    }

    loadUsers()
  }, [achievements, userCache])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading achievements...</div>
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
  const verifiedCount = achievements.filter(a => a.status === "verified").length
  const pendingCount = achievements.filter(a => a.status === "pending").length
  const rejectedCount = achievements.filter(a => a.status === "rejected").length
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setAchievementAttachments(prev => [...prev, ...newFiles])
    }
  }
  
  const removeAttachment = (index: number) => {
    setAchievementAttachments(prev => prev.filter((_, i) => i !== index))
  }
  
  const resetAchievementForm = () => {
    setNewAchievement({
      title: "",
      description: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
    })
    setAchievementAttachments([])
  }
  
  const handleSubmit = async () => {
    if (!newAchievement.title || !newAchievement.category) return
    
    const attachments = achievementAttachments.map((file) => file.name)

    await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        athleteId: currentUser.id,
        title: newAchievement.title,
        description: newAchievement.description,
        category: newAchievement.category,
        date: newAchievement.date,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
    })

    const refreshed = await fetch(`/api/achievements?athleteId=${currentUser.id}`, { cache: "no-store" })
    const refreshedData = await refreshed.json()
    const normalized = (refreshedData.achievements || []).map((a: any) => ({
      ...a,
      athleteId: a.athlete_id ?? a.athleteId,
      verifiedBy: a.verified_by ?? a.verifiedBy,
      verifiedDate: a.verified_date ?? a.verifiedDate,
    }))
    setAchievements(normalized)
    
    setNewAchievement({
      title: "",
      description: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
    })
    setAchievementAttachments([])
    setIsDialogOpen(false)
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle2 className="h-5 w-5 text-primary" />
      case "pending":
        return <Clock className="h-5 w-5 text-accent" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return null
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-primary/20 text-primary border-0">Verified</Badge>
      case "pending":
        return <Badge className="bg-accent/20 text-accent border-0">Pending</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return null
    }
  }
  
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Achievements</h1>
            <p className="text-muted-foreground">Track and submit your accomplishments for verification</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Achievement
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Submit New Achievement</DialogTitle>
                <DialogDescription>
                  Add details about your accomplishment for official verification
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., State Championship - 100m Gold"
                    value={newAchievement.title}
                    onChange={(e) => setNewAchievement(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-foreground">Category</Label>
                  <Select
                    value={newAchievement.category}
                    onValueChange={(value) => setNewAchievement(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-foreground">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAchievement.date}
                    onChange={(e) => setNewAchievement(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your achievement in detail..."
                    value={newAchievement.description}
                    onChange={(e) => setNewAchievement(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-input border-border min-h-[100px]"
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
                      Upload images or documents to support your achievement (max 10MB each)
                    </p>
                    {achievementAttachments.length > 0 && (
                      <div className="space-y-1">
                        {achievementAttachments.map((file, index) => (
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
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsDialogOpen(false)
                      resetAchievementForm()
                    }}
                    className="border-border"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    className="bg-primary text-primary-foreground"
                    disabled={!newAchievement.title || !newAchievement.category}
                  >
                    Submit for Verification
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{verifiedCount}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Achievements List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">All Achievements</CardTitle>
            <CardDescription>Your submitted and verified achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Achievements Yet</h3>
                <p className="text-muted-foreground mb-4">Submit your first achievement to get started</p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Achievement
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement) => {
                  const verifierId = achievement.verified_by ?? achievement.verifiedBy
                  const verifier = verifierId ? userCache[verifierId] : null
                  
                  return (
                    <div 
                      key={achievement.id} 
                      className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 border border-border"
                    >
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        achievement.status === "verified" ? "bg-primary/10" :
                        achievement.status === "pending" ? "bg-accent/10" : "bg-destructive/10"
                      }`}>
                        {getStatusIcon(achievement.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-foreground">{achievement.title}</h3>
                          {getStatusBadge(achievement.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="border-border">
                            {achievement.category}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(achievement.date).toLocaleDateString()}
                          </span>
                          {verifier && (
                            <span>Verified by {verifier.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
