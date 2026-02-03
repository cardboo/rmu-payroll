<?php
// Include environment configuration
include_once __DIR__ . '/env.php';

// Get allowed origins from environment config
$allowedOrigins = CORS_ALLOWED_ORIGINS;

// Handle CORS
if ($allowedOrigins === '*') {
    // Development mode - allow all origins (NOT for production)
    header("Access-Control-Allow-Origin: *");
} else {
    // Production mode - only allow specified origins
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedList = array_map('trim', explode(',', $allowedOrigins));

    if (in_array($origin, $allowedList, true)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Credentials: true");
    }
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
