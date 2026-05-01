# Script hướng dẫn cài đặt package QR Code
# Run this script to install qrcode.react package

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installing QR Code Package" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$frontendPath = Join-Path $PSScriptRoot "inventory-frontend"

if (-Not (Test-Path $frontendPath)) {
    Write-Host "❌ Frontend folder not found: $frontendPath" -ForegroundColor Red
    Write-Host "Please run this script from the '05_Proof of Concept' directory" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "📁 Frontend path: $frontendPath" -ForegroundColor Gray
Write-Host ""

# Check if node_modules exists
$nodeModulesPath = Join-Path $frontendPath "node_modules"
if (-Not (Test-Path $nodeModulesPath)) {
    Write-Host "📦 Installing base dependencies first..." -ForegroundColor Yellow
    Push-Location $frontendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install base dependencies" -ForegroundColor Red
        Pop-Location
        pause
        exit 1
    }
    Pop-Location
    Write-Host "✅ Base dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Install qrcode.react
Write-Host "📦 Installing qrcode.react..." -ForegroundColor Yellow
Push-Location $frontendPath
npm install qrcode.react

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ qrcode.react installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 You're ready to test QR Code PoC!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Start backend:  cd inventory-backend && npm run start:dev" -ForegroundColor Gray
    Write-Host "  2. Start frontend: cd inventory-frontend && npm run dev" -ForegroundColor Gray
    Write-Host "  3. Open: http://localhost:4000" -ForegroundColor Gray
    Write-Host "  4. Click 'QR Code Demo' button" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Failed to install qrcode.react" -ForegroundColor Red
    Write-Host "Please try manually: cd inventory-frontend && npm install qrcode.react" -ForegroundColor Yellow
}

Pop-Location
Write-Host ""
pause
