# Create Test Data via API
Write-Host "Creating test data..." -ForegroundColor Cyan

# Create a coach
$coach = @{
    email = "coach@example.com"
    name = "John Coach"
    role = "coach"
    sport = "Basketball"
    avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=coach"
} | ConvertTo-Json

try {
    $coachResult = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $coach -ContentType "application/json"
    Write-Host " Created coach: $($coachResult.name)" -ForegroundColor Green
    
    # Create athletes
    $athlete1 = @{
        email = "athlete1@example.com"
        name = "Sarah Athlete"
        role = "athlete"
        sport = "Basketball"
    } | ConvertTo-Json
    
    $athlete1Result = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method POST -Body $athlete1 -ContentType "application/json"
    Write-Host " Created athlete: $($athlete1Result.name)" -ForegroundColor Green
    
    # Create community
    $community = @{
        name = "Basketball Training Group"
        description = "Elite training community"
        sport = "Basketball"
        coachId = $coachResult.id
        memberIds = @($athlete1Result.id)
    } | ConvertTo-Json
    
    $communityResult = Invoke-RestMethod -Uri "http://localhost:3000/api/communities" -Method POST -Body $community -ContentType "application/json"
    Write-Host " Created community: $($communityResult.name)" -ForegroundColor Green
    
    # List all users
    Write-Host "`nAll Users:" -ForegroundColor Yellow
    $users = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method GET
    $users.users | Format-Table name, role, email
    
    Write-Host "Success! Backend is working!" -ForegroundColor Green
    
} catch {
    Write-Host " Error: $($_.Exception.Message)" -ForegroundColor Red
}
