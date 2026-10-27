[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Net.Http

$BaseUrl = "http://localhost:5000"
$ResumePath = Join-Path $PSScriptRoot "..\..\Extra Assests\Resume.pdf"
$TargetRoleId = "data-analyst"
$MaxFileSizeBytes = 5MB
$RequestTimeoutSeconds = 90

$RoleNames = [ordered]@{
  "data-analyst" = "Data Analyst"
  "java-developer" = "Java Developer"
  "web-full-stack-developer" = "Web / Full Stack Developer"
  "ai-automation-developer" = "AI Automation Developer"
  "prompt-engineer" = "Prompt Engineer"
}

$DataAnalystSkillLabels = @(
  "SQL",
  "Python or R",
  "Excel or spreadsheets",
  "Power BI or Tableau",
  "Statistics",
  "Pandas or NumPy",
  "Data cleaning or ETL",
  "Databases or data modelling"
)

function Test-ObjectProperty {
  param(
    [Parameter(Mandatory = $true)]
    [object]$InputObject,

    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  return $null -ne $InputObject.PSObject.Properties[$Name]
}

function ConvertFrom-SafeApiResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.Http.HttpResponseMessage]$Response,

    [Parameter(Mandatory = $true)]
    [string]$Step
  )

  $responseText = $null

  try {
    $statusCode = [int]$Response.StatusCode

    if (-not $Response.IsSuccessStatusCode) {
      throw [System.InvalidOperationException]::new(
        "$Step failed with HTTP $statusCode ($($Response.ReasonPhrase))."
      )
    }

    try {
      $responseText = $Response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "$Step response could not be read."
      )
    }

    try {
      $parsed = $responseText | ConvertFrom-Json
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "$Step returned an unreadable JSON response."
      )
    }

    if (-not (Test-ObjectProperty -InputObject $parsed -Name "success")) {
      throw [System.InvalidOperationException]::new(
        "$Step returned an incomplete response."
      )
    }

    if ($parsed.success -ne $true) {
      throw [System.InvalidOperationException]::new(
        "$Step did not complete successfully."
      )
    }

    return $parsed
  }
  finally {
    $responseText = $null
  }
}

function Invoke-SafeGet {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.Http.HttpClient]$Client,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [string]$Step
  )

  $response = $null

  try {
    try {
      $response = $Client.GetAsync($Uri).GetAwaiter().GetResult()
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "$Step could not reach the local backend. Confirm that it is running on port 5000."
      )
    }

    return ConvertFrom-SafeApiResponse -Response $response -Step $Step
  }
  finally {
    if ($null -ne $response) {
      $response.Dispose()
    }
  }
}

function Invoke-SafeJsonPost {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.Http.HttpClient]$Client,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [hashtable]$Body,

    [Parameter(Mandatory = $true)]
    [string]$Step
  )

  $json = $null
  $content = $null
  $response = $null

  try {
    try {
      $json = $Body | ConvertTo-Json -Depth 30 -Compress
      $content = [System.Net.Http.StringContent]::new(
        $json,
        [System.Text.Encoding]::UTF8,
        "application/json"
      )
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "$Step request could not be prepared."
      )
    }

    try {
      $response = $Client.PostAsync($Uri, $content).GetAwaiter().GetResult()
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "$Step could not reach the local backend."
      )
    }

    return ConvertFrom-SafeApiResponse -Response $response -Step $Step
  }
  finally {
    $json = $null

    if ($null -ne $response) {
      $response.Dispose()
    }

    if ($null -ne $content) {
      $content.Dispose()
    }
  }
}

function Invoke-SafePdfUpload {
  param(
    [Parameter(Mandatory = $true)]
    [System.Net.Http.HttpClient]$Client,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $fileStream = $null
  $fileContent = $null
  $multipartContent = $null
  $response = $null

  try {
    try {
      $fileStream = [System.IO.File]::Open(
        $Path,
        [System.IO.FileMode]::Open,
        [System.IO.FileAccess]::Read,
        [System.IO.FileShare]::Read
      )
      $fileContent = [System.Net.Http.StreamContent]::new($fileStream)
      $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new(
        "application/pdf"
      )
      $multipartContent = [System.Net.Http.MultipartFormDataContent]::new()
      $multipartContent.Add(
        $fileContent,
        "resume",
        [System.IO.Path]::GetFileName($Path)
      )
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "PDF upload could not prepare the local resume file."
      )
    }

    try {
      $response = $Client.PostAsync($Uri, $multipartContent).GetAwaiter().GetResult()
    }
    catch {
      throw [System.InvalidOperationException]::new(
        "PDF upload could not reach the local backend."
      )
    }

    return ConvertFrom-SafeApiResponse -Response $response -Step "PDF upload"
  }
  finally {
    if ($null -ne $response) {
      $response.Dispose()
    }

    if ($null -ne $multipartContent) {
      $multipartContent.Dispose()
    }
    elseif ($null -ne $fileContent) {
      $fileContent.Dispose()
    }
    elseif ($null -ne $fileStream) {
      $fileStream.Dispose()
    }
  }
}

