#!/usr/bin/env pwsh
# azd postdeploy: seed the app's default storage documents, once each. Two blobs
# in the `data` container:
#   1. config_admin_settings.json — default admin settings (source types, base
#      models, labeling settings). Port of setup_infra.sh:upload_admin_settings.
#   2. users_acl.json — the first admin user, so the deployer can actually sign in.
#      A fresh env has no users_acl.json; GetUserById then throws FileNotFoundError
#      (before the DEVELOPMENT_MODE auto-create can run) and the UI renders blank.
#
# The storage account is default-deny AND the deploying identity is not granted a
# Storage Blob Data role (only the function app's identity is), so uploads use the
# ACCOUNT KEY over a briefly-opened firewall — not `--auth-mode login`, which fails
# silently. Both uploads are skip-if-exists so live data is never clobbered.
#
# Inputs (azd environment): STORAGE_ACCOUNT_NAME, AZURE_RESOURCE_GROUP.

param(
    [string]$StorageAccount = $env:STORAGE_ACCOUNT_NAME,
    [string]$ResourceGroup = $env:AZURE_RESOURCE_GROUP,
    [string]$Container = 'data'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($StorageAccount)) {
    Write-Warning "seed-storage: STORAGE_ACCOUNT_NAME unset; run 'azd provision' first. Skipping."
    return
}

$key = az storage account keys list -n $StorageAccount -g $ResourceGroup --query '[0].value' -o tsv 2>$null
if ([string]::IsNullOrWhiteSpace($key)) {
    Write-Warning "seed-storage: could not read a storage account key (shared-key disabled?). Skipping."
    return
}

# Upload $LocalFile to $BlobName if the blob doesn't already exist.
function Seed-Blob([string]$BlobName, [string]$LocalFile) {
    $exists = az storage blob exists --account-name $StorageAccount --account-key $key `
        --container-name $Container --name $BlobName --query exists -o tsv 2>$null
    if ($exists -eq 'true') {
        Write-Host "seed-storage: '$BlobName' already present — skip."
        return
    }
    az storage blob upload --account-name $StorageAccount --account-key $key `
        --container-name $Container --name $BlobName --file $LocalFile --overwrite -o none
    if ($LASTEXITCODE -eq 0) { Write-Host "seed-storage: uploaded '$BlobName'." }
    else { Write-Warning "seed-storage: failed to upload '$BlobName'." }
}

# Build the first-admin user record from the signed-in deployer (skipped for
# non-interactive / service-principal deploys, which have no user identity).
$adminFile = $null
$email = az ad signed-in-user show --query mail -o tsv 2>$null
if (-not [string]::IsNullOrWhiteSpace($email)) {
    $adminUser = @(
        [ordered]@{
            userId           = $email
            name             = $email
            email            = $email
            userRoles        = @('authenticated', 'administrators')
            identityProvider = 'aad'
            settings         = @{}
            status           = 'Active'
            added_by         = 'bootstrap'
            deleted          = $false
        }
    )
    $adminFile = New-TemporaryFile
    [System.IO.File]::WriteAllText($adminFile.FullName, ($adminUser | ConvertTo-Json -Depth 6 -AsArray))
} else {
    Write-Warning "seed-storage: no signed-in user email; skipping first-admin seed (users_acl.json)."
}

$originalAction = az storage account show --name $StorageAccount --resource-group $ResourceGroup `
    --query 'networkRuleSet.defaultAction' -o tsv 2>$null
$opened = $false
try {
    if ($originalAction -ne 'Allow') {
        Write-Host "seed-storage: temporarily opening $StorageAccount firewall..."
        az storage account update --name $StorageAccount --resource-group $ResourceGroup `
            --default-action Allow -o none
        $opened = $true
        Start-Sleep -Seconds 45   # network-rule propagation
    }

    Seed-Blob 'config_admin_settings.json' (Join-Path $repoRoot 'setup' 'config_admin_settings.json')
    if ($adminFile) { Seed-Blob 'users_acl.json' $adminFile.FullName }
}
finally {
    if ($adminFile) { Remove-Item $adminFile.FullName -ErrorAction SilentlyContinue }
    if ($opened) {
        Write-Host "seed-storage: restoring $StorageAccount firewall to '$originalAction'..."
        az storage account update --name $StorageAccount --resource-group $ResourceGroup `
            --default-action $originalAction -o none
    }
}
