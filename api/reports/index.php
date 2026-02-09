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
        $adminOnlyReports = ['payroll_summary', 'department_payroll', 'yearly_comparison', 'staff_history', 'allowances_deductions', 'gross_salary', 'deductions_report', 'ssnit_paye_eligible'];
        if (in_array($type, $adminOnlyReports, true)) {
            requireAdmin($user);
        }

        // Get department filter if provided
        $departmentId = isset($_GET['department_id']) ? $_GET['department_id'] : null;
        
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
                      WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $query .= " AND s.department_id = :department_id";
            }

            $query .= " ORDER BY d.department_name, s.last_name, s.first_name";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            if ($departmentId) {
                $stmt->bindParam(':department_id', $departmentId);
            }
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

        else if ($type === 'gross_salary') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            // First get all allowance types for this period to build dynamic columns
            $allowanceTypesQuery = "SELECT DISTINCT a.id, a.allowance_name
                                    FROM allowances a
                                    JOIN payroll_allowances pa ON a.id = pa.allowance_id
                                    JOIN payroll_entries pe ON pa.payroll_entry_id = pe.id
                                    JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                                    WHERE pp.month = :month AND pp.year = :year
                                    ORDER BY a.allowance_name";
            $allowanceTypesStmt = $db->prepare($allowanceTypesQuery);
            $allowanceTypesStmt->bindParam(':month', $month);
            $allowanceTypesStmt->bindParam(':year', $year);
            $allowanceTypesStmt->execute();
            $allowanceTypes = $allowanceTypesStmt->fetchAll();

            // Get staff payroll data with basic salary
            $staffQuery = "SELECT
                            pe.id as payroll_entry_id,
                            s.staff_number,
                            CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                            d.department_name,
                            des.designation_name,
                            pe.basic_salary,
                            pe.gross_salary
                          FROM payroll_entries pe
                          JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                          JOIN staffs s ON pe.staff_id = s.id
                          LEFT JOIN departments d ON s.department_id = d.id
                          LEFT JOIN designations des ON s.designation_id = des.id
                          WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $staffQuery .= " AND s.department_id = :department_id";
            }

            $staffQuery .= " ORDER BY d.department_name, s.last_name, s.first_name";

            $staffStmt = $db->prepare($staffQuery);
            $staffStmt->bindParam(':month', $month);
            $staffStmt->bindParam(':year', $year);
            if ($departmentId) {
                $staffStmt->bindParam(':department_id', $departmentId);
            }
            $staffStmt->execute();
            $staffList = $staffStmt->fetchAll();

            // Get all allowances for each staff
            $allowancesQuery = "SELECT pa.payroll_entry_id, pa.allowance_id, pa.amount
                               FROM payroll_allowances pa
                               JOIN payroll_entries pe ON pa.payroll_entry_id = pe.id
                               JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                               WHERE pp.month = :month AND pp.year = :year";
            $allowancesStmt = $db->prepare($allowancesQuery);
            $allowancesStmt->bindParam(':month', $month);
            $allowancesStmt->bindParam(':year', $year);
            $allowancesStmt->execute();
            $allAllowances = $allowancesStmt->fetchAll();

            // Create a lookup map for allowances by payroll_entry_id and allowance_id
            $allowanceMap = [];
            foreach ($allAllowances as $pa) {
                $key = $pa['payroll_entry_id'] . '_' . $pa['allowance_id'];
                $allowanceMap[$key] = $pa['amount'];
            }

            // Build entries with allowance columns
            $entries = [];
            $totals = [
                'basic_salary' => 0,
                'gross_salary' => 0,
                'allowances' => []
            ];

            // Initialize allowance totals
            foreach ($allowanceTypes as $at) {
                $totals['allowances'][$at['id']] = 0;
            }

            foreach ($staffList as $staff) {
                $entry = [
                    'staff_number' => $staff['staff_number'],
                    'staff_name' => $staff['staff_name'],
                    'department_name' => $staff['department_name'],
                    'designation_name' => $staff['designation_name'],
                    'basic_salary' => $staff['basic_salary'],
                    'gross_salary' => $staff['gross_salary'],
                    'allowances' => []
                ];

                $totals['basic_salary'] += floatval($staff['basic_salary']);
                $totals['gross_salary'] += floatval($staff['gross_salary']);

                // Add each allowance amount
                foreach ($allowanceTypes as $at) {
                    $key = $staff['payroll_entry_id'] . '_' . $at['id'];
                    $amount = isset($allowanceMap[$key]) ? floatval($allowanceMap[$key]) : 0;
                    $entry['allowances'][$at['id']] = $amount;
                    $totals['allowances'][$at['id']] += $amount;
                }

                $entries[] = $entry;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'allowance_types' => $allowanceTypes,
                    'totals' => $totals,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        }

        else if ($type === 'deductions_report') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            // First get all deduction types for this period to build dynamic columns
            $deductionTypesQuery = "SELECT DISTINCT d.id, d.deduction_name
                                    FROM deductions d
                                    JOIN payroll_deductions pd ON d.id = pd.deduction_id
                                    JOIN payroll_entries pe ON pd.payroll_entry_id = pe.id
                                    JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                                    WHERE pp.month = :month AND pp.year = :year
                                    ORDER BY d.deduction_name";
            $deductionTypesStmt = $db->prepare($deductionTypesQuery);
            $deductionTypesStmt->bindParam(':month', $month);
            $deductionTypesStmt->bindParam(':year', $year);
            $deductionTypesStmt->execute();
            $deductionTypes = $deductionTypesStmt->fetchAll();

            // Get staff payroll data
            $staffQuery = "SELECT
                            pe.id as payroll_entry_id,
                            s.staff_number,
                            CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                            d.department_name,
                            des.designation_name,
                            pe.total_deductions
                          FROM payroll_entries pe
                          JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                          JOIN staffs s ON pe.staff_id = s.id
                          LEFT JOIN departments d ON s.department_id = d.id
                          LEFT JOIN designations des ON s.designation_id = des.id
                          WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $staffQuery .= " AND s.department_id = :department_id";
            }

            $staffQuery .= " ORDER BY d.department_name, s.last_name, s.first_name";

            $staffStmt = $db->prepare($staffQuery);
            $staffStmt->bindParam(':month', $month);
            $staffStmt->bindParam(':year', $year);
            if ($departmentId) {
                $staffStmt->bindParam(':department_id', $departmentId);
            }
            $staffStmt->execute();
            $staffList = $staffStmt->fetchAll();

            // Get all deductions for each staff
            $deductionsQuery = "SELECT pd.payroll_entry_id, pd.deduction_id, pd.amount
                               FROM payroll_deductions pd
                               JOIN payroll_entries pe ON pd.payroll_entry_id = pe.id
                               JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                               WHERE pp.month = :month AND pp.year = :year";
            $deductionsStmt = $db->prepare($deductionsQuery);
            $deductionsStmt->bindParam(':month', $month);
            $deductionsStmt->bindParam(':year', $year);
            $deductionsStmt->execute();
            $allDeductions = $deductionsStmt->fetchAll();

            // Create a lookup map for deductions by payroll_entry_id and deduction_id
            $deductionMap = [];
            foreach ($allDeductions as $pd) {
                $key = $pd['payroll_entry_id'] . '_' . $pd['deduction_id'];
                $deductionMap[$key] = $pd['amount'];
            }

            // Build entries with deduction columns
            $entries = [];
            $totals = [
                'total_deductions' => 0,
                'deductions' => []
            ];

            // Initialize deduction totals
            foreach ($deductionTypes as $dt) {
                $totals['deductions'][$dt['id']] = 0;
            }

            foreach ($staffList as $staff) {
                $entry = [
                    'staff_number' => $staff['staff_number'],
                    'staff_name' => $staff['staff_name'],
                    'department_name' => $staff['department_name'],
                    'designation_name' => $staff['designation_name'],
                    'total_deductions' => $staff['total_deductions'],
                    'deductions' => []
                ];

                $totals['total_deductions'] += floatval($staff['total_deductions']);

                // Add each deduction amount
                foreach ($deductionTypes as $dt) {
                    $key = $staff['payroll_entry_id'] . '_' . $dt['id'];
                    $amount = isset($deductionMap[$key]) ? floatval($deductionMap[$key]) : 0;
                    $entry['deductions'][$dt['id']] = $amount;
                    $totals['deductions'][$dt['id']] += $amount;
                }

                $entries[] = $entry;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'deduction_types' => $deductionTypes,
                    'totals' => $totals,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        }

        else if ($type === 'ssnit_paye_eligible') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            // Get staff who have SSNIT or PAYE (Income Tax) deductions in the given period
            $query = "SELECT
                        s.staff_number,
                        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                        d.department_name,
                        des.designation_name,
                        s.ssnit as ssnit_number,
                        pe.basic_salary,
                        pe.gross_salary,
                        ded.deduction_name,
                        pd.amount as deduction_amount
                      FROM payroll_entries pe
                      JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      JOIN payroll_deductions pd ON pe.id = pd.payroll_entry_id
                      JOIN deductions ded ON pd.deduction_id = ded.id
                      WHERE pp.month = :month AND pp.year = :year
                        AND (LOWER(ded.deduction_name) LIKE '%ssnit%'
                             OR LOWER(ded.deduction_name) LIKE '%paye%'
                             OR LOWER(ded.deduction_name) LIKE '%income tax%'
                             OR LOWER(ded.deduction_name) LIKE '%tier%')";

            if ($departmentId) {
                $query .= " AND s.department_id = :department_id";
            }

            $query .= " ORDER BY d.department_name, s.last_name, s.first_name, ded.deduction_name";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            if ($departmentId) {
                $stmt->bindParam(':department_id', $departmentId);
            }
            $stmt->execute();
            $results = $stmt->fetchAll();

            // Group by staff and separate SSNIT and PAYE deductions
            $staffMap = [];
            foreach ($results as $row) {
                $staffKey = $row['staff_number'];
                if (!isset($staffMap[$staffKey])) {
                    $staffMap[$staffKey] = [
                        'staff_number' => $row['staff_number'],
                        'staff_name' => $row['staff_name'],
                        'department_name' => $row['department_name'],
                        'designation_name' => $row['designation_name'],
                        'ssnit_number' => $row['ssnit_number'],
                        'basic_salary' => $row['basic_salary'],
                        'gross_salary' => $row['gross_salary'],
                        'ssnit_deductions' => [],
                        'paye_deductions' => []
                    ];
                }

                $deductionLower = strtolower($row['deduction_name']);
                if (strpos($deductionLower, 'ssnit') !== false || strpos($deductionLower, 'tier') !== false) {
                    $staffMap[$staffKey]['ssnit_deductions'][] = [
                        'name' => $row['deduction_name'],
                        'amount' => $row['deduction_amount']
                    ];
                } else {
                    $staffMap[$staffKey]['paye_deductions'][] = [
                        'name' => $row['deduction_name'],
                        'amount' => $row['deduction_amount']
                    ];
                }
            }

            $entries = array_values($staffMap);

            // Calculate totals
            $totalSsnit = 0;
            $totalPaye = 0;
            foreach ($entries as $entry) {
                foreach ($entry['ssnit_deductions'] as $ded) {
                    $totalSsnit += floatval($ded['amount']);
                }
                foreach ($entry['paye_deductions'] as $ded) {
                    $totalPaye += floatval($ded['amount']);
                }
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'totals' => [
                        'ssnit' => $totalSsnit,
                        'paye' => $totalPaye,
                        'count' => count($entries)
                    ],
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
