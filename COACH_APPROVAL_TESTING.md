# Coach Sport Registration Approval - Testing Guide

## Overview
This guide helps you test the new coach approval workflow for athlete sport registrations.

## What Was Implemented

### 1. API Endpoint
- **Route**: `PATCH /api/sport-registrations/{id}`
- **Purpose**: Allows coaches to approve or reject sport registrations
- **Access Control**: Only the assigned coach can approve/reject their registrations
- **Features**:
  - Updates registration status to 'approved' or 'rejected'
  - Sends notification to athlete
  - Logs audit trail

### 2. Coach Athletes Page UI
- **Location**: `/coach/athletes`
- **New Features**:
  - Pending Sport Registrations section at the top
  - Shows all pending registrations assigned to the coach
  - Approve/Reject buttons for each registration
  - Reject dialog with optional notes field

## Testing Steps

### Prerequisites
1. Development server is running (`pnpm dev`)
2. Database is seeded with test data

### Current Test Data (from database)
- **Pending Registration**: Soccer sport registration
  - Athlete: Dilhara
  - Coach: Jack (email: 11ch@gmail.com)
  - Status: pending
  - Priority: 1

### Test Flow

#### 1. Login as Coach
1. Navigate to `http://localhost:3000/login`
2. Login with coach credentials:
   - Email: `11ch@gmail.com`
   - Password: `password` (or whatever was set during registration)

#### 2. View Pending Registrations
1. Navigate to `/coach/athletes`
2. You should see:
   - **Pending Sport Registrations** card at the top (orange border)
   - The pending registration for Dilhara requesting Soccer training
   - Athlete details displayed in a grid:
     - **School/Club**: St. Joseph College
     - **Age**: 20 years (calculated from date of birth: 2005-03-15)
     - **National Ranking**: #5
     - **District**: Colombo
     - **Training Place**: National Stadium
     - **Athlete Type**: (varies, e.g., student/university/normal)
   - Priority level and sport displayed
   - Two buttons: "Approve" (green) and "Reject" (red)

#### 3. Test Approval Flow
1. Click the **Approve** button on the pending registration
2. Expected behavior:
   - Button shows "Processing..." state
   - Registration status updates to 'approved'
   - Pending registration disappears from the list
   - Success alert displayed
   - Athlete receives notification about approval

#### 4. Test Rejection Flow
To test rejection, you'll need to create a new pending registration first:

1. **As an Athlete** (login as Dilhara or create new athlete):
   - Go to `/athlete/training`
   - Click "Register for New Sport"
   - Select a sport and Jack as coach
   - Submit registration

2. **As Coach Jack**:
   - Go back to `/coach/athletes`
   - Click **Reject** button on the new registration
   - Rejection dialog opens
   - Optionally add rejection notes
   - Click "Reject Registration"
   - Expected behavior:
     - Registration status updates to 'rejected'
     - Pending registration disappears
     - Athlete receives notification with rejection notes

#### 5. Verify Notifications
1. **As the Athlete**:
   - Check notifications (bell icon in navbar)
   - Should see approval/rejection notification

#### 6. Training Plan Assignment
After approval, coaches can assign training plans to approved athletes:

1. **As Coach**:
   - Navigate to `/coach/training-plans/new`
   - Create a new training plan
   - In athlete selection, you can now select the approved athlete
   - The approved athlete appears in the coach's athletes list

## Database Verification

Check registration status directly in the database:

```powershell
$env:PGPASSWORD='123@pdimUA'
psql -h localhost -U uap_user -d uap_db -c "SELECT sr.id, sr.sport, sr.status, u1.name as athlete_name, u2.name as coach_name FROM sport_registrations sr JOIN users u1 ON sr.athlete_id = u1.id JOIN users u2 ON sr.coach_id = u2.id;"
```

Check notifications:

```powershell
$env:PGPASSWORD='123@pdimUA'
psql -h localhost -U uap_user -d uap_db -c "SELECT type, title, message, read FROM notifications WHERE type IN ('registration_approved', 'registration_rejected') ORDER BY created_at DESC LIMIT 5;"
```

## Expected Results

### On Approval
- ✅ Registration status changes to 'approved'
- ✅ Athlete gets notification about approval
- ✅ Registration removed from pending list
- ✅ Audit log entry created
- ✅ Athlete can now be assigned to training plans

### On Rejection
- ✅ Registration status changes to 'rejected'
- ✅ Athlete gets notification with rejection reason
- ✅ Registration removed from pending list
- ✅ Audit log entry created

## UI Screenshots Reference

### Pending Registrations Section
- Orange bordered card at top of Athletes page
- Shows athlete avatar, name, sport, and priority
- Green "Approve" and red "Reject" buttons
- Badge showing "Pending" status

### Reject Dialog
- Shows athlete name and sport
- Optional textarea for rejection notes
- Cancel and Reject buttons
- Confirmation flow

## Troubleshooting

### No pending registrations showing
- Verify you're logged in as the correct coach
- Check database for pending registrations assigned to your coach ID
- Ensure API call to `/api/sport-registrations?coachId={id}&status=pending` returns data

### Approval/Rejection not working
- Check browser console for errors
- Verify API endpoint returns success
- Check database permissions for uap_user
- Ensure coach ID matches the registration's coach_id

### Notifications not appearing
- Check notifications table in database
- Verify notification creation in API endpoint
- Check notification center in UI

## Next Steps

After testing, consider these enhancements:
1. Add email notifications for approval/rejection
2. Filter training plan athlete list to show only approved athletes
3. Add bulk approval functionality
4. Show approval history in athlete profile
5. Add analytics for approval rates

## Files Modified

1. `/app/api/sport-registrations/[id]/route.ts` - Approval endpoint
2. `/app/coach/athletes/page.tsx` - Coach athletes page with pending registrations UI and athlete details display
3. `/db/migrations/005_athlete_details.sql` - Database migration for athlete detail fields
4. `/app/register/page.tsx` - Registration form with athlete detail fields
5. `/app/api/users/register/route.ts` - Registration API endpoint to handle athlete details

## New Features Added

### Athlete Detail Fields
When registering as an athlete, users can now provide:
- **Athlete Type**: Student, University, or Normal
- **School/Club Name**: Educational institution or sports club
- **Date of Birth**: Used to calculate age
- **National Ranking**: Optional ranking in their sport
- **District**: Geographic location
- **Training Place**: Primary training facility

These details are displayed to coaches when reviewing pending sport registrations, helping them make informed decisions about which athletes to accept.
