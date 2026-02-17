'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Radio, Upload, FileText } from 'lucide-react'
interface TrainingPlan {
  id: string
  name: string
  mode: 'physical' | 'online' | 'both'
}

interface TrainingModeRegistrationProps {
  plan: TrainingPlan
  athleteId: string
  onSubmit: (mode: 'physical' | 'online', evidence?: { venue: string; dateTime: string; location: string }, files?: File[]) => void
  isLoading?: boolean
}

export function TrainingModeRegistration({
  plan,
  athleteId,
  onSubmit,
  isLoading = false,
}: TrainingModeRegistrationProps) {
  const [selectedMode, setSelectedMode] = useState<'physical' | 'online' | null>(null)
  const [evidence, setEvidence] = useState({
    venue: '',
    dateTime: '',
    location: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)

  const handleModeSelect = (mode: 'physical' | 'online') => {
    setSelectedMode(mode)
    setShowEvidenceForm(mode === 'online')
    setError('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = () => {
    if (!selectedMode) {
      setError('Please select a training mode')
      return
    }

    if (selectedMode === 'online') {
      if (!evidence.venue || !evidence.dateTime || !evidence.location) {
        setError('Please fill in all evidence fields for online training')
        return
      }
      if (files.length === 0) {
        setError('Please upload evidence for online training')
        return
      }
    }

    onSubmit(selectedMode, selectedMode === 'online' ? evidence : undefined, files.length > 0 ? files : undefined)
  }

  const modeAvailable = (mode: 'physical' | 'online') => {
    if (plan.mode === 'both') return true
    return plan.mode === mode
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Training Mode</CardTitle>
        <CardDescription>Choose how you want to participate in this program</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-md text-sm text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-foreground font-semibold">Training Mode</Label>

          {/* Physical Mode Option */}
          {modeAvailable('physical') && (
            <button
              onClick={() => handleModeSelect('physical')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedMode === 'physical'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedMode === 'physical'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}>
                  {selectedMode === 'physical' && (
                    <div className="h-3 w-3 bg-primary-foreground rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Physical Training</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Train in-person at the specified venue and schedule
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Online Mode Option */}
          {modeAvailable('online') && (
            <button
              onClick={() => handleModeSelect('online')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedMode === 'online'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedMode === 'online'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}>
                  {selectedMode === 'online' && (
                    <div className="h-3 w-3 bg-primary-foreground rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">Online Training</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Train remotely (requires evidence submission with venue, date, and time)
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Evidence Form for Online Mode */}
        {showEvidenceForm && selectedMode === 'online' && (
          <div className="space-y-4 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
            <h3 className="font-semibold text-foreground">Training Evidence</h3>
            <p className="text-xs text-muted-foreground">
              Please provide details about your remote training setup and location
            </p>

            <div className="space-y-2">
              <Label htmlFor="venue" className="text-foreground text-sm">
                Venue/Platform
              </Label>
              <Input
                id="venue"
                placeholder="e.g., Zoom, Google Meet, Home, Gym, etc."
                value={evidence.venue}
                onChange={(e) => setEvidence({ ...evidence, venue: e.target.value })}
                disabled={isLoading}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTime" className="text-foreground text-sm">
                Training Date & Time
              </Label>
              <Input
                id="dateTime"
                type="datetime-local"
                value={evidence.dateTime}
                onChange={(e) => setEvidence({ ...evidence, dateTime: e.target.value })}
                disabled={isLoading}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-foreground text-sm">
                Training Location
              </Label>
              <Input
                id="location"
                placeholder="e.g., Home, Coffee shop, Sports facility, etc."
                value={evidence.location}
                onChange={(e) => setEvidence({ ...evidence, location: e.target.value })}
                disabled={isLoading}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence-files" className="text-foreground text-sm cursor-pointer">
                <div className="flex items-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-md hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Upload Evidence (Screenshots, photos, certificates)</span>
                </div>
              </Label>
              <Input
                id="evidence-files"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
              />

              {files.length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-muted-foreground font-semibold">Uploaded files:</p>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-background rounded-md text-sm border border-border">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                        className="h-6 px-2 text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedMode || isLoading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? 'Registering...' : `Register for ${selectedMode ? (selectedMode === 'physical' ? 'Physical' : 'Online') : 'Training'} Mode`}
        </Button>
      </CardContent>
    </Card>
  )
}
