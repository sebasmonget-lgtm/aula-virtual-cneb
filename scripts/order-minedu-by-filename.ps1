param(
  [Parameter(Mandatory = $true)][string]$SourceRoot,
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath $SourceRoot).Path
$destination = Join-Path $source 'Fichas_MINEDU_Ordenadas'
$categories = @{
  'Crea_4_anos_desarmado' = 'Crea_4_anos'
  'Crea_5_anos_desarmado' = 'Crea_5_anos'
  'Juega_4_anos_desarmado' = 'Juega_4_anos'
  'Juega_5_anos_desarmado' = 'Juega_5_anos'
}

function Normalize-FichaName([string]$fileName) {
  $stem = [IO.Path]::GetFileNameWithoutExtension($fileName).ToLowerInvariant().Normalize([Text.NormalizationForm]::FormD)
  $stem = [regex]::Replace($stem, '\p{M}', '')
  $stem = [regex]::Replace($stem, '[^\p{L}\p{Nd}]+', '_').Trim('_')
  $tokens = @($stem -split '_' | Where-Object { $_ -ne '' })
  while ($tokens.Count -gt 0 -and ($tokens[0] -eq 'ficha' -or $tokens[0] -match '^\d+$')) {
    $tokens = @($tokens | Select-Object -Skip 1)
  }
  $tokens = @($tokens | Where-Object { $_ -notin @('pdf', 'json', 'ficha') })
  return ($tokens -join '_')
}

