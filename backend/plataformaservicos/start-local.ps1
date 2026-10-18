# Carrega a configuração do arquivo .env e inicia o backend local pelo Maven Wrapper.

# Inicie com: .\backend\plataformaservicos\start-local.ps1
# Le apenas as variaveis PostgreSQL do .env da raiz, sem imprimir credenciais.
$ErrorActionPreference = 'Stop'
$findyEnvPath = Join-Path $PSScriptRoot '../../.env'
if (-not (Test-Path -LiteralPath $findyEnvPath)) {
    throw 'Crie o .env na raiz a partir de .env.example antes de iniciar.'
}

$findyOriginalEnv = @{}
try {
    foreach ($findyLine in Get-Content -LiteralPath $findyEnvPath -Encoding UTF8) {
        if ($findyLine -notmatch '^\s*(POSTGRES_(?:HOST|PORT|DB|USER|PASSWORD)|BREVO_API_KEY|EMAIL_FROM|APP_URL)\s*=(.*)$') {
            continue
        }
        $findyKey = $Matches[1]
        $findyValue = $Matches[2].Trim()
        # Aceita valores simples ou entre aspas, como os gerados neste projeto.
        if ($findyValue.Length -ge 2 -and
            (($findyValue.StartsWith("'") -and $findyValue.EndsWith("'")) -or
             ($findyValue.StartsWith('"') -and $findyValue.EndsWith('"')))) {
            $findyValue = $findyValue.Substring(1, $findyValue.Length - 2)
        }
        $findyOriginalEnv[$findyKey] = [Environment]::GetEnvironmentVariable($findyKey, 'Process')
        [Environment]::SetEnvironmentVariable($findyKey, $findyValue, 'Process')
    }
    if (-not $env:POSTGRES_PASSWORD) {
        throw 'Defina POSTGRES_PASSWORD no .env antes de iniciar.'
    }
    Push-Location $PSScriptRoot
    try {
        & .\mvnw.cmd spring-boot:run
        $findyExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} finally {
    foreach ($findyKey in $findyOriginalEnv.Keys) {
        [Environment]::SetEnvironmentVariable($findyKey, $findyOriginalEnv[$findyKey], 'Process')
    }
}
if ($findyExitCode -ne 0) {
    throw "O backend encerrou com codigo $findyExitCode. Confira a mensagem do Maven acima."
}
