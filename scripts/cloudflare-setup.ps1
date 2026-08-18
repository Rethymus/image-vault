[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$BucketName = "private-image-vault",
  [string]$PublicImageOrigin = "https://YOUR_BUCKET_ID.r2.dev",
  [string]$ZoneId
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$wrangler = Join-Path $projectRoot "node_modules\.bin\wrangler.cmd"

if (-not (Test-Path -LiteralPath $wrangler)) {
  throw "Wrangler is not installed. Run npm install from the project root first."
}

function Invoke-Wrangler {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = @(& $wrangler @Arguments 2>&1 | ForEach-Object { $_.ToString() })
  [PSCustomObject]@{
    ExitCode = $LASTEXITCODE
    Output = ($output -join [Environment]::NewLine)
  }
}

function Stop-WithHint {
  param([string]$Message, [int]$Code = 1)
  Write-Host ""
  Write-Host $Message -ForegroundColor Yellow
  exit $Code
}

Write-Host "Vault Cloudflare setup" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "Bucket:  $BucketName"
Write-Host "Public:  $PublicImageOrigin"
Write-Host "Mode:    $(if ($Apply) { 'APPLY' } else { 'CHECK ONLY' })"
Write-Host ""

$whoami = Invoke-Wrangler @("whoami")
if ($whoami.Output -match "not authenticated|CLOUDFLARE_API_TOKEN|wrangler login") {
  Stop-WithHint "Wrangler is not authenticated. Run npx wrangler login, then rerun this script." 1
}
if ($whoami.ExitCode -ne 0) {
  throw "Wrangler authentication check failed. This may be a temporary network/API issue.`n$($whoami.Output)"
}

$bucketList = Invoke-Wrangler @("r2", "bucket", "list")
if ($bucketList.ExitCode -ne 0) {
  if ($bucketList.Output -match "10042|enable R2 through the Cloudflare Dashboard") {
    Stop-WithHint "R2 is not enabled for this Cloudflare account. Enable R2 in the dashboard, then rerun this script." 2
  }
  throw $bucketList.Output
}

$bucketExists = $bucketList.Output -match "(?m)^\s*$([regex]::Escape($BucketName))\s*$"
if ($bucketExists) {
  Write-Host "[ok] R2 bucket already exists: $BucketName" -ForegroundColor Green
} elseif (-not $Apply) {
  Write-Host "[plan] Would create R2 bucket: $BucketName" -ForegroundColor Yellow
} else {
  $create = Invoke-Wrangler @("r2", "bucket", "create", $BucketName)
  if ($create.ExitCode -ne 0) { throw $create.Output }
  Write-Host "[done] Created R2 bucket: $BucketName" -ForegroundColor Green
}

$origin = [Uri]$PublicImageOrigin
$domain = $origin.Host
if ([string]::IsNullOrWhiteSpace($domain)) {
  throw "PublicImageOrigin must be a valid URL, for example https://img.example.com."
}

$usesR2Dev = $domain -like "*.r2.dev"
if ($usesR2Dev) {
  if ($Apply) {
    $devUrl = Invoke-Wrangler @("r2", "bucket", "dev-url", "enable", $BucketName)
    if ($devUrl.ExitCode -eq 0) {
      Write-Host "[done] Enabled the R2 dev URL for the no-domain setup." -ForegroundColor Green
    } elseif ($devUrl.Output -match "already enabled|already allowed|Public access enabled") {
      Write-Host "[ok] R2 dev URL is already enabled." -ForegroundColor Green
    } else {
      throw $devUrl.Output
    }
  } else {
    Write-Host "[plan] Would keep the R2 dev URL enabled for the no-domain setup." -ForegroundColor Yellow
  }
  Write-Host "[ok] Using Cloudflare-managed R2 public URL: $PublicImageOrigin" -ForegroundColor Green
} else {
  if ($Apply) {
    $devUrl = Invoke-Wrangler @("r2", "bucket", "dev-url", "disable", $BucketName, "--force")
    if ($devUrl.ExitCode -eq 0) {
      Write-Host "[done] Disabled the R2 dev URL." -ForegroundColor Green
    } elseif ($devUrl.Output -match "already disabled|not enabled|not found") {
      Write-Host "[ok] R2 dev URL is already disabled or unavailable." -ForegroundColor Green
    } else {
      throw $devUrl.Output
    }
  } else {
    Write-Host "[plan] Would disable the R2 dev URL." -ForegroundColor Yellow
  }

  if ([string]::IsNullOrWhiteSpace($ZoneId)) {
    Write-Host "[next] R2 custom domain not connected yet: provide the Cloudflare zone ID for $domain with -ZoneId." -ForegroundColor Yellow
  } else {
    $domains = Invoke-Wrangler @("r2", "bucket", "domain", "list", $BucketName)
    if ($domains.ExitCode -ne 0 -and -not ($domains.Output -match "not found|does not exist")) {
      throw $domains.Output
    }

    if ($domains.Output -match [regex]::Escape($domain)) {
      Write-Host "[ok] R2 custom domain is already connected: $domain" -ForegroundColor Green
    } elseif (-not $Apply) {
      Write-Host "[plan] Would connect R2 custom domain: $domain" -ForegroundColor Yellow
    } else {
      $attach = Invoke-Wrangler @("r2", "bucket", "domain", "add", $BucketName, "--domain", $domain, "--zone-id", $ZoneId, "--force")
      if ($attach.ExitCode -ne 0) { throw $attach.Output }
      Write-Host "[done] Connected R2 custom domain: $domain" -ForegroundColor Green
    }
  }
}

Write-Host ""
Write-Host "R2 setup check finished." -ForegroundColor Cyan
if (-not $Apply) {
  Write-Host "Run again with -Apply after R2 is enabled and your domain/zone ID are ready." -ForegroundColor Yellow
}
