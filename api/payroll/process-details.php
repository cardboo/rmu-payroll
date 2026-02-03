<?php
// API endpoint to fetch detailed payroll breakdown for an employee
// Used by the Process Payroll modal to display calculated amounts
include_once '../config/cors.php';
include_once '../config/database.php';
include_once '../middleware/auth.php';
include_once '../config/error-logger.php';

try {
    $user = authenticate();

    $database = new Database();
    $db = $database->getConnection();

    // GET - Fetch payroll details for a staff in a period (for calculation preview)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!isset($_GET['staff_id']) || !isset($_GET['period_month']) || !isset($_GET['period_year'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'staff_id, period_month, and period_year are required']);
            exit();
        }

        $staffId = $_GET['staff_id'];
        $month = $_GET['period_month'];
        $year = $_GET['period_year'];

        $staffQuery = "SELECT s.*, d.department_name, des.designation_name 
                      FROM staffs s
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      WHERE s.id = :staff_id";
        $staffStmt = $db->prepare($staffQuery);
        $staffStmt->bindParam(':staff_id', $staffId);
        $staffStmt->execute();
        $staff = $staffStmt->fetch();

        if (!$staff) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Staff not found']);
            exit();
        }

        $rateQuery = "SELECT rate FROM currency_rates WHERE is_active = 1 LIMIT 1";
        $rateStmt = $db->query($rateQuery);
        $rateData = $rateStmt->fetch();
        $exchangeRate = $rateData['rate'] ?? 1.0;

        $basicSalary = $staff['basic_salary'];
        if ($staff['salary_currency'] === 'USD') {
            $basicSalaryLocal = $basicSalary * $exchangeRate;
        } else {
            $basicSalaryLocal = $basicSalary;
        }

        $allowanceQuery = "SELECT
                            a.id,
                            a.allowance_name,
                            a.is_percentage,
                            a.default_amount,
                            COALESCE(sa.amount, a.default_amount) as amount,
                            sa.is_percentage as staff_is_percentage,
                            'assigned' as source
                          FROM allowances a
                          INNER JOIN staff_allowances sa ON a.id = sa.allowance_id
                          WHERE sa.staff_id = :staff_id
                          AND a.is_archived = 0";

        $allowStmt = $db->prepare($allowanceQuery);
        $allowStmt->bindParam(':staff_id', $staffId);
        $allowStmt->execute();
        $allowances = $allowStmt->fetchAll();

        // Calculate allowance amounts
        $totalAllowances = 0;
        foreach ($allowances as &$allowance) {
            // Use staff-specific is_percentage if set, otherwise use allowance default
            $isPercentage = $allowance['staff_is_percentage'] !== null
                ? (bool)$allowance['staff_is_percentage']
                : (bool)$allowance['is_percentage'];

            if ($isPercentage) {
                $allowance['calculated_amount'] = ($basicSalaryLocal * $allowance['amount']) / 100;
            } else {
                $allowance['calculated_amount'] = (float)$allowance['amount'];
            }
            $totalAllowances += $allowance['calculated_amount'];
        }

        $deductionQuery = "SELECT
                            d.id,
                            d.deduction_name,
                            d.is_percentage,
                            d.default_amount,
                            COALESCE(sd.amount, d.default_amount) as amount,
                            sd.is_percentage as staff_is_percentage,
                            'assigned' as source
                          FROM deductions d
                          INNER JOIN staff_deductions sd ON d.id = sd.deduction_id
                          WHERE sd.staff_id = :staff_id AND d.is_archived = 0";

        $deductStmt = $db->prepare($deductionQuery);
        $deductStmt->bindParam(':staff_id', $staffId);
        $deductStmt->execute();
        $deductions = $deductStmt->fetchAll();

        // Calculate deduction amounts
        $totalDeductions = 0;
        foreach ($deductions as &$deduction) {
            // Use staff-specific is_percentage if set, otherwise use deduction default
            $isPercentage = $deduction['staff_is_percentage'] !== null
                ? (bool)$deduction['staff_is_percentage']
                : (bool)$deduction['is_percentage'];

            if ($isPercentage) {
                $deduction['calculated_amount'] = ($basicSalaryLocal * $deduction['amount']) / 100;
            } else {
                $deduction['calculated_amount'] = (float)$deduction['amount'];
            }
            $totalDeductions += $deduction['calculated_amount'];
        }

        // Calculate final amounts
        $grossSalary = $basicSalaryLocal + $totalAllowances;
        $netSalary = $grossSalary - $totalDeductions;

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'staff' => $staff,
                'salary_currency' => $staff['salary_currency'],
                'basic_salary' => $basicSalary,
                'basic_salary_local' => $basicSalaryLocal,
                'exchange_rate' => $exchangeRate,
                'allowances' => $allowances,
                'total_allowances' => $totalAllowances,
                'deductions' => $deductions,
                'total_deductions' => $totalDeductions,
                'gross_salary' => $grossSalary,
                'net_salary' => $netSalary,
                'period' => ['month' => $month, 'year' => $year]
            ]
        ]);
    }
} catch (Exception $e) {
    ErrorLogger::logError($e, ['endpoint' => 'payroll/process-details']);
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>
