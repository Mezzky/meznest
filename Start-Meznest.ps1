$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeExe = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules/next/dist/bin/next'))) {
    $bundledNpm = Join-Path (Split-Path $nodeExe) 'node_modules/npm/bin/npm-cli.js'
    if (-not (Test-Path -LiteralPath $bundledNpm)) { throw 'Install dependencies with npm install first.' }
    & $nodeExe $bundledNpm install --cache (Join-Path $PSScriptRoot '.meznest/npm-cache')
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
& $nodeExe (Join-Path $PSScriptRoot 'node_modules/next/dist/bin/next') dev --hostname 127.0.0.1 --port 4317
