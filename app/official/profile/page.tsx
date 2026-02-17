'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { ProfileComponent } from '@/components/profile-component'

export default function OfficialProfilePage() {
  return (
    <DashboardLayout role="official">
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
