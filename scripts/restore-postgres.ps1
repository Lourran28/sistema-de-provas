param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$EnvironmentFile = ".env.production"
)

if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) {
  throw "Arquivo de backup nao encontrado: $BackupFile"
}

Get-Content -Raw -LiteralPath $BackupFile | docker compose --env-file $EnvironmentFile -f docker-compose.prod.yml exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

if ($LASTEXITCODE -ne 0) {
  throw "A restauracao nao foi concluida. Verifique os logs do PostgreSQL."
}

Write-Output "Banco restaurado a partir de $BackupFile"
