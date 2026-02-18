"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Briefcase, 
  Calendar, 
  Search, 
  GraduationCap, 
  Trophy as TrophyIcon, 
  DollarSign, 
  Dumbbell,
  CheckCircle2,
  Building2
} from "lucide-react"

const typeIcons = {
  scholarship: <GraduationCap className="h-5 w-5" />,
  competition: <TrophyIcon className="h-5 w-5" />,
  sponsorship: <DollarSign className="h-5 w-5" />,
  training: <Dumbbell className="h-5 w-5" />,
}

const typeColors = {
  scholarship: "bg-primary/10 text-primary",
  competition: "bg-accent/10 text-accent",
  sponsorship: "bg-chart-4/20 text-chart-4",
  training: "bg-chart-3/20 text-chart-3",
}

export default function AthleteOpportunitiesPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [opportunities, setOpportunities] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

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
    if (!currentUser) return

    const loadData = async () => {
      try {
        const [opportunitiesRes, applicationsRes] = await Promise.all([
          fetch("/api/opportunities", { cache: "no-store" }),
          fetch(`/api/applications?athleteId=${currentUser.id}`, { cache: "no-store" }),
        ])

        const opportunitiesData = await opportunitiesRes.json()
        const applicationsData = await applicationsRes.json()

        const normalized = (opportunitiesData.opportunities || []).map((opp: any) => {
          const normalizedType = opp.type === "training-camp" ? "training" : opp.type
          const requirements = opp.eligibility
            ? opp.eligibility.split(/\r?\n/).filter(Boolean)
            : ["No specific requirements listed."]
          return {
            ...opp,
            type: normalizedType,
            requirements,
            status: opp.status ?? "open",
          }
        })

        const applied = new Set<string>((applicationsData.applications || []).map((app: any) => app.opportunity_id))

        setOpportunities(normalized)
        setAppliedIds(applied)
      } catch (error) {
        console.error("Failed to load opportunities", error)
      }
    }

    loadData()
  }, [currentUser])
  
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.organization.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !selectedType || opp.type === selectedType
    return matchesSearch && matchesType && opp.status === "open"
  })
  
  const handleApply = async (oppId: string) => {
    if (!currentUser) return
    try {
      await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: currentUser.id,
          opportunityId: oppId,
          status: "submitted",
        }),
      })
      setAppliedIds(prev => new Set([...prev, oppId]))
      setSelectedOpportunity(null)
    } catch (error) {
      console.error("Failed to apply for opportunity", error)
    }
  }
  
  const types = [
    { value: "scholarship", label: "Scholarships" },
    { value: "competition", label: "Competitions" },
    { value: "sponsorship", label: "Sponsorships" },
    { value: "training", label: "Training" },
  ]

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading opportunities...</div>
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
  
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground">Discover scholarships, competitions, sponsorships, and more</p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedType === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(null)}
              className={selectedType === null ? "bg-primary text-primary-foreground" : "border-border"}
            >
              All
            </Button>
            {types.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
                className={selectedType === type.value ? "bg-primary text-primary-foreground" : "border-border"}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {types.map((type) => {
            const count = opportunities.filter(o => o.type === type.value && o.status === "open").length
            return (
              <Card key={type.value} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[type.value as keyof typeof typeColors]}`}>
                    {typeIcons[type.value as keyof typeof typeIcons]}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">{type.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* Opportunities Grid */}
        {filteredOpportunities.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Opportunities Found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOpportunities.map((opp) => {
              const isApplied = appliedIds.has(opp.id)
              
              return (
                <Card key={opp.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeColors[opp.type as keyof typeof typeColors]}`}>
                        {typeIcons[opp.type as keyof typeof typeIcons]}
                      </div>
                      <Badge variant="outline" className="capitalize border-border">
                        {opp.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-foreground text-lg mt-3">{opp.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {opp.organization}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Due {new Date(opp.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-border bg-transparent"
                        onClick={() => setSelectedOpportunity(opp)}
                      >
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        className={isApplied 
                          ? "flex-1 bg-primary/20 text-primary hover:bg-primary/20" 
                          : "flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        }
                        disabled={isApplied}
                        onClick={() => handleApply(opp.id)}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Applied
                          </>
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        
        {/* Detail Dialog */}
        <Dialog open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
          {selectedOpportunity && (
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-2 ${typeColors[selectedOpportunity.type as keyof typeof typeColors]}`}>
                  {typeIcons[selectedOpportunity.type as keyof typeof typeIcons]}
                </div>
                <DialogTitle className="text-foreground">{selectedOpportunity.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {selectedOpportunity.organization}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedOpportunity.description}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Requirements</h4>
                  <ul className="space-y-1">
                    {selectedOpportunity.requirements.map((req, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Deadline: {new Date(selectedOpportunity.deadline).toLocaleDateString()}
                  </div>
                  <Button 
                    className={appliedIds.has(selectedOpportunity.id)
                      ? "bg-primary/20 text-primary hover:bg-primary/20"
                      : "bg-primary text-primary-foreground"
                    }
                    disabled={appliedIds.has(selectedOpportunity.id)}
                    onClick={() => handleApply(selectedOpportunity.id)}
                  >
                    {appliedIds.has(selectedOpportunity.id) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Applied
                      </>
                    ) : (
                      "Apply Now"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
