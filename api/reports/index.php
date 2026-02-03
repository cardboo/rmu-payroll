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
        $type = isset($_GET['type']) ? $_GET['type'] : 'dashboard';

        // Reports with sensitive payroll data require admin access
        $adminOnlyReports = ['payroll_summary', 'department_payroll', 'yearly_comparison', 'staff_history', 'allowances_deductions'];
        if (in_array($type, $adminOnlyReports, true)) {
            requireAdmin($user);
        }
        
        if ($type === 'dashboard') {
            // Get dashboard statistics
            
            // Total staff
            $staffQuery = "SELECT COUNT(*) as total FROM staffs WHERE is_archived = 0";
            $staffStmt = $db->query($staffQuery);
            $totalStaff = $staffStmt->fetch()['total'];
            
            // Total departments
            $deptQuery = "SELECT COUNT(*) as total FROM departments WHERE is_archived = 0";
            $deptStmt = $db->query($deptQuery);
            $totalDepartments = $deptStmt->fetch()['total'];
            
            // Active users
            $userQuery = "SELECT COUNT(*) as total FROM users WHERE is_active = 1";
            $userStmt = $db->query($userQuery);
            $activeUsers = $userStmt->fetch()['total'];
            
            // Current month payroll
            $currentMonth = date('n');
            $currentYear = date('Y');
            
            $payrollQuery = "SELECT COALESCE(SUM(pe.net_salary_ghs), 0) as total 
                            FROM payroll_entries pe
                            JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                            WHERE pp.month = :month AND pp.year = :year";
            $payrollStmt = $db->prepare($payrollQuery);
            $payrollStmt->bindParam(':month', $currentMonth);
            $payrollStmt->bindParam(':year', $currentYear);
            $payrollStmt->execute();
            $monthlyPayroll = $payrollStmt->fetch()['total'];
            
            // Recent activity
            $activityQuery = "SELECT al.*, u.full_name as user_name 
                             FROM audit_logs al
                             LEFT JOIN users u ON al.user_id = u.id
                             ORDER BY al.created_at DESC
                             LIMIT 10";
            $activityStmt = $db->query($activityQuery);
            $recentActivity = $activityStmt->fetchAll();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'total_staff' => $totalStaff,
                    'total_departments' => $totalDepartments,
                    'active_users' => $activeUsers,
                    'monthly_payroll' => number_format($monthlyPayroll, 2, '.', ''),
                    'recent_activity' => $recentActivity
                ]
            ]);
        }
        
        else if ($type === 'payroll_summary') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
            
            $query = "SELECT 
                        pe.id,
                        s.staff_number,
                        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                        d.department_name,
                        des.designation_name,
                        pe.basic_salary,
                        pe.total_allowances,
                        pe.total_deductions,
                        pe.gross_salary,
                        pe.net_salary,
                        pe.net_salary_ghs,
                        pe.currency_rate,
                        s.bank_name,
                        s.account_number
                      FROM payroll_entries pe
                      JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      WHERE pp.month = :month AND pp.year = :year
                      ORDER BY d.department_name, s.last_name, s.first_name";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            $stmt->execute();
            
            $entries = $stmt->fetchAll();
            
            // Calculate totals
            $totalBasic = 0;
            $totalAllowances = 0;
            $totalDeductions = 0;
            $totalGross = 0;
            $totalNet = 0;
            $totalNetGHS = 0;
            
            foreach ($entries as $entry) {
                $totalBasic += $entry['basic_salary'];
                $totalAllowances += $entry['total_allowances'];
                $totalDeductions += $entry['total_deductions'];
                $totalGross += $entry['gross_salary'];
                $totalNet += $entry['net_salary'];
                $totalNetGHS += $entry['net_salary_ghs'];
            }
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'totals' => [
                        'basic_salary' => $totalBasic,
                        'total_allowances' => $totalAllowances,
                        'total_deductions' => $totalDeductions,
                        'gross_salary' => $totalGross,
                        'net_salary' => $totalNet,
                        'net_salary_ghs' => $totalNetGHS,
                        'count' => count($entries)
                    ],
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        }
        
        else if ($type === 'department_payroll') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
            
            $query = "SELECT 
                        d.department_name,
                        COUNT(pe.id) as staff_count,
                        SUM(pe.basic_salary) as total_basic,
                        SUM(pe.total_allowances) as total_allowances,
                        SUM(pe.total_deductions) as total_deductions,
                        SUM(pe.gross_salary) as total_gross,
                        SUM(pe.net_salary) as total_net,
                        SUM(pe.net_salary_ghs) as total_net_ghs
                      FROM payroll_entries pe
                      JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      WHERE pp.month = :month AND pp.year = :year
                      GROUP BY d.id, d.department_name
                      ORDER BY total_net_ghs DESC";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            $stmt->execute();
            
            $departments = $stmt->fetchAll();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'departments' => $departments,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        }
        
        else if ($type === 'yearly_comparison') {
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
            
            $query = "SELECT 
                        pp.month,
                        pp.year,
                        COUNT(pe.id) as staff_count,
                        SUM(pe.net_salary_ghs) as total_payroll
                      FROM payroll_periods pp
                      LEFT JOIN payroll_entries pe ON pp.id = pe.payroll_period_id
                      WHERE pp.year = :year
                      GROUP BY pp.id, pp.month, pp.year
                      ORDER BY pp.month";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':year', $year);
            $stmt->execute();
            
            $months = $stmt->fetchAll();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'months' => $months,
                    'year' => $year
                ]
            ]);
        }
        
        else if ($type === 'staff_history') {
            $staffId = isset($_GET['staff_id']) ? $_GET['staff_id'] : null;
            
            if (!$staffId) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Staff ID is required'
                ]);
                exit();
            }
            
            $query = "SELECT 
                        pp.month,
                        pp.year,
                        pe.basic_salary,
                        pe.total_allowances,
                        pe.total_deductions,
                        pe.gross_salary,
                        pe.net_salary,
                        pe.net_salary_ghs,
                        pe.currency_rate
                      FROM payroll_entries pe
                      JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                      WHERE pe.staff_id = :staff_id
                      ORDER BY pp.year DESC, pp.month DESC";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':staff_id', $staffId);
            $stmt->execute();
            
            $history = $stmt->fetchAll();
            
            // Get staff details
            $staffQuery = "SELECT s.*, d.department_name, des.designation_name
                           FROM staffs s
                           LEFT JOIN departments d ON s.department_id = d.id
                           LEFT JOIN designations des ON s.designation_id = des.id
                           WHERE s.id = :staff_id";
            $staffStmt = $db->prepare($staffQuery);
            $staffStmt->bindParam(':staff_id', $staffId);
            $staffStmt->execute();
            $staff = $staffStmt->fetch();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'staff' => $staff,
                    'history' => $history
                ]
            ]);
        }
        
        else if ($type === 'allowances_deductions') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');
            
            // Get allowances breakdown
            $allowQuery = "SELECT 
                            a.allowance_name,
                            COUNT(pa.id) as usage_count,
                            SUM(pa.amount) as total_amount
                          FROM payroll_allowances pa
                          JOIN allowances a ON pa.allowance_id = a.id
                          JOIN payroll_entries pe ON pa.payroll_entry_id = pe.id
                          JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                          WHERE pp.month = :month AND pp.year = :year
                          GROUP BY a.id, a.allowance_name
                          ORDER BY total_amount DESC";
            
            $allowStmt = $db->prepare($allowQuery);
            $allowStmt->bindParam(':month', $month);
            $allowStmt->bindParam(':year', $year);
            $allowStmt->execute();
            $allowances = $allowStmt->fetchAll();
            
            // Get deductions breakdown
            $deductQuery = "SELECT 
                             d.deduction_name,
                             COUNT(pd.id) as usage_count,
                             SUM(pd.amount) as total_amount
                           FROM payroll_deductions pd
                           JOIN deductions d ON pd.deduction_id = d.id
                           JOIN payroll_entries pe ON pd.payroll_entry_id = pe.id
                           JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                           WHERE pp.month = :month AND pp.year = :year
                           GROUP BY d.id, d.deduction_name
                           ORDER BY total_amount DESC";
            
            $deductStmt = $db->prepare($deductQuery);
            $deductStmt->bindParam(':month', $month);
            $deductStmt->bindParam(':year', $year);
            $deductStmt->execute();
            $deductions = $deductStmt->fetchAll();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'allowances' => $allowances,
                    'deductions' => $deductions,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        }
    }
} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'reports',
        'report_type' => $_GET['type'] ?? 'N/A'
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'reports',
        'report_type' => $_GET['type'] ?? 'N/A'
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
?>
