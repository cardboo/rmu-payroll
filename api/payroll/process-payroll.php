<?php
include_once '../config/cors.php';
include_once '../config/database.php';
include_once '../middleware/auth.php';
include_once '../config/error-logger.php';

try {
    $user = authenticate();
    requireAdmin($user);  // Only admins can view payroll data

    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];

    // GET - List all staffs for process payroll with optional department filter
    if ($method === 'GET') {
        $query = "SELECT s.id, s.staff_number, s.first_name, s.last_name, s.basic_salary, s.salary_currency,
                  s.status, s.bonded, d.department_name, des.designation_name
                  FROM staffs s
                  LEFT JOIN departments d ON s.department_id = d.id
                  LEFT JOIN designations des ON s.designation_id = des.id
                  WHERE s.is_archived = 0";

        // Add department filter if provided
        if (isset($_GET['department_id'])) {
            $query .= " AND s.department_id = :department_id";
        }

        $query .= " ORDER BY s.last_name, s.first_name";

        $stmt = $db->prepare($query);
        
        if (isset($_GET['department_id'])) {
            $stmt->bindParam(':department_id', $_GET['department_id']);
        }

        $stmt->execute();
        $staffs = $stmt->fetchAll();

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $staffs
        ]);
    }

} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'payroll/process-payroll'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'payroll/process-payroll'
    ]);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
?>
