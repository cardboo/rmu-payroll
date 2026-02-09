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

        // Get staff status filter if provided (permanent/contract)
        $staffStatus = isset($_GET['staff_status']) ? $_GET['staff_status'] : null;

        // Get current active currency rate for USD to GHS conversion
        $currencyRate = 1.0;
        $rateQuery = "SELECT rate FROM currency_rates WHERE is_active = 1 ORDER BY effective_date DESC LIMIT 1";
        $rateStmt = $db->query($rateQuery);
        $rateData = $rateStmt->fetch();
        if ($rateData) {
            $currencyRate = floatval($rateData['rate']);
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
        } else if ($type === 'payroll_summary') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            $query = "SELECT
                        pe.id,
                        s.staff_number,
                        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                        d.department_name,
                        des.designation_name,
                        s.status as staff_status,
                        s.salary_currency,
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
            if ($staffStatus) {
                $query .= " AND s.status = :staff_status";
            }

            $query .= " ORDER BY d.department_name, s.last_name, s.first_name";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            if ($departmentId) {
                $stmt->bindParam(':department_id', $departmentId);
            }
            if ($staffStatus) {
                $stmt->bindParam(':staff_status', $staffStatus);
            }
            $stmt->execute();

            $rawEntries = $stmt->fetchAll();

            // Process entries with currency conversion
            $entries = [];
            $totalBasicGhs = 0;
            $totalAllowancesGhs = 0;
            $totalDeductionsGhs = 0;
            $totalGrossGhs = 0;
            $totalNetGhs = 0;

            foreach ($rawEntries as $entry) {
                $isUsd = $entry['salary_currency'] === 'USD';
                $entryRate = floatval($entry['currency_rate']) ?: $currencyRate;

                $basicSalaryOriginal = floatval($entry['basic_salary']);
                $allowancesOriginal = floatval($entry['total_allowances']);
                $deductionsOriginal = floatval($entry['total_deductions']);
                $grossOriginal = floatval($entry['gross_salary']);
                $netOriginal = floatval($entry['net_salary']);

                $basicSalaryGhs = $isUsd ? $basicSalaryOriginal * $entryRate : $basicSalaryOriginal;
                $allowancesGhs = $isUsd ? $allowancesOriginal * $entryRate : $allowancesOriginal;
                $deductionsGhs = $isUsd ? $deductionsOriginal * $entryRate : $deductionsOriginal;
                $grossGhs = $isUsd ? $grossOriginal * $entryRate : $grossOriginal;
                $netGhs = floatval($entry['net_salary_ghs']);

                $entries[] = [
                    'id' => $entry['id'],
                    'staff_number' => $entry['staff_number'],
                    'staff_name' => $entry['staff_name'],
                    'department_name' => $entry['department_name'],
                    'designation_name' => $entry['designation_name'],
                    'staff_status' => $entry['staff_status'],
                    'salary_currency' => $entry['salary_currency'],
                    'basic_salary_original' => $basicSalaryOriginal,
                    'basic_salary_ghs' => $basicSalaryGhs,
                    'total_allowances_original' => $allowancesOriginal,
                    'total_allowances_ghs' => $allowancesGhs,
                    'total_deductions_original' => $deductionsOriginal,
                    'total_deductions_ghs' => $deductionsGhs,
                    'gross_salary_original' => $grossOriginal,
                    'gross_salary_ghs' => $grossGhs,
                    'net_salary_original' => $netOriginal,
                    'net_salary_ghs' => $netGhs,
                    'currency_rate' => $entryRate,
                    'bank_name' => $entry['bank_name'],
                    'account_number' => $entry['account_number']
                ];

                $totalBasicGhs += $basicSalaryGhs;
                $totalAllowancesGhs += $allowancesGhs;
                $totalDeductionsGhs += $deductionsGhs;
                $totalGrossGhs += $grossGhs;
                $totalNetGhs += $netGhs;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'totals' => [
                        'basic_salary_ghs' => $totalBasicGhs,
                        'total_allowances_ghs' => $totalAllowancesGhs,
                        'total_deductions_ghs' => $totalDeductionsGhs,
                        'gross_salary_ghs' => $totalGrossGhs,
                        'net_salary_ghs' => $totalNetGhs,
                        'count' => count($entries)
                    ],
                    'currency_rate' => $currencyRate,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        } else if ($type === 'department_payroll') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            // Get individual entries to handle currency conversion properly
            $query = "SELECT
                        d.id as department_id,
                        d.department_name,
                        s.salary_currency,
                        pe.basic_salary,
                        pe.total_allowances,
                        pe.total_deductions,
                        pe.gross_salary,
                        pe.net_salary,
                        pe.net_salary_ghs,
                        pe.currency_rate
                      FROM payroll_entries pe
                      JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      WHERE pp.month = :month AND pp.year = :year
                      ORDER BY d.department_name";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            $stmt->execute();
            $entries = $stmt->fetchAll();

            // Aggregate by department with currency conversion
            $deptMap = [];
            foreach ($entries as $entry) {
                $deptId = $entry['department_id'] ?: 'unassigned';
                $deptName = $entry['department_name'] ?: 'Unassigned';
                $isUsd = $entry['salary_currency'] === 'USD';
                $entryRate = floatval($entry['currency_rate']) ?: $currencyRate;

                if (!isset($deptMap[$deptId])) {
                    $deptMap[$deptId] = [
                        'department_name' => $deptName,
                        'staff_count' => 0,
                        'total_basic_ghs' => 0,
                        'total_allowances_ghs' => 0,
                        'total_deductions_ghs' => 0,
                        'total_gross_ghs' => 0,
                        'total_net_ghs' => 0
                    ];
                }

                $deptMap[$deptId]['staff_count']++;
                $deptMap[$deptId]['total_basic_ghs'] += $isUsd ? floatval($entry['basic_salary']) * $entryRate : floatval($entry['basic_salary']);
                $deptMap[$deptId]['total_allowances_ghs'] += $isUsd ? floatval($entry['total_allowances']) * $entryRate : floatval($entry['total_allowances']);
                $deptMap[$deptId]['total_deductions_ghs'] += $isUsd ? floatval($entry['total_deductions']) * $entryRate : floatval($entry['total_deductions']);
                $deptMap[$deptId]['total_gross_ghs'] += $isUsd ? floatval($entry['gross_salary']) * $entryRate : floatval($entry['gross_salary']);
                $deptMap[$deptId]['total_net_ghs'] += floatval($entry['net_salary_ghs']);
            }

            // Convert to array and sort by net salary descending
            $departments = array_values($deptMap);
            usort($departments, function($a, $b) {
                return $b['total_net_ghs'] <=> $a['total_net_ghs'];
            });

            // Calculate grand totals
            $grandTotals = [
                'staff_count' => 0,
                'total_basic_ghs' => 0,
                'total_allowances_ghs' => 0,
                'total_deductions_ghs' => 0,
                'total_gross_ghs' => 0,
                'total_net_ghs' => 0
            ];
            foreach ($departments as $dept) {
                $grandTotals['staff_count'] += $dept['staff_count'];
                $grandTotals['total_basic_ghs'] += $dept['total_basic_ghs'];
                $grandTotals['total_allowances_ghs'] += $dept['total_allowances_ghs'];
                $grandTotals['total_deductions_ghs'] += $dept['total_deductions_ghs'];
                $grandTotals['total_gross_ghs'] += $dept['total_gross_ghs'];
                $grandTotals['total_net_ghs'] += $dept['total_net_ghs'];
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'departments' => $departments,
                    'totals' => $grandTotals,
                    'currency_rate' => $currencyRate,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        } else if ($type === 'yearly_comparison') {
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
        } else if ($type === 'staff_history') {
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
        } else if ($type === 'allowances_deductions') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            // Get allowances with currency info for proper conversion
            $allowQuery = "SELECT
                            a.id as allowance_id,
                            a.allowance_name,
                            pa.amount,
                            s.salary_currency,
                            pe.currency_rate
                          FROM payroll_allowances pa
                          JOIN allowances a ON pa.allowance_id = a.id
                          JOIN payroll_entries pe ON pa.payroll_entry_id = pe.id
                          JOIN staffs s ON pe.staff_id = s.id
                          JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                          WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $allowQuery .= " AND s.department_id = :department_id";
            }
            if ($staffStatus) {
                $allowQuery .= " AND s.status = :staff_status";
            }

            $allowStmt = $db->prepare($allowQuery);
            $allowStmt->bindParam(':month', $month);
            $allowStmt->bindParam(':year', $year);
            if ($departmentId) {
                $allowStmt->bindParam(':department_id', $departmentId);
            }
            if ($staffStatus) {
                $allowStmt->bindParam(':staff_status', $staffStatus);
            }
            $allowStmt->execute();
            $allowanceEntries = $allowStmt->fetchAll();

            // Aggregate allowances with currency conversion
            $allowanceMap = [];
            foreach ($allowanceEntries as $entry) {
                $id = $entry['allowance_id'];
                $name = $entry['allowance_name'];
                $isUsd = $entry['salary_currency'] === 'USD';
                $entryRate = floatval($entry['currency_rate']) ?: $currencyRate;
                $amountGhs = $isUsd ? floatval($entry['amount']) * $entryRate : floatval($entry['amount']);

                if (!isset($allowanceMap[$id])) {
                    $allowanceMap[$id] = [
                        'allowance_name' => $name,
                        'usage_count' => 0,
                        'total_amount_ghs' => 0
                    ];
                }
                $allowanceMap[$id]['usage_count']++;
                $allowanceMap[$id]['total_amount_ghs'] += $amountGhs;
            }

            $allowances = array_values($allowanceMap);
            usort($allowances, function($a, $b) {
                return $b['total_amount_ghs'] <=> $a['total_amount_ghs'];
            });

            // Get deductions with currency info for proper conversion
            $deductQuery = "SELECT
                             d.id as deduction_id,
                             d.deduction_name,
                             pd.amount,
                             s.salary_currency,
                             pe.currency_rate
                           FROM payroll_deductions pd
                           JOIN deductions d ON pd.deduction_id = d.id
                           JOIN payroll_entries pe ON pd.payroll_entry_id = pe.id
                           JOIN staffs s ON pe.staff_id = s.id
                           JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                           WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $deductQuery .= " AND s.department_id = :department_id";
            }
            if ($staffStatus) {
                $deductQuery .= " AND s.status = :staff_status";
            }

            $deductStmt = $db->prepare($deductQuery);
            $deductStmt->bindParam(':month', $month);
            $deductStmt->bindParam(':year', $year);
            if ($departmentId) {
                $deductStmt->bindParam(':department_id', $departmentId);
            }
            if ($staffStatus) {
                $deductStmt->bindParam(':staff_status', $staffStatus);
            }
            $deductStmt->execute();
            $deductionEntries = $deductStmt->fetchAll();

            // Aggregate deductions with currency conversion
            $deductionMap = [];
            foreach ($deductionEntries as $entry) {
                $id = $entry['deduction_id'];
                $name = $entry['deduction_name'];
                $isUsd = $entry['salary_currency'] === 'USD';
                $entryRate = floatval($entry['currency_rate']) ?: $currencyRate;
                $amountGhs = $isUsd ? floatval($entry['amount']) * $entryRate : floatval($entry['amount']);

                if (!isset($deductionMap[$id])) {
                    $deductionMap[$id] = [
                        'deduction_name' => $name,
                        'usage_count' => 0,
                        'total_amount_ghs' => 0
                    ];
                }
                $deductionMap[$id]['usage_count']++;
                $deductionMap[$id]['total_amount_ghs'] += $amountGhs;
            }

            $deductions = array_values($deductionMap);
            usort($deductions, function($a, $b) {
                return $b['total_amount_ghs'] <=> $a['total_amount_ghs'];
            });

            // Calculate totals
            $totalAllowancesGhs = array_sum(array_column($allowances, 'total_amount_ghs'));
            $totalDeductionsGhs = array_sum(array_column($deductions, 'total_amount_ghs'));

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'allowances' => $allowances,
                    'deductions' => $deductions,
                    'totals' => [
                        'allowances_ghs' => $totalAllowancesGhs,
                        'deductions_ghs' => $totalDeductionsGhs
                    ],
                    'currency_rate' => $currencyRate,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        } else if ($type === 'gross_salary') {
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

            // Get staff payroll data with basic salary and currency
            $staffQuery = "SELECT
                            pe.id as payroll_entry_id,
                            s.staff_number,
                            CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                            d.department_name,
                            des.designation_name,
                            s.status as staff_status,
                            s.salary_currency,
                            pe.basic_salary,
                            pe.gross_salary,
                            pe.currency_rate
                          FROM payroll_entries pe
                          JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                          JOIN staffs s ON pe.staff_id = s.id
                          LEFT JOIN departments d ON s.department_id = d.id
                          LEFT JOIN designations des ON s.designation_id = des.id
                          WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $staffQuery .= " AND s.department_id = :department_id";
            }
            if ($staffStatus) {
                $staffQuery .= " AND s.status = :staff_status";
            }

            $staffQuery .= " ORDER BY d.department_name, s.last_name, s.first_name";

            $staffStmt = $db->prepare($staffQuery);
            $staffStmt->bindParam(':month', $month);
            $staffStmt->bindParam(':year', $year);
            if ($departmentId) {
                $staffStmt->bindParam(':department_id', $departmentId);
            }
            if ($staffStatus) {
                $staffStmt->bindParam(':staff_status', $staffStatus);
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
                'basic_salary_ghs' => 0,
                'gross_salary_ghs' => 0,
                'allowances' => []
            ];

            // Initialize allowance totals
            foreach ($allowanceTypes as $at) {
                $totals['allowances'][$at['id']] = 0;
            }

            foreach ($staffList as $staff) {
                $isUsd = $staff['salary_currency'] === 'USD';
                $entryRate = floatval($staff['currency_rate']) ?: $currencyRate;

                // Original amounts (in original currency)
                $basicSalaryOriginal = floatval($staff['basic_salary']);
                $grossSalaryOriginal = floatval($staff['gross_salary']);

                // Converted to GHS
                $basicSalaryGhs = $isUsd ? $basicSalaryOriginal * $entryRate : $basicSalaryOriginal;
                $grossSalaryGhs = $isUsd ? $grossSalaryOriginal * $entryRate : $grossSalaryOriginal;

                $entry = [
                    'staff_number' => $staff['staff_number'],
                    'staff_name' => $staff['staff_name'],
                    'department_name' => $staff['department_name'],
                    'designation_name' => $staff['designation_name'],
                    'staff_status' => $staff['staff_status'],
                    'salary_currency' => $staff['salary_currency'],
                    'basic_salary_original' => $basicSalaryOriginal,
                    'basic_salary_ghs' => $basicSalaryGhs,
                    'gross_salary_original' => $grossSalaryOriginal,
                    'gross_salary_ghs' => $grossSalaryGhs,
                    'currency_rate' => $entryRate,
                    'allowances' => []
                ];

                $totals['basic_salary_ghs'] += $basicSalaryGhs;
                $totals['gross_salary_ghs'] += $grossSalaryGhs;

                // Add each allowance amount (allowances are stored in original currency, convert if USD)
                foreach ($allowanceTypes as $at) {
                    $key = $staff['payroll_entry_id'] . '_' . $at['id'];
                    $amountOriginal = isset($allowanceMap[$key]) ? floatval($allowanceMap[$key]) : 0;
                    $amountGhs = $isUsd ? $amountOriginal * $entryRate : $amountOriginal;
                    $entry['allowances'][$at['id']] = [
                        'original' => $amountOriginal,
                        'ghs' => $amountGhs
                    ];
                    $totals['allowances'][$at['id']] += $amountGhs;
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
                    'currency_rate' => $currencyRate,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        } else if ($type === 'deductions_report') {
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

            // Get staff payroll data with currency info
            $staffQuery = "SELECT
                            pe.id as payroll_entry_id,
                            s.staff_number,
                            CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                            d.department_name,
                            des.designation_name,
                            s.status as staff_status,
                            s.salary_currency,
                            pe.total_deductions,
                            pe.currency_rate
                          FROM payroll_entries pe
                          JOIN payroll_periods pp ON pe.payroll_period_id = pp.id
                          JOIN staffs s ON pe.staff_id = s.id
                          LEFT JOIN departments d ON s.department_id = d.id
                          LEFT JOIN designations des ON s.designation_id = des.id
                          WHERE pp.month = :month AND pp.year = :year";

            if ($departmentId) {
                $staffQuery .= " AND s.department_id = :department_id";
            }
            if ($staffStatus) {
                $staffQuery .= " AND s.status = :staff_status";
            }

            $staffQuery .= " ORDER BY d.department_name, s.last_name, s.first_name";

            $staffStmt = $db->prepare($staffQuery);
            $staffStmt->bindParam(':month', $month);
            $staffStmt->bindParam(':year', $year);
            if ($departmentId) {
                $staffStmt->bindParam(':department_id', $departmentId);
            }
            if ($staffStatus) {
                $staffStmt->bindParam(':staff_status', $staffStatus);
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
                'total_deductions_ghs' => 0,
                'deductions' => []
            ];

            // Initialize deduction totals
            foreach ($deductionTypes as $dt) {
                $totals['deductions'][$dt['id']] = 0;
            }

            foreach ($staffList as $staff) {
                $isUsd = $staff['salary_currency'] === 'USD';
                $entryRate = floatval($staff['currency_rate']) ?: $currencyRate;

                $totalDeductionsOriginal = floatval($staff['total_deductions']);
                $totalDeductionsGhs = $isUsd ? $totalDeductionsOriginal * $entryRate : $totalDeductionsOriginal;

                $entry = [
                    'staff_number' => $staff['staff_number'],
                    'staff_name' => $staff['staff_name'],
                    'department_name' => $staff['department_name'],
                    'designation_name' => $staff['designation_name'],
                    'staff_status' => $staff['staff_status'],
                    'salary_currency' => $staff['salary_currency'],
                    'total_deductions_original' => $totalDeductionsOriginal,
                    'total_deductions_ghs' => $totalDeductionsGhs,
                    'currency_rate' => $entryRate,
                    'deductions' => []
                ];

                $totals['total_deductions_ghs'] += $totalDeductionsGhs;

                // Add each deduction amount
                foreach ($deductionTypes as $dt) {
                    $key = $staff['payroll_entry_id'] . '_' . $dt['id'];
                    $amountOriginal = isset($deductionMap[$key]) ? floatval($deductionMap[$key]) : 0;
                    $amountGhs = $isUsd ? $amountOriginal * $entryRate : $amountOriginal;
                    $entry['deductions'][$dt['id']] = [
                        'original' => $amountOriginal,
                        'ghs' => $amountGhs
                    ];
                    $totals['deductions'][$dt['id']] += $amountGhs;
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
                    'currency_rate' => $currencyRate,
                    'period' => [
                        'month' => $month,
                        'year' => $year
                    ]
                ]
            ]);
        } else if ($type === 'ssnit_paye_eligible') {
            $month = isset($_GET['month']) ? $_GET['month'] : date('n');
            $year = isset($_GET['year']) ? $_GET['year'] : date('Y');

            // Get staff who have SSNIT or PAYE (Income Tax) deductions in the given period
            $query = "SELECT
                        s.staff_number,
                        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
                        d.department_name,
                        des.designation_name,
                        s.status as staff_status,
                        s.salary_currency,
                        s.ssnit as ssnit_number,
                        pe.basic_salary,
                        pe.gross_salary,
                        pe.currency_rate,
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
            if ($staffStatus) {
                $query .= " AND s.status = :staff_status";
            }

            $query .= " ORDER BY d.department_name, s.last_name, s.first_name, ded.deduction_name";

            $stmt = $db->prepare($query);
            $stmt->bindParam(':month', $month);
            $stmt->bindParam(':year', $year);
            if ($departmentId) {
                $stmt->bindParam(':department_id', $departmentId);
            }
            if ($staffStatus) {
                $stmt->bindParam(':staff_status', $staffStatus);
            }
            $stmt->execute();
            $results = $stmt->fetchAll();

            // Group by staff and separate SSNIT and PAYE deductions
            $staffMap = [];
            foreach ($results as $row) {
                $staffKey = $row['staff_number'];
                $isUsd = $row['salary_currency'] === 'USD';
                $entryRate = floatval($row['currency_rate']) ?: $currencyRate;

                if (!isset($staffMap[$staffKey])) {
                    $basicSalaryOriginal = floatval($row['basic_salary']);
                    $grossSalaryOriginal = floatval($row['gross_salary']);
                    $basicSalaryGhs = $isUsd ? $basicSalaryOriginal * $entryRate : $basicSalaryOriginal;
                    $grossSalaryGhs = $isUsd ? $grossSalaryOriginal * $entryRate : $grossSalaryOriginal;

                    $staffMap[$staffKey] = [
                        'staff_number' => $row['staff_number'],
                        'staff_name' => $row['staff_name'],
                        'department_name' => $row['department_name'],
                        'designation_name' => $row['designation_name'],
                        'staff_status' => $row['staff_status'],
                        'salary_currency' => $row['salary_currency'],
                        'ssnit_number' => $row['ssnit_number'],
                        'basic_salary_original' => $basicSalaryOriginal,
                        'basic_salary_ghs' => $basicSalaryGhs,
                        'gross_salary_original' => $grossSalaryOriginal,
                        'gross_salary_ghs' => $grossSalaryGhs,
                        'currency_rate' => $entryRate,
                        'ssnit_deductions' => [],
                        'paye_deductions' => []
                    ];
                }

                $deductionAmountOriginal = floatval($row['deduction_amount']);
                $deductionAmountGhs = $isUsd ? $deductionAmountOriginal * $entryRate : $deductionAmountOriginal;

                $deductionLower = strtolower($row['deduction_name']);
                if (strpos($deductionLower, 'ssnit') !== false || strpos($deductionLower, 'tier') !== false) {
                    $staffMap[$staffKey]['ssnit_deductions'][] = [
                        'name' => $row['deduction_name'],
                        'amount_original' => $deductionAmountOriginal,
                        'amount_ghs' => $deductionAmountGhs
                    ];
                } else {
                    $staffMap[$staffKey]['paye_deductions'][] = [
                        'name' => $row['deduction_name'],
                        'amount_original' => $deductionAmountOriginal,
                        'amount_ghs' => $deductionAmountGhs
                    ];
                }
            }

            $entries = array_values($staffMap);

            // Calculate totals (in GHS)
            $totalSsnitGhs = 0;
            $totalPayeGhs = 0;
            foreach ($entries as $entry) {
                foreach ($entry['ssnit_deductions'] as $ded) {
                    $totalSsnitGhs += floatval($ded['amount_ghs']);
                }
                foreach ($entry['paye_deductions'] as $ded) {
                    $totalPayeGhs += floatval($ded['amount_ghs']);
                }
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => [
                    'entries' => $entries,
                    'totals' => [
                        'ssnit_ghs' => $totalSsnitGhs,
                        'paye_ghs' => $totalPayeGhs,
                        'count' => count($entries)
                    ],
                    'currency_rate' => $currencyRate,
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
