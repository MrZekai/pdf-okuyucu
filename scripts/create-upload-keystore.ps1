param(
  [string]$KeystorePath = (Join-Path $PSScriptRoot '..\upload-keystore.jks'),
  [string]$Alias = 'pdf-okuyucu-upload'
)

$ErrorActionPreference = 'Stop'
if (Test-Path $KeystorePath) { throw "Dosya zaten var: $KeystorePath" }
if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) { throw 'keytool bulunamadı. Önce JDK 17 kurun.' }

$storeSecure = Read-Host 'Keystore parolası (en az 6 karakter)' -AsSecureString
$keySecure = Read-Host 'Key parolası (en az 6 karakter)' -AsSecureString
$storePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storeSecure)
$keyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure)
try {
  $storePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($storePtr)
  $keyPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPtr)
  if ($storePassword.Length -lt 6 -or $keyPassword.Length -lt 6) { throw 'Parolalar en az 6 karakter olmalıdır.' }
  keytool -genkeypair -v -keystore $KeystorePath -alias $Alias -keyalg RSA -keysize 4096 -validity 10000 -storepass $storePassword -keypass $keyPassword -dname 'CN=PDF Okuyucu Upload, OU=Mobile, O=Aitolian, C=TR'
  if ($LASTEXITCODE -ne 0) { throw 'keytool keystore üretemedi.' }
  [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $KeystorePath))) | Set-Clipboard
  Write-Host "Keystore oluşturuldu: $KeystorePath"
  Write-Host 'Base64 keystore panoya kopyalandı. Bunu ANDROID_UPLOAD_KEYSTORE_BASE64 secret olarak ekleyin.'
  Write-Host "Alias: $Alias"
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($storePtr)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPtr)
  $storePassword = $null
  $keyPassword = $null
}
