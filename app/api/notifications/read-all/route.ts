import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function PATCH() {
	try {
		const user = await requirePermission('VIEW_NOTIFICATIONS')

		const result = await query(
			`UPDATE notifications
			 SET read = true
			 WHERE user_id = $1 AND read = false
			 RETURNING id`,
			[user.id]
		)

		return NextResponse.json({
			updated: result.rowCount || 0,
		})
	} catch (error) {
		console.error('Error marking notifications as read:', error)
		return authErrorToResponse(error)
	}
}
