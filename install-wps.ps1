param([int]$Port = 4174, [switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$addinDir = Join-Path $env:APPDATA 'kingsoft\wps\jsaddons'
$publishPath = Join-Path $addinDir 'publish.xml'
New-Item -ItemType Directory -Path $addinDir -Force | Out-Null
$config = New-Object System.Xml.XmlDocument
$config.PreserveWhitespace = $true
if (Test-Path -LiteralPath $publishPath) {
    $config.Load($publishPath)
    if ($config.DocumentElement.Name -ne 'jsplugins') { throw 'WPS 加载项配置格式不符，已停止安装。' }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    Copy-Item -LiteralPath $publishPath -Destination "$publishPath.geometry-lab.$stamp.bak"
} else {
    $config.LoadXml('<?xml version="1.0" encoding="UTF-8"?><jsplugins/>')
}
foreach ($entry in @($config.SelectNodes('/jsplugins/*[@name="GeometryLab"]'))) {
    [void]$entry.ParentNode.RemoveChild($entry)
}
if (-not $Uninstall) {
    $entry = $config.CreateElement('jspluginonline')
    $entry.SetAttribute('name', 'GeometryLab')
    $entry.SetAttribute('type', 'wpp')
    $entry.SetAttribute('url', "http://127.0.0.1:$Port/wps-addon/")
    $entry.SetAttribute('enable', 'enable_dev')
    $entry.SetAttribute('install', 'null')
    [void]$config.DocumentElement.AppendChild($entry)
}
$config.Save($publishPath)
if ($Uninstall) { Write-Host '已移除几何实验室加载项。其他加载项未改动。' }
else { Write-Host '已注册几何实验室。请先运行 start-wps.ps1，再重新打开 WPS 演示。' }
