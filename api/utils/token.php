<?php

// Include environment configuration
include_once __DIR__ . '/../config/env.php';

function generateToken(array $user)
{
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);

    $payload = json_encode([
        'user_id'   => $user['id'],
        'username'  => $user['username'],
        'role'      => $user['role'],
        'full_name' => $user['full_name'],
        'exp'       => time() + JWT_EXPIRY
    ]);

    $base64UrlHeader  = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
    $base64UrlPayload = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');

    $signature = hash_hmac(
        'sha256',
        $base64UrlHeader . "." . $base64UrlPayload,
        JWT_SECRET,
        true
    );

    $base64UrlSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}
