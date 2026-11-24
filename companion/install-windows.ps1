# MangoShot native messaging registration: per-user, explicit browser IDs.
[CmdletBinding()]
param(
    [ValidatePattern('^[a-p]{32}$')][string]$ChromeId,
    [ValidatePattern('^[a-p]{32}$')][string]$EdgeId,
    [switch]$Firefox,
    [switch]$Uninstall,
    [string]$HostExe = (Join-Path $PSScriptRoot 'MangoShotBridge.exe')
)
$ErrorActionPreference = 'Stop'
$hostName = 'com.rawpowered.mangoshot.bridge'
$dir = Join-Path $env:LOCALAPPDATA 'MangoShot\Bridge'
$installedExe = Join-Path $dir 'MangoShotBridge.exe'
$targets = @()
if ($ChromeId) { $targets += @{ Name='chrome'; Key="HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"; Origin="chrome-extension://$ChromeId/" } }
if ($EdgeId) { $targets += @{ Name='edge'; Key="HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName"; Origin="chrome-extension://$EdgeId/" } }
if ($Firefox) { $targets += @{ Name='firefox'; Key="HKCU:\Software\Mozilla\NativeMessagingHosts\$hostName"; Extension='mangoshot@rawpowered.dev' } }
if ($Uninstall -and $targets.Count -eq 0) {
    $targets = @(
        @{Name='chrome'; Key="HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"},
        @{Name='edge'; Key="HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$hostName"},
        @{Name='firefox'; Key="HKCU:\Software\Mozilla\NativeMessagingHosts\$hostName"}
    )
}
if ($targets.Count -eq 0) { throw 'Supply -ChromeId, -EdgeId or -Firefox. Copy IDs from the browser extension manager.' }
foreach ($t in $targets) {
    $manifestPath = Join-Path $dir ($t.Name + '.json')
    if (Test-Path -LiteralPath $t.Key) {
        $existing = (Get-Item -LiteralPath $t.Key).GetValue('')
        if ($existing -ne $manifestPath) { throw "Existing registration points elsewhere: $($t.Name). Not overwritten." }
    }
}
if ($Uninstall) {
    foreach ($t in $targets) {
        if (Test-Path -LiteralPath $t.Key) { Remove-Item -LiteralPath $t.Key }
        $manifestPath = Join-Path $dir ($t.Name + '.json')
        if (Test-Path -LiteralPath $manifestPath) { Remove-Item -LiteralPath $manifestPath }
    }
    Write-Host 'Selected per-user registrations removed. Disconnect all editor sessions first; installed executable retained for other browsers.'
    exit
}
if (!(Test-Path -LiteralPath $HostExe -PathType Leaf)) { throw 'MangoShotBridge.exe not found. Extract the companion preview or build from its source.' }
New-Item -ItemType Directory -Path $dir -Force | Out-Null
if ([IO.Path]::GetFullPath($HostExe) -ne [IO.Path]::GetFullPath($installedExe)) {
    Copy-Item -LiteralPath $HostExe -Destination $installedExe -Force
}
foreach ($t in $targets) {
    $manifestPath = Join-Path $dir ($t.Name + '.json')
    $manifest = @{ name=$hostName; description='MangoShot Intelligence Bridge'; path=$installedExe; type='stdio' }
    if ($t.Name -eq 'firefox') { $manifest.allowed_extensions = @($t.Extension) } else { $manifest.allowed_origins = @($t.Origin) }
    [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
    New-Item -Path $t.Key -Force | Out-Null
    Set-Item -LiteralPath $t.Key -Value $manifestPath
    Write-Host "Registered $($t.Name) for the current user."
}
Write-Host "Companion: $installedExe"
Write-Host 'Open Clip Studio > Automation > Intelligence Bridge, choose scopes, then pair.'
