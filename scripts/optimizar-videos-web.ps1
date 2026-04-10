# Reencode MP4 para web: peso bajo + faststart + keyframes frecuentes (scrub fluido en Beneficios).
# Requiere ffmpeg en PATH (winget install Gyan.FFmpeg).
#
# Por defecto: 1280px ancho max, CRF 23, GOP 15 (keyframes cada ~0,5s a 30fps).
# Fuente: VideoSeccion3_scrub_backup_4k.mp4 si existe; si no, VideoSeccion3_scrub.mp4.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$img = Join-Path $root "Images"

# --- Ajustes (más bajo = archivo más chico / decode más fácil) ---
$MaxWidth = 1280
$Crf = 23
$Gop = 15

$scrubIn = Join-Path $img "VideoSeccion3_scrub_backup_4k.mp4"
if (-not (Test-Path $scrubIn)) {
  $scrubIn = Join-Path $img "VideoSeccion3_scrub.mp4"
}

$scrubOut = Join-Path $img "VideoSeccion3_scrub_web_tmp.mp4"
$heroIn = Join-Path $img "Video.mp4"
$heroOut = Join-Path $img "Video_faststart_tmp.mp4"

Write-Host "=== VideoSeccion3_scrub: ${MaxWidth}px max | CRF $Crf | GOP $Gop | sin audio | faststart ===" -ForegroundColor Cyan
& ffmpeg -y -hide_banner -loglevel warning -i $scrubIn -an `
  -vf "scale=${MaxWidth}:-2" `
  -c:v libx264 -preset medium -crf $Crf `
  -pix_fmt yuv420p -profile:v high -level 4.0 `
  -g $Gop -keyint_min $Gop -sc_threshold 0 -tune fastdecode `
  -movflags +faststart `
  $scrubOut

Write-Host "=== Video.mp4 (hero): solo faststart (copia sin reencode) ===" -ForegroundColor Cyan
& ffmpeg -y -hide_banner -loglevel warning -i $heroIn -c copy -movflags +faststart $heroOut

Write-Host "Listo: $scrubOut y $heroOut — revisalos y reemplazá los originales si te gustan." -ForegroundColor Green
