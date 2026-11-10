$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$fixture = Join-Path $project ('.local\install-test-' + [guid]::NewGuid().ToString('N'))
$fixtureAddins = Join-Path $fixture 'kingsoft\wps\jsaddons'
New-Item -ItemType Directory -Path $fixtureAddins -Force | Out-Null
$configFile = Join-Path $fixtureAddins 'publish.xml'
[IO.File]::WriteAllText($configFile, '<jsplugins><jspluginonline name="ExistingPlugin" type="wpp" url="http://example.invalid/"/></jsplugins>')
$originalAppData = $env:APPDATA
try {
    # Only this test process receives the fixture path; the real WPS config is untouched.
    $env:APPDATA = $fixture
    & (Join-Path $project 'install-wps.ps1') -Port 4180
    & (Join-Path $project 'install-wps.ps1') -Port 4180
    [xml]$config = Get-Content -LiteralPath $configFile -Raw -Encoding UTF8
    if ($config.SelectNodes('/jsplugins/*[@name="GeometryLab"]').Count -ne 1) { throw 'Repeated install duplicated the add-in.' }
    if ($config.SelectSingleNode('/jsplugins/*[@name="GeometryLab"]').url -ne 'http://127.0.0.1:4180/wps-addon/') { throw 'Port not applied.' }
    if (-not $config.SelectSingleNode('/jsplugins/*[@name="ExistingPlugin"]')) { throw 'Existing add-in was removed.' }
    if (@(Get-ChildItem -LiteralPath $fixtureAddins -Filter '*.bak').Count -lt 1) { throw 'No configuration backup.' }
    & (Join-Path $project 'install-wps.ps1') -Uninstall
    [xml]$config = Get-Content -LiteralPath $configFile -Raw -Encoding UTF8
    if ($config.SelectNodes('/jsplugins/*[@name="GeometryLab"]').Count -ne 0) { throw 'Uninstall left registration behind.' }
    if (-not $config.SelectSingleNode('/jsplugins/*[@name="ExistingPlugin"]')) { throw 'Uninstall removed another add-in.' }
    Write-Host 'PASS: install, repeated install, port, backup, and uninstall preserve unrelated add-ins.'
} finally {
    $env:APPDATA = $originalAppData
}
