"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Trophy,
  AlertCircle,
  FileText,
} from "lucide-react"

export default function VerificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [achievement, setAchievement] = useState<any | null>(null)
  const [athlete, setAthlete] = useState<any | null>(null)
  const [verifier, setVerifier] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/users?role=official&limit=1", { cache: "no-store" })
        const data = await res.json()
        setCurrentUser(data.users?.[0] || null)
      } catch (error) {
        console.error("Failed to load official user", error)
      } finally {
        setIsLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!id) return

    const loadAchievement = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/achievements/${id}`, { cache: "no-store" })
        const data = await res.json()
        const item = data.achievement || null
        setAchievement(item)

        if (item?.athlete_id) {
          const athleteRes = await fetch(`/api/users/${item.athlete_id}`, { cache: "no-store" })
          const athleteData = await athleteRes.json()
          setAthlete(athleteData.user || null)
        }

        if (item?.verified_by) {
          const verifierRes = await fetch(`/api/users/${item.verified_by}`, { cache: "no-store" })
          const verifierData = await verifierRes.json()
          setVerifier(verifierData.user || null)
        }
      } catch (error) {
        console.error("Failed to load achievement", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAchievement()
  }, [id])

  if (isLoadingUser) {
    return (
      <DashboardLayout role="official">
        <div className="text-muted-foreground">Loading verification...</div>
      </DashboardLayout>
    )
  }

  if (!currentUser) return null

  if (isLoading) {
    return (
      <DashboardLayout role="official">
        <div className="text-muted-foreground">Loading verification...</div>
      </DashboardLayout>
    )
  }
  
  if (!achievement) {
    return (
      <DashboardLayout role="official">
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-foreground mb-2">Achievement Not Found</h2>
          <p className="text-muted-foreground mb-4">This achievement doesn't exist or has been removed.</p>
          <Link href="/official/verifications">
            <Button className="bg-primary text-primary-foreground">Back to Verifications</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }
  
  const handleVerify = async () => {
    if (!achievement) return
    await fetch(`/api/achievements/${achievement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "verified", verifiedBy: currentUser.id }),
    })
    router.push("/official/verifications")
  }
  
  const handleReject = async () => {
    if (!achievement) return
    await fetch(`/api/achievements/${achievement.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", verifiedBy: currentUser.id }),
    })
    router.push("/official/verifications")
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-primary/10"
      case "pending":
        return "bg-accent/10"
      case "rejected":
        return "bg-destructive/10"
      default:
        return "bg-muted"
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-6 w-6 text-primary" />
      case "pending":
        return <AlertCircle className="h-6 w-6 text-accent" />
      case "rejected":
        return <XCircle className="h-6 w-6 text-destructive" />
      default:
        return null
    }
  }
  
  return (
    <DashboardLayout role="official">
      <div className="space-y-6 max-w-4xl">
        {/* Back Button */}
        <Link href="/official/verifications" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Verifications
        </Link>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`h-14 w-14 rounded-full ${getStatusColor(achievement.status)} flex items-center justify-center`}>
              {getStatusIcon(achievement.status)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{achievement.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={
                  achievement.status === "verified" ? "bg-primary/20 text-primary border-0" :
                  achievement.status === "pending" ? "bg-accent/20 text-accent border-0" :
                  "bg-destructive/20 text-destructive border-0"
                }>
                  {achievement.status}
                </Badge>
                <Badge variant="outline" className="border-border">
                  {achievement.category}
                </Badge>
              </div>
            </div>
          </div>
          
          {achievement.status === "pending" && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                onClick={handleReject}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleVerify}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
          )}
        </div>
        
        {/* Achievement Details */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Achievement Details</CardTitle>
            <CardDescription>Complete information about this achievement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-foreground">{achievement.description}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Date Achieved</h4>
                <p className="text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(achievement.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Category</h4>
                <p className="text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  {achievement.category}
                </p>
              </div>
            </div>
            
            {achievement.evidence && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Evidence</h4>
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 text-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Evidence attached</span>
                  </div>
                </div>
              </div>
            )}
            
            {verifier && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Verified By</h4>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {verifier.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{verifier.name}</p>
                    {(achievement.verified_date ?? achievement.verifiedDate) && (
                      <p className="text-sm text-muted-foreground">
                        on {new Date(achievement.verified_date ?? achievement.verifiedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Athlete Information */}
        {athlete && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Athlete Information</CardTitle>
              <CardDescription>Details about the athlete who submitted this achievement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {athlete.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-foreground text-lg">{athlete.name}</h3>
                  <p className="text-muted-foreground">{athlete.sport}</p>
                  <p className="text-sm text-muted-foreground">{athlete.email}</p>
                </div>
              </div>
              
              {athlete.bio && (
                <div className="mt-4 p-4 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">{athlete.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Review Notes (for pending) */}
        {achievement.status === "pending" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Review Notes</CardTitle>
              <CardDescription>Add notes about your verification decision (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this verification..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-input border-border min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button 
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={handleReject}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Achievement
                </Button>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleVerify}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Achievement
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
