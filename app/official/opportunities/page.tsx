"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trophy, DollarSign, GraduationCap, Briefcase, Calendar } from "lucide-react"

export default function OpportunitiesPage() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    type: 'sponsorship',
    description: '',
    eligibility: '',
    deadline: '',
    amount: '',
    sport: '',
    organization: ''
  })

  const [opportunities, setOpportunities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadOpportunities = async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/opportunities", { cache: "no-store" })
        const data = await res.json()
        const raw = data.opportunities || []

        const withCounts = await Promise.all(
          raw.map(async (opp: any) => {
            try {
              const appsRes = await fetch(`/api/applications?opportunityId=${opp.id}`, { cache: "no-store" })
              const appsData = await appsRes.json()
              return { ...opp, applicants: (appsData.applications || []).length }
            } catch {
              return { ...opp, applicants: 0 }
            }
          })
        )

        setOpportunities(withCounts)
      } catch (error) {
        console.error("Failed to load opportunities", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOpportunities()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        title: formData.title,
        type: formData.type,
        description: formData.description,
        organization: formData.organization,
        amount: formData.amount ? parseFloat(formData.amount.replace(/[^0-9.]/g, '')) || null : null,
        sport: formData.sport || null,
        deadline: formData.deadline,
        eligibility: formData.eligibility,
      }

      await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const res = await fetch("/api/opportunities", { cache: "no-store" })
      const data = await res.json()
      setOpportunities(data.opportunities || [])
      setShowForm(false)
      setFormData({
        title: '',
        type: 'sponsorship',
        description: '',
        eligibility: '',
        deadline: '',
        amount: '',
        sport: '',
        organization: ''
      })
    } catch (error) {
      console.error("Failed to create opportunity", error)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sponsorship': return <DollarSign className="h-5 w-5" />
      case 'scholarship': return <GraduationCap className="h-5 w-5" />
      case 'competition': return <Trophy className="h-5 w-5" />
      default: return <Briefcase className="h-5 w-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sponsorship': return 'bg-green-500/20 text-green-700'
      case 'scholarship': return 'bg-blue-500/20 text-blue-700'
      case 'competition': return 'bg-purple-500/20 text-purple-700'
      default: return 'bg-gray-500/20 text-gray-700'
    }
  }

  return (
    <DashboardLayout role="official">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Opportunities Management</h1>
            <p className="text-muted-foreground">Post and manage sponsorships, scholarships, and competitions</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Post Opportunity
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Post New Opportunity</CardTitle>
              <CardDescription>Create a new opportunity for athletes</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-foreground">Opportunity Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Nike Youth Excellence Sponsorship"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-input border-border"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-foreground">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="sponsorship">Sponsorship</SelectItem>
                        <SelectItem value="scholarship">Scholarship</SelectItem>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="training-camp">Training Camp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the opportunity, benefits, and what it offers..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-input border-border min-h-[100px]"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organization" className="text-foreground">Organization</Label>
                    <Input
                      id="organization"
                      placeholder="e.g., Nike Foundation"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="bg-input border-border"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-foreground">Amount/Value</Label>
                    <Input
                      id="amount"
                      placeholder="e.g., $10,000/year or Full Tuition"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="bg-input border-border"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sport" className="text-foreground">Sport (Optional)</Label>
                    <Input
                      id="sport"
                      placeholder="e.g., Track & Field, Any"
                      value={formData.sport}
                      onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-foreground">Application Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="bg-input border-border"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eligibility" className="text-foreground">Eligibility Criteria</Label>
                  <Textarea
                    id="eligibility"
                    placeholder="Describe who can apply and requirements..."
                    value={formData.eligibility}
                    onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
                    className="bg-input border-border"
                    required
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-border">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">
                    Post Opportunity
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Opportunities List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-card border-border">
              <CardContent className="p-6 text-muted-foreground">Loading opportunities...</CardContent>
            </Card>
          ) : opportunities.map((opp) => (
            <Card key={opp.id} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`h-12 w-12 rounded-lg ${getTypeColor(opp.type).split(' ')[0]}/10 flex items-center justify-center flex-shrink-0`}>
                      {getTypeIcon(opp.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">{opp.title}</h3>
                        <Badge className={getTypeColor(opp.type)}>
                          {opp.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>
                      <div className="grid md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Organization</p>
                          <p className="text-foreground font-medium">{opp.organization}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Amount</p>
                          <p className="text-foreground font-medium">{opp.amount ?? "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Deadline</p>
                          <p className="text-foreground font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(opp.deadline).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Applicants</p>
                          <p className="text-foreground font-medium">{opp.applicants ?? 0} athletes</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="border-border">
                      View Applications
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
