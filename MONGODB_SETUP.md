# MongoDB Setup Instructions

MongoDB is the best choice for this project given the complex relations. Here's how to set it up:

## Option 1: MongoDB Atlas (Free Cloud - Recommended)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account
3. Create a free cluster (M0)
4. Get your connection string
5. Update `.env`:
   ```
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/athlete_platform?retryWrites=true&w=majority"
   ```

## Option 2: Local MongoDB
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Install and start MongoDB service
3. Update `.env`:
   ```
   DATABASE_URL="mongodb://localhost:27017/athlete_platform"
   ```

## After MongoDB is set up:
```powershell
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start dev server
pnpm dev
```

## Current Status
- ✅ All API routes created
- ✅ Complete database schema designed
- ⏳ Waiting for MongoDB connection

The backend will work perfectly once MongoDB is connected!
