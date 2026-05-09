#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
docker compose exec api npx prisma db seed
