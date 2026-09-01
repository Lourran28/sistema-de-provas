param(
    [switch]$Ai,
    [switch]$FromClipboard
)

$ErrorActionPreference = "Stop"
$env:SPRING_PROFILES_ACTIVE = "local"
$env:JWT_SECRET = "local-development-secret-at-least-32-characters"

if ($Ai) {
    $apiKey = ""
    $bstr = [IntPtr]::Zero

    try {
        if ($FromClipboard) {
            $apiKey = [string](Get-Clipboard -Raw)
        }
        else {
            $secureApiKey = Read-Host "Cole a chave da OpenAI e pressione Enter" -AsSecureString
            $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureApiKey)
            $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        }

        $apiKey = $apiKey.Trim()

        if ($apiKey.Length -lt 20 -or -not $apiKey.StartsWith("sk-")) {
            throw "A chave nao foi colada corretamente. Use o botao direito do mouse para colar a chave completa e tente novamente."
        }

        $env:OPENAI_ENABLED = "true"
        $env:OPENAI_API_KEY = $apiKey
        $env:OPENAI_MODEL = "gpt-5.6-luna"

        # Keep the key in the user's local environment, never in the repository.
        [Environment]::SetEnvironmentVariable("OPENAI_ENABLED", "true", "User")
        [Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $apiKey, "User")
        [Environment]::SetEnvironmentVariable("OPENAI_MODEL", "gpt-5.6-luna", "User")
        Write-Host "Chave recebida. Iniciando o servidor com IA..."
        & "$PSScriptRoot\mvnw.cmd" spring-boot:run
    }
    finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }

        Remove-Variable apiKey -ErrorAction SilentlyContinue
    }
}
else {
    $storedApiKey = [Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "User")
    $storedAiEnabled = [Environment]::GetEnvironmentVariable("OPENAI_ENABLED", "User")
    if ($storedAiEnabled -eq "true" -and $storedApiKey -match "^sk-" -and $storedApiKey.Length -ge 20) {
        $env:OPENAI_ENABLED = "true"
        $env:OPENAI_API_KEY = $storedApiKey
        $env:OPENAI_MODEL = [Environment]::GetEnvironmentVariable("OPENAI_MODEL", "User")
        Write-Host "Iniciando o servidor com a IA configurada neste computador..."
    }

    & "$PSScriptRoot\mvnw.cmd" spring-boot:run
}

exit $LASTEXITCODE
