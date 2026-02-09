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

    // GET - List all allowances
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            $query = "SELECT * FROM allowances WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $_GET['id']);
            $stmt->execute();

            $data = $stmt->fetch();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $data
            ]);
        } else {
            $includeArchived = isset($_GET['include_archived']) ? $_GET['include_archived'] : false;

            if ($includeArchived) {
                $query = "SELECT * FROM allowances ORDER BY allowance_name";
            } else {
                $query = "SELECT * FROM allowances WHERE is_archived = 0 ORDER BY allowance_name";
            }

            $stmt = $db->query($query);
            $allowances = $stmt->fetchAll();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $allowances
            ]);
        }
    }

    // POST - Create new allowance
    else if ($method === 'POST') {
        requireAdmin($user);

        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->allowance_code) || !isset($data->allowance_name)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Allowance code and name are required'
            ]);
            exit();
        }

       $query = "INSERT INTO allowances
          (`allowance_code`, `allowance_name`, `description`, `is_percentage`, `default_amount`, `is_bonded`, `eligible_status`, `is_dependents_allowance`)
          VALUES
          (:code, :name, :description, :is_percentage, :default_amount, :is_bonded, :eligible_status, :is_dependents_allowance)";
            $stmt = $db->prepare($query);

            $isDependentsAllowance = isset($data->is_dependents_allowance) ? (int)$data->is_dependents_allowance : 0;

            $stmt->bindParam(':code', $data->allowance_code);
            $stmt->bindParam(':name', $data->allowance_name);
            $stmt->bindParam(':description', $data->description);
            $stmt->bindParam(':is_percentage', $data->is_percentage);
            $stmt->bindParam(':default_amount', $data->default_amount);
            $stmt->bindParam(':is_bonded', $data->bonded);
            $stmt->bindParam(':eligible_status', $data->eligible_status);
            $stmt->bindParam(':is_dependents_allowance', $isDependentsAllowance);


        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'CREATE', 'allowances', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $newId = $db->lastInsertId();
            $logStmt->bindParam(':record_id', $newId);
            $logStmt->execute();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Allowance created successfully',
                'id' => $newId,
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to create allowance'
            ]);
        }
    }

    // PUT - Update allowance
else if ($method === 'PUT') {
    requireAdmin($user);

    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->id)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Allowance ID is required'
        ]);
        exit();
    }

    if (isset($data->is_archived)) {
        // Archiving/unarchiving
        $query = "UPDATE `allowances` SET `is_archived` = :is_archived WHERE id = :id";
        $stmt = $db->prepare($query);

        $stmt->bindParam(':id', $data->id);
        $stmt->bindParam(':is_archived', $data->is_archived);

        $action = $data->is_archived ? 'ARCHIVE' : 'RESTORE';
    } else {
        // Update all allowance fields
        $query = "UPDATE `allowances` SET
            `allowance_code` = :code,
            `allowance_name` = :name,
            `description` = :description,
            `is_percentage` = :is_percentage,
            `default_amount` = :default_amount,
            `is_bonded` = :is_bonded,
            `eligible_status` = :eligible_status,
            `is_dependents_allowance` = :is_dependents_allowance
            WHERE id = :id";

        $stmt = $db->prepare($query);

        // Ensure proper defaults and types
        $bonded = isset($data->bonded) ? (int)$data->bonded : 0;
        $eligible_status = isset($data->eligible_status) ? $data->eligible_status : 'both';
        $isDependentsAllowance = isset($data->is_dependents_allowance) ? (int)$data->is_dependents_allowance : 0;

        $stmt->bindParam(':id', $data->id);
        $stmt->bindParam(':code', $data->allowance_code);
        $stmt->bindParam(':name', $data->allowance_name);
        $stmt->bindParam(':description', $data->description);
        $stmt->bindParam(':is_percentage', $data->is_percentage);
        $stmt->bindParam(':default_amount', $data->default_amount);
        $stmt->bindParam(':is_bonded', $bonded);
        $stmt->bindParam(':eligible_status', $eligible_status);
        $stmt->bindParam(':is_dependents_allowance', $isDependentsAllowance);

        $action = 'UPDATE';
    }

    // Execute and log
    try {
        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, :action, 'allowances', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':action', $action);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Allowance updated successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update allowance'
            ]);
        }
    } catch (PDOException $e) {
        ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
            'method' => $method ?? 'Unknown',
            'endpoint' => 'allowances',
            'data' => $data ?? null
        ]);

        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'A database error occurred'
        ]);
    }
}


    // DELETE - Delete allowance
    else if ($method === 'DELETE') {
        requireAdmin($user);

        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Allowance ID is required'
            ]);
            exit();
        }

        $query = "DELETE FROM allowances WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->id);

        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'DELETE', 'allowances', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Allowance deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete allowance'
            ]);
        }
    }
} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'allowances'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'allowances'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
