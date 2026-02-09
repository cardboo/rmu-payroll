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
    
    if ($method === 'GET') {
        $period_id = isset($_GET['period_id']) ? intval($_GET['period_id']) : null;

        if (!$period_id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'period_id is required']);
            exit;
        }

        // Check if payroll entries already exist for this period
        $query = "SELECT COUNT(*) as count FROM payroll_entries WHERE payroll_period_id = :period_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':period_id', $period_id, PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $entries_exist = $result['count'] > 0;

        if ($entries_exist) {
            // Load existing payroll entries with their allowances and deductions
            $query = "SELECT pe.*, s.staff_number, s.first_name, s.last_name, s.department_id, d.department_name, des.designation_name
                      FROM payroll_entries pe
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      WHERE pe.payroll_period_id = :period_id
                      ORDER BY s.first_name, s.last_name";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':period_id', $period_id, PDO::PARAM_INT);
            $stmt->execute();
            $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get allowances and deductions for each entry
            $entries_data = [];
            foreach ($entries as $entry) {
                // Get applied allowances
                $query = "SELECT pa.*, a.allowance_name, a.is_percentage as allowance_is_percentage
                          FROM payroll_allowances pa
                          JOIN allowances a ON pa.allowance_id = a.id
                          WHERE pa.payroll_entry_id = :entry_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':entry_id', $entry['id'], PDO::PARAM_INT);
                $stmt->execute();
                $allowances = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get applied deductions
                $query = "SELECT pd.*, d.deduction_name, d.is_percentage as deduction_is_percentage
                          FROM payroll_deductions pd
                          JOIN deductions d ON pd.deduction_id = d.id
                          WHERE pd.payroll_entry_id = :entry_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':entry_id', $entry['id'], PDO::PARAM_INT);
                $stmt->execute();
                $deductions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $entries_data[] = [
                    'payroll_entry' => $entry,
                    'allowances' => $allowances,
                    'deductions' => $deductions
                ];
            }

            error_log("[PAYROLL] Loaded {$result['count']} existing payroll entries for period {$period_id}");
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'entries_exist' => true,
                'data' => $entries_data,
                'message' => 'Payroll entries loaded from database'
            ]);
        } else {
            // Load eligible staff for creating new entries
            $query = "SELECT p.month, p.year FROM payroll_periods p WHERE p.id = :period_id LIMIT 1";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':period_id', $period_id, PDO::PARAM_INT);
            $stmt->execute();
            $period = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$period) {
                throw new Exception("Payroll period not found");
            }

            $periodDate = new DateTime($period['year'] . '-' . str_pad($period['month'], 2, '0', STR_PAD_LEFT) . '-01');

            // Get eligible staff (not archived, hired before or on period date)
            // Include number_of_dependents for dependents allowance calculation
            $query = "SELECT s.*, d.department_name, des.designation_name, cr.rate as currency_rate
                      FROM staffs s
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      LEFT JOIN currency_rates cr ON s.salary_currency = cr.currency_to AND cr.is_active = 1
                      WHERE s.is_archived = 0
                      AND DATE(s.hire_date) <= :period_date
                      ORDER BY s.first_name, s.last_name";
            $stmt = $db->prepare($query);
            $periodDateStr = $periodDate->format('Y-m-d');
            $stmt->bindParam(':period_date', $periodDateStr);
            $stmt->execute();
            $eligible_staff = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // For each eligible staff, get their staff_allowances and staff_deductions
            $staff_data = [];
            foreach ($eligible_staff as $staff) {
                // Get staff-specific allowances (include is_dependents_allowance flag)
                $query = "SELECT sa.*, a.allowance_name, a.default_amount, a.is_percentage, a.is_dependents_allowance
                          FROM staff_allowances sa
                          JOIN allowances a ON sa.allowance_id = a.id
                          WHERE sa.staff_id = :staff_id AND a.is_archived = 0";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':staff_id', $staff['id'], PDO::PARAM_INT);
                $stmt->execute();
                $allowances = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Get staff-specific deductions
                $query = "SELECT sd.*, d.deduction_name, d.default_amount, d.is_percentage
                          FROM staff_deductions sd
                          JOIN deductions d ON sd.deduction_id = d.id
                          WHERE sd.staff_id = :staff_id AND d.is_archived = 0";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':staff_id', $staff['id'], PDO::PARAM_INT);
                $stmt->execute();
                $deductions = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $staff_data[] = [
                    'staff' => $staff,
                    'allowances' => $allowances,
                    'deductions' => $deductions
                ];
            }

            error_log("[PAYROLL] Loaded " . count($eligible_staff) . " eligible staff for period {$period_id}");
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'entries_exist' => false,
                'data' => $staff_data,
                'message' => 'Eligible staff loaded for new payroll entries'
            ]);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    error_log("[PAYROLL ERROR] Load entries: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
