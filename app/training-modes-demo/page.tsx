'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TrainingModesDemo() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the integrated training modes section in the athlete training page
    router.replace('/athlete/training')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to training modes...</p>
    </div>
  )
}
