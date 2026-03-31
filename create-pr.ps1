#!/usr/bin/env pwsh
# Create Pull Request using GitHub API

$owner = "nguyenthaitan"
$repo = "Inventory-Management"
$base = "main"
$head = "develop/full-system-implementation"
$title = "feat: Phase 1 Critical Fixes - Kafka Event Bus, Operator Workflows, Error Handling"

# Read PR body from file
$bodyFile = "PHASE1_IMPLEMENTATION_SUMMARY.md"
if (-not (Test-Path $bodyFile)) {
    Write-Error "File not found: $bodyFile"
    exit 1
}

$body = Get-Content $bodyFile -Raw

# Try to get GitHub token from git credential manager
$apiUrl = "https://api.github.com"
$githubUrl = "https://github.com"

# Attempt to get credentials using git credential
$credentialInput = @{
    "protocol" = "https"
    "host" = "github.com"
} | ConvertTo-Json

# Use git credential to get stored credentials
$credentialOutput = $credentialInput | git credential approve 2>$null

# Try to get token from environment or use git's stored credentials
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "Attempting to use git's stored credentials..."
    # Alternative: try to use git credential with password
    $gitCred = git credential fill < ([System.IO.Path]::Combine($env:TEMP, "git-cred-input.txt"))
}

if (-not $token) {
    Write-Error "GitHub token not found. Set GITHUB_TOKEN environment variable."
    Write-Host "Alternative: Use https://github.com/$owner/$repo/pull/new/$head"
    exit 1
}

# Create PR via GitHub API
$prData = @{
    title = $title
    body = $body
    head = $head
    base = $base
} | ConvertTo-Json

Write-Host "Creating PR: $title"
Write-Host "Base: $base, Head: $head"

$response = Invoke-WebRequest `
    -Uri "$apiUrl/repos/$owner/$repo/pulls" `
    -Method POST `
    -Headers @{
        "Authorization" = "token $token"
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "PowerShell"
    } `
    -Body $prData `
    -ContentType "application/json" `
    -ErrorAction Stop

$result = $response.Content | ConvertFrom-Json
Write-Host "✅ PR created: $($result.html_url)"
Write-Host "PR #$($result.number) - $title"
exit 0
