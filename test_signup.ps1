$body = @{
    email = "test@example.com"
    password = "password123"
    restaurantName = "Test Restaurant"
    city = "New York"
    state = "NY"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/signup' -Method POST -ContentType 'application/json' -Body $body
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Error Status Code: $($_.Exception.Response.StatusCode.Value)"
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $streamReader.ReadToEnd()
        Write-Host "Error Body: $errorBody"
    }
}
