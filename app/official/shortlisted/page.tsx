"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Award, CheckCircle2, Clock, Star } from "lucide-react"

export default function ShortlistedAthletesPage() {
  const [shortlistRows, setShortlistRows] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<Record<string, any>>({})
  const [athletes, setAthletes] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [shortlistedRes, opportunitiesRes, athletesRes] = await Promise.all([
          fetch("/api/shortlisted", { cache: "no-store" }),
          fetch("/api/opportunities", { cache: "no-store" }),
          fetch("/api/users?role=athlete&limit=200", { cache: "no-store" }),
        ])

        const shortlistedData = await shortlistedRes.json()
        const opportunitiesData = await opportunitiesRes.json()
        const athletesData = await athletesRes.json()

        const oppMap: Record<string, any> = {}
        ;(opportunitiesData.opportunities || []).forEach((opp: any) => {
          oppMap[opp.id] = opp
        })

        const athleteMap: Record<string, any> = {}
        ;(athletesData.users || []).forEach((athlete: any) => {
          athleteMap[athlete.id] = athlete
        })

        setShortlistRows(shortlistedData.shortlisted || [])
        setOpportunities(oppMap)
        setAthletes(athleteMap)
      } catch (error) {
        console.error("Failed to load shortlisted athletes", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const shortlistedAthletes = useMemo(() => {
    return shortlistRows
      .filter((row) => row.status === 'shortlisted')
      .map((row) => {
        const athlete = athletes[row.athlete_id] || {}
        const opportunity = opportunities[row.opportunity_id] || {}
        return {
          id: row.athlete_id,
          name: athlete.name || 'Unknown',
          sport: athlete.sport || 'Not specified',
          rating: athlete.rating || 0,
          type: opportunity.type || 'opportunity',
          opportunityTitle: opportunity.title || 'Opportunity',
          status: row.status,
          appliedDate: row.created_at || row.createdAt,
          achievements: 0,
        }
      })
  }, [shortlistRows, athletes, opportunities])

  const approvedAthletes = useMemo(() => {
    return shortlistRows
      .filter((row) => row.status === 'approved')
      .map((row) => {
        const athlete = athletes[row.athlete_id] || {}
        const opportunity = opportunities[row.opportunity_id] || {}
        return {
          id: row.athlete_id,
          name: athlete.name || 'Unknown',
          sport: athlete.sport || 'Not specified',
          rating: athlete.rating || 0,
          type: opportunity.type || 'opportunity',
          opportunityTitle: opportunity.title || 'Opportunity',
          status: row.status,
          approvedDate: row.created_at || row.createdAt,
          achievements: 0,
        }
      })
  }, [shortlistRows, athletes, opportunities])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shortlisted': return 'bg-amber-500/20 text-amber-700'
      case 'approved': return 'bg-green-500/20 text-green-700'
      case 'rejected': return 'bg-red-500/20 text-red-700'
      default: return 'bg-gray-500/20 text-gray-700'
    }
  }

  const renderAthleteCard = (athlete: any, showActions = false) => (
    <Card key={athlete.id} className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {athlete.name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{athlete.name}</h3>
                <p className="text-sm text-muted-foreground">{athlete.sport}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium text-foreground">{athlete.rating}</span>
                </div>
                <Badge className={getStatusColor(athlete.status)}>
                  {athlete.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Applied For</p>
                <p className="text-sm font-medium text-foreground">{athlete.opportunityTitle}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {athlete.type}
                  </Badge>
                  <span>• Applied {new Date(athlete.appliedDate || athlete.approvedDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded-md bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">Achievements</p>
                  <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-blue-500" />
                    {athlete.achievements}
                  </p>
                </div>
                <div className="p-2 rounded-md bg-purple-500/5 border border-purple-500/20">
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                    <Award className="h-4 w-4 text-purple-500" />
                    Excellent
                  </p>
                </div>
              </div>

              {showActions && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 border-border">
                    View Profile
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10">
                    Reject
                  </Button>
                  <Button size="sm" className="flex-1 bg-green-600 text-white hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout role="official">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shortlisted Athletes</h1>
          <p className="text-muted-foreground">Manage sponsorships and scholarships for shortlisted athletes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shortlisted</p>
                  <p className="text-2xl font-bold text-foreground">{shortlistedAthletes.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-foreground">{approvedAthletes.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-foreground">$25,000</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="shortlisted" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="shortlisted" className="text-foreground">
              Shortlisted
              {shortlistedAthletes.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-700">
                  {shortlistedAthletes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-foreground">
              Approved
              {approvedAthletes.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-700">
                  {approvedAthletes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-foreground">All Applications</TabsTrigger>
          </TabsList>

          {/* Shortlisted Tab */}
          <TabsContent value="shortlisted" className="space-y-4 pt-6">
            {isLoading ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center text-muted-foreground">Loading shortlisted athletes...</CardContent>
              </Card>
            ) : shortlistedAthletes.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Shortlisted Athletes</h3>
                  <p className="text-muted-foreground">Athletes shortlisted for opportunities will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {shortlistedAthletes.map((athlete) => renderAthleteCard(athlete, true))}
              </div>
            )}
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved" className="space-y-4 pt-6">
            {isLoading ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center text-muted-foreground">Loading approved athletes...</CardContent>
              </Card>
            ) : approvedAthletes.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-16 text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Approved Athletes</h3>
                  <p className="text-muted-foreground">Approved athletes will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedAthletes.map((athlete) => renderAthleteCard(athlete, false))}
              </div>
            )}
          </TabsContent>

          {/* All Applications Tab */}
          <TabsContent value="all" className="space-y-4 pt-6">
            <div className="space-y-4">
              {[...shortlistedAthletes, ...approvedAthletes].map((athlete) => renderAthleteCard(athlete, false))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
