'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { ProfileComponent } from '@/components/profile-component'

export default function AthleteProfilePage() {
  return (
    <DashboardLayout role="athlete">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your profile information and preferences
          </p>
        </div>

        <ProfileComponent />
      </div>
    </DashboardLayout>
  )
}
