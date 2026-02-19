'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader, AlertCircle, MessageSquare, UserPlus } from 'lucide-react'
import { RealtimeChat } from '@/components/realtime-chat'

interface Community {
  id: string
  name: string
  description: string
  member_ids: string[]
  created_at: string
}

export default function CommunitiesPage() {
  const { data: session, status } = useSession()
  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  if (status === 'unauthenticated') {
    redirect('/')
  }

  useEffect(() => {
    fetchCommunities()
  }, [session])

  const fetchCommunities = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/communities')
      if (response.ok) {
        const data = await response.json()
        const incoming = data.communities || []
        const userId = (session?.user as any)?.id
        const filtered = userId
          ? incoming.filter((community: Community) => (community.member_ids || []).includes(userId))
          : incoming
        setCommunities(filtered)
      } else {
        setError('Failed to load communities')
      }
    } catch (err) {
      setError('An error occurred while loading communities')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading communities...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (selectedCommunity) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedCommunity(null)}>
              ← Back to Communities
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{selectedCommunity.name}</h1>
              <p className="text-muted-foreground">{selectedCommunity.description}</p>
            </div>
          </div>

          <RealtimeChat
            communityId={selectedCommunity.id}
            communityName={selectedCommunity.name}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Communities</h1>
          <p className="text-muted-foreground mt-2">
            Join communities to connect and chat with athletes, coaches, and specialists
          </p>
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive/50">
            <CardHeader className="py-3 px-4">
              <div className="flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </CardHeader>
          </Card>
        )}

        {communities.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No communities found</p>
              <Button variant="outline" onClick={fetchCommunities}>
                Refresh
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Card key={community.id} className="hover:border-primary/50 cursor-pointer transition-colors">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{community.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {community.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {(community.member_ids || []).length} members
                    </span>
                  </div>

                  <Button
                    onClick={() => setSelectedCommunity(community)}
                    className="w-full bg-primary"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
