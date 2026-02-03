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

    // GET - Search staff and fetch their applicable allowances and deductions
    if ($method === 'GET') {
        if (isset($_GET['staff_number'])) {
            $query = "SELECT s.*, d.department_name, des.designation_name
                      FROM staffs s
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      WHERE s.staff_number = :staff_number AND s.is_archived = FALSE";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':staff_number', $_GET['staff_number']);
            $stmt->execute();
            
            $staff = $stmt->fetch();
            
            if (!$staff) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Staff not found'
                ]);
                exit();
            }
            
            $allowQuery = "SELECT a.*, 
                           CASE WHEN sa.id IS NOT NULL THEN 1 ELSE 0 END as is_applicable,
                           COALESCE(sa.amount, a.default_amount) as amount,
                           COALESCE(sa.is_percentage, a.is_percentage) as is_percentage,
                           sa.id as staff_allowance_id,
                           sa.staff_id as assigned_staff_id
                           FROM allowances a
                           LEFT JOIN staff_allowances sa ON a.id = sa.allowance_id AND sa.staff_id = :staff_id
                           WHERE a.is_archived = FALSE
                           ORDER BY a.allowance_name";
            $allowStmt = $db->prepare($allowQuery);
            $allowStmt->bindParam(':staff_id', $staff['id']);
            $allowStmt->execute();
            $allowances = $allowStmt->fetchAll();
            
            $deductQuery = "SELECT d.*, 
                            CASE WHEN sd.id IS NOT NULL THEN 1 ELSE 0 END as is_applicable,
                            COALESCE(sd.amount, d.default_amount) as amount,
                            COALESCE(sd.is_percentage, d.is_percentage) as is_percentage,
                            sd.id as staff_deduction_id,
                            sd.staff_id as assigned_staff_id
                            FROM deductions d
                            LEFT JOIN staff_deductions sd ON d.id = sd.deduction_id AND sd.staff_id = :staff_id
                            WHERE d.is_archived = FALSE
                            ORDER BY d.deduction_name";
            $deductStmt = $db->prepare($deductQuery);
            $deductStmt->bindParam(':staff_id', $staff['id']);
            $deductStmt->execute();
            $deductions = $deductStmt->fetchAll();
            
            $rateQuery = "SELECT rate FROM currency_rates WHERE is_active = 1 LIMIT 1";
            $rateStmt = $db->query($rateQuery);
            $rateData = $rateStmt->fetch();
            $currencyRate = ($rateData !== false && isset($rateData['rate'])) ? (float)$rateData['rate'] : 1.0;
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'staff' => $staff,
                    'allowances' => $allowances,
                    'deductions' => $deductions,
                    'currency_rate' => $currencyRate
                ]
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Staff number is required'
            ]);
        }
    }
} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'payroll/staff-search',
        'staff_number' => $_GET['staff_number'] ?? 'N/A'
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'payroll/staff-search'
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
?>
