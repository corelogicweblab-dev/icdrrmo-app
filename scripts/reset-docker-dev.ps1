#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Stops the stack and removes named volumes (Postgres + Redis). Dev/local only.

.DESCRIPTION
  Use after a failed Prisma migration (P3009) or when you want a clean database.
  Does NOT remove images.
#>
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host "Stopping stack and removing volumes (pgdata, redisdata)..." -ForegroundColor Yellow
docker compose down -v
Write-Host "Starting fresh stack..." -ForegroundColor Green
docker compose up --build
