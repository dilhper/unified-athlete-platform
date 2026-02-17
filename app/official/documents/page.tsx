'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, FileText, AlertCircle } from 'lucide-react'

interface DocumentSubmission {
  id: string
  user_id: string
  role: string
  document_type: string
  file_path: string
  original_filename: string
  submitted_at: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  user_email?: string
  user_name?: string
  user_phone?: string
  user_sport?: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<DocumentSubmission | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents/pending')
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch documents')
        return
      }

      setDocuments(data.documents || [])
    } catch (err) {
      setError('An error occurred while fetching documents')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (docId: string) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/documents/${docId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to approve document')
        return
      }

      setDocuments(documents.map((d) => (d.id === docId ? { ...d, status: 'approved' } : d)))
      setSelectedDoc(null)
    } catch (err) {
      setError('An error occurred while approving document')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (docId: string) => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/documents/${docId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectionReason }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reject document')
        return
      }

      setDocuments(
        documents.map((d) =>
          d.id === docId ? { ...d, status: 'rejected', rejection_reason: rejectionReason } : d
        )
      )
      setSelectedDoc(null)
      setRejectionReason('')
    } catch (err) {
      setError('An error occurred while rejecting document')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading documents...</p>
      </div>
    )
  }

  const pendingDocs = documents.filter((d) => d.status === 'pending')

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Document Verification</h1>
          <p className="text-gray-600 mt-2">Review and approve documents from athletes and specialists</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {pendingDocs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No pending documents to review</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingDocs.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{doc.original_filename}</CardTitle>
                      <CardDescription className="mt-1">
                        <div className="font-semibold text-gray-700">{doc.user_name}</div>
                        <div className="text-sm text-gray-600">
                          {doc.user_email && <div>Email: {doc.user_email}</div>}
                          {doc.user_phone && <div>Phone: {doc.user_phone}</div>}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">{doc.role}</Badge>
                      <Badge>{doc.document_type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Submitted</p>
                      <p className="font-medium">
                        {new Date(doc.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Document Type</p>
                      <p className="font-medium capitalize">{doc.document_type.replace('_', ' ')}</p>
                    </div>
                    {doc.user_sport && (
                      <div className="col-span-2">
                        <p className="text-gray-500">Sport(s)</p>
                        <p className="font-medium">{doc.user_sport}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <a
                      href={doc.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm font-medium"
                    >
                      View Document →
                    </a>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(doc.id)}
                    disabled={processing}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setSelectedDoc(doc)}
                    variant="destructive"
                    disabled={processing}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Reject Document</CardTitle>
                <CardDescription>Provide a reason for rejection</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-24"
                />
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDoc(null)
                    setRejectionReason('')
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedDoc.id)}
                  disabled={processing || !rejectionReason.trim()}
                >
                  {processing ? 'Rejecting...' : 'Reject'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
}
