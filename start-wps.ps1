param([int]$Port = 4174)
$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$serviceUrl = "http://127.0.0.1:$Port"
try {
    $health = Invoke-RestMethod "$serviceUrl/health" -TimeoutSec 2
    if ($health.app -eq 'geometry-lab') { Write-Host "几何实验室已运行：$serviceUrl"; exit 0 }
    throw "端口 $Port 正被其他程序使用。"
} catch {
    if ($_.Exception.Message -like '*正被其他程序使用*') { throw }
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$serverPath = Join-Path $projectRoot 'server.mjs'
$serverProcess = Start-Process -FilePath $nodePath -ArgumentList @("`"$serverPath`"", '--port', "$Port") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'wps-server.log') -RedirectStandardError (Join-Path $logDir 'wps-server-error.log') -PassThru
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 250
    if ($serverProcess.HasExited) { throw "服务未能启动，请查看 .local/wps-server-error.log。" }
    try {
        $health = Invoke-RestMethod "$serviceUrl/health" -TimeoutSec 1
        if ($health.app -eq 'geometry-lab') {
            $serverProcess.Id | Set-Content -LiteralPath (Join-Path $logDir 'wps-server.pid')
            Write-Host "几何实验室已启动：$serviceUrl"
            exit 0
        }
    } catch {}
}
throw '等待几何实验室启动超时。'
