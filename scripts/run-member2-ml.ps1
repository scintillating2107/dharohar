$ErrorActionPreference = "Stop"
$ServiceDir = Join-Path $PSScriptRoot "..\services\member2-image\ML service (1)"
Set-Location $ServiceDir

# basicsr / paddlepaddle do not support Python 3.13 yet
$PythonVer = $null
foreach ($ver in @("3.12", "3.11", "3.10")) {
  try {
    $candidate = & py "-$ver" -c "import sys; print(sys.executable)" 2>$null
    if ($candidate) {
      $PythonVer = $ver
      break
    }
  } catch {}
}
if (-not $PythonVer) {
  Write-Error "Install Python 3.12 from python.org (3.13 is not supported for RealESRGAN/PaddleOCR)."
}

$VenvPython = ".\venv\Scripts\python.exe"
$NeedVenv = $true
if (Test-Path $VenvPython) {
  $venvVer = & $VenvPython -c "import sys; print(str(sys.version_info.major) + '.' + str(sys.version_info.minor))"
  if ($venvVer -eq "3.13") {
    Write-Host "Removing Python 3.13 venv (incompatible with ML dependencies)..."
    Remove-Item -Recurse -Force .\venv
  } else {
    $NeedVenv = $false
  }
}
if ($NeedVenv) {
  Write-Host "Creating venv with Python $PythonVer ..."
  & py "-$PythonVer" -m venv venv
}

& .\venv\Scripts\python.exe -m pip install --upgrade pip wheel "setuptools>=69,<81"

Write-Host "Installing base packages..."
& .\venv\Scripts\pip.exe install -r requirements-base.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing PyTorch (CPU)..."
& .\venv\Scripts\pip.exe install torch torchvision --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing RealESRGAN + PaddleOCR (may take several minutes)..."
& .\venv\Scripts\pip.exe install --no-build-isolation --no-cache-dir basicsr==1.4.2
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\venv\Scripts\pip.exe install facexlib gfpgan realesrgan==0.3.0
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& .\venv\Scripts\pip.exe install paddlepaddle paddleocr
if ($LASTEXITCODE -ne 0) {
  Write-Warning "PaddleOCR install failed; service will still run with OCR fallback."
}

if (-not (Test-Path ".\.env")) {
  Copy-Item .env.example .env
}

Write-Host 'Starting Member 2 ML service on http://localhost:8001'
& .\venv\Scripts\uvicorn.exe app:app --host 0.0.0.0 --port 8001
