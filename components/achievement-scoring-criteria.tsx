'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trophy, Zap, Target, Award } from 'lucide-react'

export const ACHIEVEMENT_SCORING_CRITERIA = {
  'Competition': {
    points: 5,
    description: 'Competitive events, tournaments, and contests',
    icon: Trophy,
    color: 'bg-yellow-500'
  },
  'Season Award': {
    points: 5,
    description: 'Awards received for seasonal performance',
    icon: Award,
    color: 'bg-purple-500'
  },
  'Performance': {
    points: 4,
    description: 'Personal performance milestones and records',
    icon: Zap,
    color: 'bg-orange-500'
  },
  'Training': {
    points: 3,
    description: 'Training certifications and completion milestones',
    icon: Target,
    color: 'bg-blue-500'
  }
}

export const ACHIEVEMENT_RATING_FORMULA = {
  description: 'Achievement-Based Rating Formula',
  formula: 'Rating = min(5, (Total Score / Achievement Count) × 0.9 + 0.5)',
  explanation: 'This formula calculates an average score per achievement, applies a 0.9 weighting factor (to keep ratings realistic), adds a 0.5 baseline, and caps at 5.0'
}

interface AchievementScoringCriteriaProps {
  compact?: boolean
}

export function AchievementScoringCriteria({ compact = false }: AchievementScoringCriteriaProps) {
  const categories = Object.entries(ACHIEVEMENT_SCORING_CRITERIA)

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Achievement Scoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map(([category, data]) => (
            <div key={category} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{category}</span>
              <Badge variant="outline">{data.points} pts</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievement Scoring Criteria</CardTitle>
        <CardDescription>
          How athlete achievements are scored and rated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scoring Categories */}
        <div>
          <h3 className="font-semibold mb-4">Points by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(([category, data]) => {
              const IconComponent = data.icon
              return (
                <div key={category} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${data.color}`}></div>
                    <h4 className="font-medium">{category}</h4>
                    <Badge className="ml-auto">{data.points} points</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Rating Formula */}
        <div>
          <h3 className="font-semibold mb-3">{ACHIEVEMENT_RATING_FORMULA.description}</h3>
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="font-mono text-sm bg-background p-3 rounded border">
              {ACHIEVEMENT_RATING_FORMULA.formula}
            </div>
            <p className="text-sm text-muted-foreground">
              {ACHIEVEMENT_RATING_FORMULA.explanation}
            </p>
          </div>
        </div>

        <Separator />

        {/* Scoring Rules */}
        <div>
          <h3 className="font-semibold mb-3">Scoring Rules</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Only <strong>verified</strong> achievements count towards the rating</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Pending or rejected achievements do not contribute to the score</span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Athletes with no verified achievements receive a default rating of <strong>3.0</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Maximum possible rating is <strong>5.0</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>Each achievement contributes equally to the average calculation</span>
            </li>
          </ul>
        </div>

        <Separator />

        {/* Example */}
        <div>
          <h3 className="font-semibold mb-3">Example Calculation</h3>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Athlete with 3 verified achievements:</strong></p>
            <ul className="ml-4 space-y-1 font-mono text-xs">
              <li>• 1 × Competition Award: 5 points</li>
              <li>• 1 × Performance Milestone: 4 points</li>
              <li>• 1 × Training Certification: 3 points</li>
            </ul>
            <p className="mt-2"><strong>Calculation:</strong></p>
            <p className="ml-4 font-mono text-xs">
              Total Score = 5 + 4 + 3 = 12<br/>
              Average = 12 ÷ 3 = 4<br/>
              Rating = min(5, 4 × 0.9 + 0.5) = min(5, 4.1) = <strong>4.1</strong>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
