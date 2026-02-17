'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface CoachTrainingProgramSetupProps {
  onSubmit: (data: TrainingProgramData) => void
  isLoading?: boolean
}

export interface TrainingProgramData {
  name: string
  description: string
  mode: 'physical' | 'online' | 'both'
  startDate: string
  endDate: string
  maxAthletes?: number
  requirements?: string
}

export function CoachTrainingProgramSetup({
  onSubmit,
  isLoading = false,
}: CoachTrainingProgramSetupProps) {
  const [formData, setFormData] = useState<TrainingProgramData>({
    name: '',
    description: '',
    mode: 'both',
    startDate: '',
    endDate: '',
    maxAthletes: 20,
    requirements: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Program name is required')
      return
    }

    if (!formData.description.trim()) {
      setError('Program description is required')
      return
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Start date and end date are required')
      return
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date')
      return
    }

    onSubmit(formData)
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Training Program</CardTitle>
        <CardDescription>Set up a new training program for athletes</CardDescription>
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
            Training program created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Program Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">
              Program Name
            </Label>
            <Input
              id="name"
              placeholder="e.g., Sprint Excellence Program"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="bg-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Program Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the program, goals, and what athletes will learn..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              className="bg-input border-border min-h-24"
            />
          </div>

          {/* Training Mode */}
          <div className="space-y-3">
            <Label className="text-foreground font-semibold">Training Mode</Label>
            <p className="text-xs text-muted-foreground">
              Select which training mode(s) you want to offer
            </p>

            <div className="space-y-2">
              {(['physical', 'online', 'both'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                  <input
                    type="radio"
                    name="mode"
                    value={mode}
                    checked={formData.mode === mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}
                    disabled={isLoading}
                    className="w-4 h-4"
                  />
                  <span className="flex-1">
                    <span className="font-medium text-foreground">
                      {mode === 'physical' ? 'Physical Training Only' : mode === 'online' ? 'Online Training Only' : 'Both Physical & Online'}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mode === 'physical' 
                        ? 'Athletes will train in-person at your facility'
                        : mode === 'online'
                        ? 'Athletes will train remotely (evidence required)'
                        : 'Athletes can choose between physical or online training'}
                    </p>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-foreground">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={isLoading}
                className="bg-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-foreground">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={isLoading}
                className="bg-input"
              />
            </div>
          </div>

          {/* Max Athletes */}
          <div className="space-y-2">
            <Label htmlFor="maxAthletes" className="text-foreground">
              Maximum Athletes (Optional)
            </Label>
            <Input
              id="maxAthletes"
              type="number"
              min="1"
              max="100"
              value={formData.maxAthletes}
              onChange={(e) => setFormData({ ...formData, maxAthletes: parseInt(e.target.value) || undefined })}
              disabled={isLoading}
              className="bg-input"
            />
            <p className="text-xs text-muted-foreground">Leave blank for unlimited</p>
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements" className="text-foreground">
              Program Requirements (Optional)
            </Label>
            <Textarea
              id="requirements"
              placeholder="e.g., Minimum fitness level, required equipment, prerequisites..."
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              disabled={isLoading}
              className="bg-input border-border min-h-20"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? 'Creating Program...' : 'Create Training Program'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
