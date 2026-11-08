$ErrorActionPreference = 'Stop'
try { $null = Invoke-WebRequest -Uri 'http://127.0.0.1:8765/' -UseBasicParsing -TimeoutSec 3 }
catch { throw 'Start Holocron with start.cmd first, then leave it running.' }
$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $tailscale) {
  $path = Join-Path ${env:ProgramFiles} 'Tailscale\tailscale.exe'
  if (-not (Test-Path -LiteralPath $path)) { throw 'Install Tailscale and sign in on this PC, then run this script again.' }
  $tailscale = @{ Source = $path }
}
& $tailscale.Source serve --bg --https=443 8765
if ($LASTEXITCODE -ne 0) { throw 'Tailscale Serve could not start. Check its message above.' }
& $tailscale.Source serve status
Write-Host 'Open the HTTPS .ts.net address on your devices, then pair with the key printed by start.cmd.'
