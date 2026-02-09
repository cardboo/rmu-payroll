<?php
include_once '../config/cors.php';
include_once '../config/database.php';
include_once '../middleware/auth.php';
include_once '../config/error-logger.php';

try {
    $user = authenticate();

    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List all currency rates or get current rate
    if ($method === 'GET') {
        if (isset($_GET['current'])) {
            $query = "SELECT * FROM currency_rates 
                      WHERE is_active = 1 
                      ORDER BY effective_date DESC 
                      LIMIT 1";
            $stmt = $db->query($query);
            $data = $stmt->fetch();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $data
            ]);
        } else {
            $query = "SELECT cr.*, u.full_name as created_by_name 
                      FROM currency_rates cr
                      LEFT JOIN users u ON cr.created_by = u.id
                      ORDER BY cr.effective_date DESC";
            $stmt = $db->query($query);
            $rates = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $rates
            ]);
        }
    }

    // POST - Create new currency rate
    else if ($method === 'POST') {
        requireAdmin($user);

        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->rate) || !isset($data->effective_date)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Rate and effective date are required'
            ]);
            exit();
        }

        // Deactivate previous rates
        $deactivateQuery = "UPDATE currency_rates SET is_active = 0";
        $db->query($deactivateQuery);

        $query = "INSERT INTO currency_rates (currency_from, currency_to, rate, effective_date, created_by, is_active) 
                  VALUES ('USD', 'GHS', :rate, :effective_date, :created_by, 1)";
        $stmt = $db->prepare($query);

        $stmt->bindParam(':rate', $data->rate);
        $stmt->bindParam(':effective_date', $data->effective_date);
        $stmt->bindParam(':created_by', $user->user_id);

        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'CREATE', 'currency_rates', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $newId = $db->lastInsertId();
            $logStmt->bindParam(':record_id', $newId);
            $logStmt->execute();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Currency rate created successfully',
                'id' => $newId
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create currency rate'
            ]);
        }
    }

    // PUT - Update currency rate (activate/deactivate)
    else if ($method === 'PUT') {
        requireAdmin($user);

        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Currency rate ID is required'
            ]);
            exit();
        }

        if ($data->is_active) {
            // Deactivate all other rates
            $deactivateQuery = "UPDATE currency_rates SET is_active = 0";
            $db->query($deactivateQuery);
        }

        $query = "UPDATE currency_rates SET is_active = :is_active WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->id);
        $stmt->bindParam(':is_active', $data->is_active);

        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'UPDATE', 'currency_rates', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Currency rate updated successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update currency rate'
            ]);
        }
    }

    // DELETE - Delete currency rate
    else if ($method === 'DELETE') {
        requireAdmin($user);

        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Currency rate ID is required'
            ]);
            exit();
        }

        $query = "DELETE FROM currency_rates WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->id);

        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'DELETE', 'currency_rates', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Currency rate deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete currency rate'
            ]);
        }
    }
} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'currency-rates'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'currency-rates'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
