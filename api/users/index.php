<?php
include_once '../config/cors.php';
include_once '../config/database.php';
include_once '../middleware/auth.php';
include_once '../config/error-logger.php';

try {
    $user = authenticate();
    requireAdmin($user);

    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List all users
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $query = "SELECT id, username, full_name, email, role, position, is_active, created_at 
                      FROM users WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $_GET['id']);
            $stmt->execute();

            $userData = $stmt->fetch();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $userData
            ]);
        } else {
            $query = "SELECT id, username, full_name, email, role, position, is_active, created_at 
                      FROM users ORDER BY created_at DESC";
            $stmt = $db->query($query);
            $users = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $users
            ]);
        }
    }

    // POST - Create new user
    else if ($method === 'POST') {
        $data = json_decode(file_get_contents("php://input"));

        if (
            !isset($data->username) || !isset($data->password) || !isset($data->full_name) ||
            !isset($data->email) || !isset($data->role)
        ) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Missing required fields'
            ]);
            exit();
        }

        // Check if username exists
        $checkQuery = "SELECT id FROM users WHERE username = :username";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':username', $data->username);
        $checkStmt->execute();

        if ($checkStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Username already exists'
            ]);
            exit();
        }

        $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);

        $query = "INSERT INTO users (username, password, full_name, email, role, position) 
                  VALUES (:username, :password, :full_name, :email, :role, :position)";
        $stmt = $db->prepare($query);

        $stmt->bindParam(':username', $data->username);
        $stmt->bindParam(':password', $hashedPassword);
        $stmt->bindParam(':full_name', $data->full_name);
        $stmt->bindParam(':email', $data->email);
        $stmt->bindParam(':role', $data->role);
        $stmt->bindParam(':position', $data->position);

        if ($stmt->execute()) {
            // Log action
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'CREATE', 'users', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $newId = $db->lastInsertId();
            $logStmt->bindParam(':record_id', $newId);
            $logStmt->execute();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'User created successfully',
                'id' => $newId
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create user'
            ]);
        }
    }

    // PUT - Update user
    else if ($method === 'PUT') {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'User ID is required'
            ]);
            exit();
        }

        $query = "UPDATE users SET 
                  full_name = :full_name,
                  email = :email,
                  role = :role,
                  position = :position,
                  is_active = :is_active
                  WHERE id = :id";

        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->id);
        $stmt->bindParam(':full_name', $data->full_name);
        $stmt->bindParam(':email', $data->email);
        $stmt->bindParam(':role', $data->role);
        $stmt->bindParam(':position', $data->position);
        $stmt->bindParam(':is_active', $data->is_active);

        if ($stmt->execute()) {
            // Log action
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'UPDATE', 'users', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update user'
            ]);
        }
    }

    // DELETE - Delete user
    else if ($method === 'DELETE') {
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'User ID is required'
            ]);
            exit();
        }

        $query = "DELETE FROM users WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->id);

        if ($stmt->execute()) {
            // Log action
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'DELETE', 'users', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete user'
            ]);
        }
    }
} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'users'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'users'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