function Get-ValidatedScore {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Value,

    [Parameter(Mandatory = $true)]
    [string]$Step
  )

  $parsedScore = 0
  if (
    -not [int]::TryParse([string]$Value, [ref]$parsedScore) -or
    $parsedScore -lt 0 -or
    $parsedScore -gt 100
  ) {
    throw [System.InvalidOperationException]::new(
      "$Step returned an invalid score."
    )
  }

  return $parsedScore
}

$client = $null
$healthResponse = $null
$uploadResponse = $null
$analysisResponse = $null
$careerResponse = $null
$analysisRequest = $null
$careerRequest = $null

try {
  if (-not (Test-Path -LiteralPath $ResumePath -PathType Leaf)) {
    throw [System.InvalidOperationException]::new(
      "The configured resume PDF was not found."
    )
  }

  $resumeFile = Get-Item -LiteralPath $ResumePath
  if ($resumeFile.Extension -ne ".pdf") {
    throw [System.InvalidOperationException]::new(
      "The configured resume file is not a PDF."
    )
  }

  if ($resumeFile.Length -gt $MaxFileSizeBytes) {
    throw [System.InvalidOperationException]::new(
      "The configured resume PDF exceeds the 5 MB upload limit."
    )
  }

  $client = [System.Net.Http.HttpClient]::new()
  $client.Timeout = [System.TimeSpan]::FromSeconds($RequestTimeoutSeconds)

  $healthResponse = Invoke-SafeGet `
    -Client $client `
    -Uri "$BaseUrl/api/health" `
    -Step "Backend health check"
  Write-Host "[OK] Backend health check"

  $uploadResponse = Invoke-SafePdfUpload `
    -Client $client `
    -Uri "$BaseUrl/api/resumes/upload" `
    -Path $ResumePath

  if (
    -not (Test-ObjectProperty -InputObject $uploadResponse -Name "text") -or
    -not (Test-ObjectProperty -InputObject $uploadResponse -Name "metadata") -or
    -not (Test-ObjectProperty -InputObject $uploadResponse.metadata -Name "pageCount") -or
    $uploadResponse.text -isnot [string] -or
    [string]::IsNullOrWhiteSpace($uploadResponse.text)
  ) {
    throw [System.InvalidOperationException]::new(
      "PDF upload returned incomplete extraction data."
    )
  }

  $extractionLength = $uploadResponse.text.Length
  $pageCount = $uploadResponse.metadata.pageCount
  Write-Host "[OK] Upload success"
  Write-Host "     Extracted characters: $extractionLength"
  Write-Host "     Page count: $pageCount"

  $analysisRequest = @{ text = $uploadResponse.text }
  try {
    $analysisResponse = Invoke-SafeJsonPost `
      -Client $client `
      -Uri "$BaseUrl/api/resumes/analyze" `
      -Body $analysisRequest `
      -Step "Resume analysis"
  }
  finally {
    $analysisRequest.text = $null
    $analysisRequest = $null
    $uploadResponse.text = $null
  }

  if (
    -not (Test-ObjectProperty -InputObject $analysisResponse -Name "analysis") -or
    -not (Test-ObjectProperty -InputObject $analysisResponse -Name "metadata") -or
    -not (Test-ObjectProperty -InputObject $analysisResponse.metadata -Name "provider") -or
    -not (Test-ObjectProperty -InputObject $analysisResponse.metadata -Name "model") -or
    $null -eq $analysisResponse.analysis
  ) {
    throw [System.InvalidOperationException]::new(
      "Resume analysis returned incomplete structured data."
    )
  }

  $provider = [string]$analysisResponse.metadata.provider
  $model = [string]$analysisResponse.metadata.model
  if (
    [string]::IsNullOrWhiteSpace($provider) -or
    [string]::IsNullOrWhiteSpace($model) -or
    $provider.Contains("`n") -or
    $model.Contains("`n") -or
    $provider.Length -gt 100 -or
    $model.Length -gt 100
  ) {
    throw [System.InvalidOperationException]::new(
      "Resume analysis returned invalid provider metadata."
    )
  }

  Write-Host "[OK] Analysis success"
  Write-Host "     Provider: $provider"
  Write-Host "     Model: $model"

  $careerRequest = @{
    analysis = $analysisResponse.analysis
    targetRoleId = $TargetRoleId
  }
  try {
    $careerResponse = Invoke-SafeJsonPost `
      -Client $client `
      -Uri "$BaseUrl/api/careers/match" `
      -Body $careerRequest `
      -Step "Career matching"
  }
  finally {
    $careerRequest.analysis = $null
    $careerRequest = $null
    $analysisResponse.analysis = $null
  }

  if (
    -not (Test-ObjectProperty -InputObject $careerResponse -Name "roleMatches") -or
    -not (Test-ObjectProperty -InputObject $careerResponse -Name "strongestMatches") -or
    -not (Test-ObjectProperty -InputObject $careerResponse -Name "targetRoleGap")
  ) {
    throw [System.InvalidOperationException]::new(
      "Career matching returned incomplete result data."
    )
  }

  $roleMatches = @($careerResponse.roleMatches)
  $receivedRoleIds = @($roleMatches | ForEach-Object { [string]$_.roleId })
  $uniqueRoleIds = @($receivedRoleIds | Sort-Object -Unique)
  $missingRoleIds = @($RoleNames.Keys | Where-Object { $receivedRoleIds -notcontains $_ })
  $unexpectedRoleIds = @($receivedRoleIds | Where-Object { -not $RoleNames.Contains($_) })

  if (
    $roleMatches.Count -ne 5 -or
    $uniqueRoleIds.Count -ne 5 -or
    $missingRoleIds.Count -gt 0 -or
    $unexpectedRoleIds.Count -gt 0
  ) {
    throw [System.InvalidOperationException]::new(
      "Career matching did not return all five configured roles."
    )
  }

  Write-Host "[OK] Career matching success"
  Write-Host "Role scores:"
  foreach ($roleMatch in $roleMatches) {
    $roleId = [string]$roleMatch.roleId
    $score = Get-ValidatedScore -Value $roleMatch.score -Step "Career matching"
    Write-Host ("  {0}: {1}/100" -f $RoleNames[$roleId], $score)
  }

  $strongestMatches = @($careerResponse.strongestMatches)
  if ($strongestMatches.Count -eq 0 -or $strongestMatches.Count -gt 3) {
    throw [System.InvalidOperationException]::new(
      "Career matching returned invalid strongest-match data."
    )
  }

  Write-Host "Strongest matches:"
  foreach ($strongestMatch in $strongestMatches) {
    $roleId = [string]$strongestMatch.roleId
    if (-not $RoleNames.Contains($roleId)) {
      throw [System.InvalidOperationException]::new(
        "Career matching returned an unknown strongest-match role."
      )
    }
    $score = Get-ValidatedScore `
      -Value $strongestMatch.score `
      -Step "Career matching"
    Write-Host ("  {0}: {1}/100" -f $RoleNames[$roleId], $score)
  }

  if ([string]$careerResponse.targetRoleGap.roleId -ne $TargetRoleId) {
    throw [System.InvalidOperationException]::new(
      "Career matching returned the wrong target role."
    )
  }

  $targetScore = Get-ValidatedScore `
    -Value $careerResponse.targetRoleGap.score `
    -Step "Target-role gap analysis"
  Write-Host "Target role: Data Analyst ($targetScore/100)"
  Write-Host "Target-role skill gaps:"

  $priorityGaps = @($careerResponse.targetRoleGap.priorityGaps)
  if ($priorityGaps.Count -eq 0) {
    Write-Host "  No configured skill gaps were reported."
  }
  else {
    foreach ($gap in $priorityGaps) {
      $skill = [string]$gap.skill
      if ($DataAnalystSkillLabels -notcontains $skill) {
        throw [System.InvalidOperationException]::new(
          "Target-role gap analysis returned an unknown skill label."
        )
      }
      $pointsAvailable = Get-ValidatedScore `
        -Value $gap.pointsAvailable `
        -Step "Target-role gap analysis"
      Write-Host (
        "  {0}: not found in this resume (up to {1} points)" -f `
          $skill,
          $pointsAvailable
      )
    }
  }

  Write-Host "[OK] Resume pipeline completed"
}
catch {
  Write-Error ("Pipeline failed: {0}" -f $_.Exception.Message)
  exit 1
}
finally {
  if ($null -ne $uploadResponse -and (Test-ObjectProperty -InputObject $uploadResponse -Name "text")) {
    $uploadResponse.text = $null
  }

  if ($null -ne $analysisResponse -and (Test-ObjectProperty -InputObject $analysisResponse -Name "analysis")) {
    $analysisResponse.analysis = $null
  }

  $analysisRequest = $null
  $careerRequest = $null
  $healthResponse = $null
  $uploadResponse = $null
  $analysisResponse = $null
  $careerResponse = $null

  if ($null -ne $client) {
    $client.Dispose()
  }
}
