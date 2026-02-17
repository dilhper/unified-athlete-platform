# Test the API endpoints
Write-Host "Testing API at http://localhost:3000/api/users" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method GET -TimeoutSec 5
    Write-Host "`n Success!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "`n Failed to connect!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "1. Database is running: npx prisma dev db start"
    Write-Host "2. Dev server is running: pnpm dev"
}