function Relative-SourcePath([string]$path) {
  return [IO.Path]::GetRelativePath($source, $path).Replace('\', '/')
}

function Clear-Containment([string]$a, [string]$b) {
  if (!$a -or !$b) { return $false }
  return ("_${a}_".Contains("_${b}_")) -or ("_${b}_".Contains("_${a}_"))
}

function Copy-Checked($item, [string]$target) {
  if (Test-Path -LiteralPath $target) { throw "El destino ya existe: $target" }
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath $item.FullName -Destination $target -ErrorAction Stop
  $copied = Get-Item -LiteralPath $target
  if ($copied.Length -ne $item.Length) { throw "Tamaño distinto después de copiar: $target" }
}

$pdfs = @()
foreach ($folder in $categories.Keys) {
  $folderPath = Join-Path $source $folder
  if (!(Test-Path -LiteralPath $folderPath -PathType Container)) { throw "Falta carpeta: $folderPath" }
  $pdfs += @(Get-ChildItem -LiteralPath $folderPath -File -Recurse -Filter '*.pdf' | ForEach-Object {
    [pscustomobject]@{
      File = $_
      Category = $categories[$folder]
      Key = Normalize-FichaName $_.Name
    }
  })
}
$jsonPath = Join-Path $source 'fichas_minedu_json'
if (!(Test-Path -LiteralPath $jsonPath -PathType Container)) { throw "Falta carpeta: $jsonPath" }
$jsons = @(Get-ChildItem -LiteralPath $jsonPath -File -Recurse -Filter '*.json' | ForEach-Object {
  [pscustomobject]@{ File = $_; Key = Normalize-FichaName $_.Name }
})

$pdfs = @($pdfs | Sort-Object { $_.File.FullName })
$jsons = @($jsons | Sort-Object { $_.File.FullName })
foreach ($pdf in $pdfs) {
  if (!$pdf.Key) { throw "Nombre PDF vacío al normalizar: $($pdf.File.FullName)" }
  $exact = @($jsons | Where-Object { $_.Key -eq $pdf.Key })
  $pdf | Add-Member -NotePropertyName Candidates -NotePropertyValue @(
    if ($exact.Count -gt 0) { $exact }
    else { $jsons | Where-Object { Clear-Containment $pdf.Key $_.Key } }
  )
}

$pairs = @()
$ambiguous = @()
foreach ($pdf in $pdfs) {
  $candidatePaths = @($pdf.Candidates | ForEach-Object { $_.File.FullName })
  $claimants = @()
  if ($pdf.Candidates.Count -eq 1) {
    $json = $pdf.Candidates[0]
    $claimants = @($pdfs | Where-Object {
      @($_.Candidates | Where-Object { $_.File.FullName -eq $json.File.FullName }).Count -gt 0
    })
  }
  if ($pdf.Candidates.Count -eq 1 -and $claimants.Count -eq 1) {
    $pairs += [pscustomobject]@{ Pdf = $pdf; Json = $pdf.Candidates[0] }
  } elseif ($pdf.Candidates.Count -gt 1 -or $claimants.Count -gt 1) {
    $ambiguous += [ordered]@{
      pdf = Relative-SourcePath $pdf.File.FullName
      json_posibles = @($candidatePaths | ForEach-Object { Relative-SourcePath $_ })
      pdf_que_reclaman_json = @($claimants | ForEach-Object { Relative-SourcePath $_.File.FullName })
    }
  }
}

$pairPdfs = @($pairs | ForEach-Object { $_.Pdf.File.FullName })
$pairJsons = @($pairs | ForEach-Object { $_.Json.File.FullName })
$unpairedPdfs = @($pdfs | Where-Object { $_.File.FullName -notin $pairPdfs })
$unpairedJsons = @($jsons | Where-Object { $_.File.FullName -notin $pairJsons })
$targetFolders = @($pairs | ForEach-Object { Join-Path (Join-Path $destination $_.Pdf.Category) $_.Pdf.Key })
$collisions = @($targetFolders | Group-Object | Where-Object { $_.Count -gt 1 })
if ($collisions.Count -gt 0) { throw "Dos pares comparten carpeta destino: $($collisions.Name -join ', ')" }

$report = [ordered]@{
  pdf_encontrados = $pdfs.Count
  json_encontrados = $jsons.Count
  pares_creados = $pairs.Count
  pdf_sin_json = @($unpairedPdfs | ForEach-Object { Relative-SourcePath $_.File.FullName })
  json_sin_pdf = @($unpairedJsons | ForEach-Object { Relative-SourcePath $_.File.FullName })
  coincidencias_ambiguas = @($ambiguous)
}

if (!$Execute) {
  $report | ConvertTo-Json -Depth 8
  return
}

if (Test-Path -LiteralPath $destination) { throw "La carpeta destino ya existe: $destination" }
$sourceSnapshot = @($pdfs | ForEach-Object { [pscustomobject]@{ Path = $_.File.FullName; Length = $_.File.Length } }) +
  @($jsons | ForEach-Object { [pscustomobject]@{ Path = $_.File.FullName; Length = $_.File.Length } })
foreach ($folder in @('Crea_4_anos', 'Crea_5_anos', 'Juega_4_anos', 'Juega_5_anos', '_sin_coincidencia')) {
  New-Item -ItemType Directory -Path (Join-Path $destination $folder) -Force | Out-Null
}
foreach ($pair in $pairs) {
  $folder = Join-Path (Join-Path $destination $pair.Pdf.Category) $pair.Pdf.Key
  Copy-Checked $pair.Pdf.File (Join-Path $folder 'ficha.pdf')
  Copy-Checked $pair.Json.File (Join-Path $folder 'ficha.json')
}
foreach ($pdf in $unpairedPdfs) {
  $folder = Join-Path (Join-Path (Join-Path $destination '_sin_coincidencia') 'pdf') $pdf.Category
  Copy-Checked $pdf.File (Join-Path $folder $pdf.File.Name)
}
foreach ($json in $unpairedJsons) {
  $jsonGroup = $json.File.Directory.Name
  $folder = Join-Path (Join-Path (Join-Path $destination '_sin_coincidencia') 'json') $jsonGroup
  Copy-Checked $json.File (Join-Path $folder $json.File.Name)
}
$reportFile = Join-Path $destination '_reporte_ordenamiento.json'
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportFile -Encoding UTF8

foreach ($entry in $sourceSnapshot) {
  $original = Get-Item -LiteralPath $entry.Path -ErrorAction Stop
  if ($original.Length -ne $entry.Length) { throw "Original alterado: $($entry.Path)" }
}
if (@(Get-ChildItem -LiteralPath $destination -File -Recurse -Filter 'ficha.pdf').Count -ne $pairs.Count -or
    @(Get-ChildItem -LiteralPath $destination -File -Recurse -Filter 'ficha.json').Count -ne $pairs.Count) {
  throw 'La cantidad de copias emparejadas no coincide con el plan.'
}
$report | ConvertTo-Json -Depth 8
