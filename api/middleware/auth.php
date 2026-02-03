<?php
header('Content-Type: application/json');

// Include environment configuration
include_once __DIR__ . '/../config/env.php';

function authenticate()
{
    $headers = getallheaders();
    $authHeader = null;

    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    } elseif (isset($headers['authorization'])) {
        $authHeader = $headers['authorization'];
    } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (!$authHeader) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'No authorization token provided'
        ]);
        exit;
    }

    // Case-insensitive Bearer token extraction
    $token = preg_replace('/^bearer\s+/i', '', $authHeader);
    $decoded = verifyToken($token);

    if (!$decoded) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired token'
        ]);
        exit;
    }

    return $decoded;
}

function requireAdmin($user)
{
    if (!isset($user->role) || $user->role !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Admin access required'
        ]);
        exit;
    }
}

/**
 * Base64 URL decode (handles URL-safe base64)
 */
function base64UrlDecode($data)
{
    $padding = 4 - (strlen($data) % 4);
    if ($padding !== 4) {
        $data .= str_repeat('=', $padding);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Verify JWT token with proper signature validation
 */
function verifyToken($token)
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($header, $payload, $signature) = $parts;

    // Verify signature
    $expectedSignature = hash_hmac(
        'sha256',
        $header . '.' . $payload,
        JWT_SECRET,
        true
    );
    $expectedSignatureEncoded = rtrim(strtr(base64_encode($expectedSignature), '+/', '-_'), '=');

    // Use hash_equals for timing-safe comparison
    if (!hash_equals($expectedSignatureEncoded, $signature)) {
        return false;
    }

    // Decode payload
    $decodedPayload = json_decode(base64UrlDecode($payload));

    if (!$decodedPayload) {
        return false;
    }

    // Check expiration
    if (!isset($decodedPayload->exp) || $decodedPayload->exp < time()) {
        return false;
    }

    return $decodedPayload;
}
