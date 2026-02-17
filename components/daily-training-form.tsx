'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle, Upload, FileText } from 'lucide-react'

interface DailyTrainingFormProps {
  sessionId: string
  athleteId: string
  sessionDate: string
  onSubmit: (data: DailyTrainingData, files?: File[]) => void
  isLoading?: boolean
  isOnlineMode?: boolean
}

export interface DailyTrainingData {
  duration: number
  intensity: 'low' | 'medium' | 'high'
  exercises: string
  mood: 'poor' | 'fair' | 'good' | 'excellent'
  notes?: string
}

export function DailyTrainingForm({
  sessionId,
  athleteId,
  sessionDate,
  onSubmit,
  isLoading = false,
  isOnlineMode = false,
}: DailyTrainingFormProps) {
  const [formData, setFormData] = useState<DailyTrainingData>({
    duration: 60,
    intensity: 'medium',
    exercises: '',
    mood: 'good',
  })
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.exercises.trim()) {
      setError('Please describe the exercises performed')
      return
    }

    if (formData.duration <= 0) {
      setError('Duration must be greater than 0')
      return
    }

    if (isOnlineMode && files.length === 0) {
      setError('Please upload evidence for online training session')
      return
    }

    onSubmit(formData, files.length > 0 ? files : undefined)
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setFormData({
        duration: 60,
        intensity: 'medium',
        exercises: '',
        mood: 'good',
      })
      setFiles([])
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Training Form</CardTitle>
        <CardDescription>
          Log your training session for {new Date(sessionDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-6 flex gap-2 p-3 bg-destructive/10 border border-destructive/50 rounded-md text-sm text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex gap-2 p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            Training form submitted successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-foreground">
                Duration (minutes)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="480"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                disabled={isLoading}
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">How long did you train?</p>
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <Label htmlFor="intensity" className="text-foreground">
                Intensity Level
              </Label>
              <select
                id="intensity"
                value={formData.intensity}
                onChange={(e) => setFormData({ ...formData, intensity: e.target.value as any })}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <p className="text-xs text-muted-foreground">How hard did you work?</p>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-2">
            <Label htmlFor="exercises" className="text-foreground">
              Exercises Performed
            </Label>
            <Textarea
              id="exercises"
              placeholder="List the exercises you performed and their reps/sets (e.g., Push-ups: 3x15, Running: 5km, etc.)"
              value={formData.exercises}
              onChange={(e) => setFormData({ ...formData, exercises: e.target.value })}
              disabled={isLoading}
              className="bg-input border-border min-h-24"
            />
          </div>

          {/* Mood */}
          <div className="space-y-2">
            <Label htmlFor="mood" className="text-foreground">
              How do you feel?
            </Label>
            <select
              id="mood"
              value={formData.mood}
              onChange={(e) => setFormData({ ...formData, mood: e.target.value as any })}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="poor">Poor</option>
              <option value="fair">Fair</option>
              <option value="good">Good</option>
              <option value="excellent">Excellent</option>
            </select>
            <p className="text-xs text-muted-foreground">Your overall feeling during the session</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any injuries, improvements, or observations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isLoading}
              className="bg-input border-border min-h-20"
            />
          </div>

          {/* Evidence Upload for Online Training */}
          {isOnlineMode && (
            <div className="space-y-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Training Evidence
              </h3>
              <p className="text-xs text-muted-foreground">
                Please upload evidence of your online training session (screenshot, video, certificate, etc.)
              </p>

              <Label htmlFor="evidence" className="text-foreground text-sm cursor-pointer">
                <div className="flex items-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-md hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Upload Evidence Files</span>
                </div>
              </Label>
              <Input
                id="evidence"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.webm"
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
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? 'Submitting...' : 'Submit Training Form'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
