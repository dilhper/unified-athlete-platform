'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, FileText, User, Mail, Phone, MapPin, Award } from 'lucide-react'
interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  location?: string
  athleteType?: string
  sport?: string
  specialty?: string
  yearsOfExperience?: number
  isAdmin?: boolean
  profileVerified?: boolean
  documents?: any[]
  created_at?: string
}

interface RegistrationReviewProps {
  user: User
  onApprove: (userId: string, comments: string) => void
  onReject: (userId: string, reason: string) => void
  isLoading?: boolean
}

export function RegistrationReview({
  user,
  onApprove,
  onReject,
  isLoading = false,
}: RegistrationReviewProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [comments, setComments] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const handleApprove = () => {
    onApprove(user.id, comments)
    setComments('')
    setShowApproveDialog(false)
  }

  const handleReject = () => {
    onReject(user.id, rejectReason)
    setRejectReason('')
    setShowRejectDialog(false)
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      athlete: 'Athlete',
      coach: 'Coach',
      specialist: 'Specialist',
      official: 'Official',
    }
    return labels[role] || role
  }

  const getAthleteTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      student: 'School Student',
      university: 'University Student',
      normal: 'Non-Student Athlete',
    }
    return type ? labels[type] || type : 'N/A'
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-foreground">{user.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className="font-medium">{getRoleLabel(user.role)}</span>
                {user.isAdmin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={user.profileVerified ? 'default' : 'outline'}
            className={
              user.profileVerified
                ? 'bg-green-500/20 text-green-700 border-green-300'
                : 'border-yellow-300 text-yellow-700'
            }
          >
            {user.profileVerified ? 'Verified' : 'Pending Review'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contact Information */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Contact Information</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{user.phone}</span>
              </div>
            )}
            {user.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{user.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Role-Specific Information */}
        {user.role === 'athlete' && (
          <div className="space-y-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold text-foreground">Athlete Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="text-foreground font-medium">{getAthleteTypeLabel(user.athleteType)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sport</p>
                <p className="text-foreground font-medium">{user.sport || 'Not specified'}</p>
              </div>
            </div>
          </div>
        )}

        {user.role === 'coach' && (
          <div className="space-y-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <h3 className="font-semibold text-foreground">Coach Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Sport(s)</p>
                <p className="text-foreground font-medium">{user.sport || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Experience</p>
                <p className="text-foreground font-medium">{user.yearsOfExperience || 'Not specified'} years</p>
              </div>
            </div>
          </div>
        )}

        {user.role === 'specialist' && (
          <div className="space-y-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h3 className="font-semibold text-foreground">Specialist Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Specialty</p>
                <p className="text-foreground font-medium">{user.specialty || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Experience</p>
                <p className="text-foreground font-medium">{user.yearsOfExperience || 'Not specified'} years</p>
              </div>
            </div>
          </div>
        )}

        {/* Document Verification */}
        {user.documents && user.documents.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Submitted Documents</h3>
            <div className="space-y-2">
              {user.documents.map((doc, index) => {
                // Handle both string (old format) and object (new format)
                const isObject = typeof doc === 'object' && doc !== null
                const fileName = isObject ? doc.fileName : (doc.split('/').pop() || 'Document')
                const filePath = isObject ? doc.filePath : doc
                const documentType = isObject ? doc.documentType?.replace('_', ' ') : ''
                const status = isObject ? doc.status : 'submitted'
                
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border"
                  >
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {documentType && <span>{documentType} • </span>}
                        {isObject && status && <span className="capitalize">{status}</span>}
                        {!isObject && (
                          <>
                            {filePath.includes('.pdf') && 'PDF Document'}
                            {filePath.includes('.jpg') || filePath.includes('.jpeg') ? 'Image' : ''}
                            {filePath.includes('.png') ? 'Image' : ''}
                          </>
                        )}
                      </p>
                    </div>
                    <a
                      href={filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        View
                      </Button>
                    </a>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Registration Date */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Registered</span>
          <span className="text-sm font-medium text-foreground">
            {new Date(user.created_at || new Date()).toLocaleDateString()}
          </span>
        </div>

        {/* Review Status */}
        {user.profileVerified && (
          <Alert className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              This registration has been verified and approved.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        {!user.profileVerified && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
              className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Approve Registration</DialogTitle>
              <DialogDescription>
                Add any optional comments for {user.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Optional: Add comments about this registration..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="bg-input border-border min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveDialog(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {isLoading ? 'Approving...' : 'Approve Registration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Reject Registration</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this registration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Required: Explain why this registration is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-input border-border min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(false)}
                  className="border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isLoading || !rejectReason.trim()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isLoading ? 'Rejecting...' : 'Reject Registration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
