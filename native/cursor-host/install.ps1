# Explicit, per-user Chrome/Edge registration. No admin privileges or auto-start.
[CmdletBinding(SupportsShouldProcess=$true)]
param(
  [Parameter(Mandatory=$true)][ValidateSet('Chrome','Edge')][string]$Browser,
  [ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
  [string]$ExePath,
  [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
$hostName = 'com.rawpowered.mangoshot_cursor'
$vendor = if ($Browser -eq 'Chrome') { 'Google\Chrome' } else { 'Microsoft\Edge' }
$key = "HKCU:\Software\$vendor\NativeMessagingHosts\$hostName"
$dir = Join-Path $env:LOCALAPPDATA 'MangoShot\NativeCursor'
$manifestPath = Join-Path $dir ("host-" + $Browser.ToLowerInvariant() + ".json")
$existing = if (Test-Path -LiteralPath $key) { (Get-Item -LiteralPath $key).GetValue('') } else { $null }
if ($existing -and $existing -ne $manifestPath) {
  throw 'A different native host registration already exists. Refusing to overwrite or remove it.'
}
if ($Uninstall) {
  if ($PSCmdlet.ShouldProcess($key,'Remove MangoShot native messaging registration')) {
    if (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key -Force }
    if (Test-Path -LiteralPath $manifestPath) { Remove-Item -LiteralPath $manifestPath -Force }
  }
  return
}
if (-not $ExtensionId -or -not $ExePath) { throw 'Provide -ExtensionId and -ExePath for your own compiled native host.' }
$exe = Get-Item -LiteralPath $ExePath
if ($exe.PSIsContainer -or $exe.Name -ne 'mangoshot-cursor-host.exe') { throw 'Choose the compiled mangoshot-cursor-host.exe file.' }
$manifest = [ordered]@{
  name = $hostName
  description = 'MangoShot authorized monitor cursor telemetry'
  path = $exe.FullName
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
if ($PSCmdlet.ShouldProcess($key,"Register local MangoShot native host for $ExtensionId")) {
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
  New-Item -Path $key -Force | Out-Null
  Set-Item -LiteralPath $key -Value $manifestPath
  Write-Host "Registered $Browser host for $ExtensionId. Restart browser if necessary."
  Write-Host 'No recording or background process has been started.'
}
