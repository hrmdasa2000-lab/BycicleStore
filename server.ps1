# Simple dependency-free HTTP server for local development
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.ico'  = 'image/x-icon'
    '.svg'  = 'image/svg+xml'
    '.woff2'= 'font/woff2'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Server running at http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
            while ($reader.ReadLine()) { }

            $parts = $requestLine -split ' '
            $urlPath = if ($parts.Length -ge 2) { [Uri]::UnescapeDataString(($parts[1] -split '\?')[0]) } else { '/' }
            if ($urlPath -eq '/') { $urlPath = '/index.html' }

            $rootPath = [System.IO.Path]::GetFullPath($root)
            $filePath = [System.IO.Path]::GetFullPath((Join-Path $root ($urlPath.TrimStart('/').Replace('/', '\'))))
            $allowed = $filePath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)

            if ($allowed -and (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
                $body = [System.IO.File]::ReadAllBytes($filePath)
                $status = '200 OK'
            } else {
                $contentType = 'text/plain; charset=utf-8'
                $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $status = '404 Not Found'
            }

            $header = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($parts[0] -ne 'HEAD') {
                $stream.Write($body, 0, $body.Length)
            }
            $stream.Flush()
        } catch {
            Write-Warning "Request failed: $($_.Exception.Message)"
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
