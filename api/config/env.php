<?php
/**
 * Environment Configuration
 *
 * IMPORTANT: In production, these values should come from environment variables
 * or a .env file that is NOT committed to version control.
 *
 * For local development, you can modify these values directly.
 */

// Check for environment variables first, then fall back to defaults
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'payroll_system');
define('DB_USERNAME', getenv('DB_USERNAME') ?: 'root');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');

// JWT Secret - MUST be changed in production!
// Generate a secure key with: php -r "echo bin2hex(random_bytes(32));"
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'change-this-to-a-secure-random-key-in-production');

// JWT Token expiration (in seconds) - default 8 hours
define('JWT_EXPIRY', getenv('JWT_EXPIRY') ?: 60 * 60 * 8);

// CORS allowed origins (comma-separated for multiple)
// Use '*' for development only, specify exact origins in production
define('CORS_ALLOWED_ORIGINS', getenv('CORS_ALLOWED_ORIGINS') ?: '*');
