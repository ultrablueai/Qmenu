# Beger G1 — export-only backup of the dedicated Staging Supabase project.
# NEVER targets Production, NEVER restores, and NEVER sends database content to GitHub.
# PowerShell 5.1+ on the operator's Windows laptop. Requires Supabase CLI + Docker Desktop.
# Outputs plaintext sensitive SQL; operator MUST encrypt and securely delete plaintext copies.
[CmdletBinding()]
param(
  [string]$Repo = 'D:\Users\abc\Documents\ChatGPT\Beger\Qmenu',
  [string]$BackupRoot = "$env:USERPROFILE\Documents\Beger-private-backups"
)
$ErrorActionPreference = 'Stop'
$stage = 'qandxrcuetwzenlqspez'
$expectedBranch = 'feat/g1-foundation'
if (-not (Test-Path -LiteralPath (Join-Path $Repo '.git'))) {
  throw "Repository not found: $Repo"
}
$gitCommand = @(Get-Command git.exe -CommandType Application -ErrorAction Stop)[0]
$branch = (& $gitCommand.Source -C $Repo branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne $expectedBranch) {
  throw "Wrong repository branch; expected $expectedBranch, got $branch"
}
$origin = (& $gitCommand.Source -C $Repo remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notmatch '(?i)(github\.com[:/])ultrablueai/Qmenu(\.git)?$') {
  throw "Repository origin is not the approved ultrablueai/Qmenu"
}
$cli = @(Get-Command supabase -CommandType Application -ErrorAction SilentlyContinue)[0]
if (-not $cli) { throw 'Supabase CLI not installed. See https://supabase.com/docs/guides/local-development/cli/getting-started' }
$docker = @(Get-Command docker.exe -CommandType Application -ErrorAction SilentlyContinue)[0]
if (-not $docker) { throw 'Docker CLI not installed. Install Docker Desktop first.' }
& $docker.Source info --format '{{.ServerVersion}}' 1>$null 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop engine is not running.' }
# Destination must be outside repository tree. SQL files contain private Auth and tenant data.
$repoAbs = [IO.Path]::GetFullPath($Repo).TrimEnd('\','/')
$rootAbs = [IO.Path]::GetFullPath($BackupRoot).TrimEnd('\','/')
if ($rootAbs.StartsWith($repoAbs + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $rootAbs -eq $repoAbs) {
  throw 'BackupRoot must be OUTSIDE the Git checkout.'
}
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$dest = Join-Path $rootAbs "beger-staging-$stamp"
New-Item -ItemType Directory -Path $dest -Force | Out-Null
$previous = Get-Location
try {
  Set-Location -LiteralPath $Repo
  Write-Host "Linking to STAGING $stage (may prompt for login/database password locally)."
  & $cli.Source link --project-ref $stage
  if ($LASTEXITCODE -ne 0) { throw 'Supabase staging link failed; no dump was certified.' }
  $commands = @(
    @{File='roles.sql'; Args=@('--role-only')},
    @{File='schema.sql'; Args=@()},
    @{File='data.sql'; Args=@('--data-only','--use-copy')}
  )
  foreach ($item in $commands) {
    $outputPath = Join-Path $dest $item.File
    Write-Host "Exporting $($item.File) from STAGING..."
    $arguments = @('db','dump','--linked','-f',$outputPath) + $item.Args
    & $cli.Source @arguments
    if ($LASTEXITCODE -ne 0) { throw "Dump failed: $($item.File)" }
    $f = Get-Item -LiteralPath $outputPath -ErrorAction Stop
    if ($f.Length -lt 1) { throw "Empty dump: $($item.File)" }
  }
  $sha = (& $gitCommand.Source -C $Repo rev-parse HEAD | Out-String).Trim()
  $files = @('roles.sql','schema.sql','data.sql') | ForEach-Object {
    $f = Get-Item -LiteralPath (Join-Path $dest $_)
    $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $f.FullName
    [pscustomobject]@{name=$f.Name;bytes=$f.Length;sha256=$hash.Hash}
  }
  [pscustomobject]@{
    stage_project = $stage
    git_sha = $sha
    captured_utc = (Get-Date).ToUniversalTime().ToString('o')
    files = $files
    result = 'EXPORT_COMPLETE_NOT_RESTORE_VERIFIED'
  } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $dest 'manifest.json') -Encoding UTF8
  Write-Host "BACKUP_EXPORT_COMPLETE: $dest" -ForegroundColor Green
  Write-Host 'IMPORTANT: SQL files are plaintext and contain private data. Encrypt immediately using a trusted local tool, then securely protect or remove plaintext. Export != restored backup.'
  Write-Host 'Share only the manifest counters / completion line, never SQL files, credentials or tokens.'
} finally {
  Set-Location $previous
}
