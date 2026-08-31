param(
  [string]$EnvironmentFile = ".env.production",
  [string]$OutputDirectory = ".\\backups"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $OutputDirectory "provas-$timestamp.sql"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
docker compose --env-file $EnvironmentFile -f docker-compose.prod.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' > $backupFile

if ($LASTEXITCODE -ne 0) {
  throw "O backup nao foi concluido. O arquivo parcial foi mantido em $backupFile para conferencia."
}

Write-Output "Backup criado em $backupFile"
