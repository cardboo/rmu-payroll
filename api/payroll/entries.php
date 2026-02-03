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

    // GET - List payroll entries for a period
    if ($method === 'GET') {
        if (isset($_GET['period_id'])) {
            $query = "SELECT pe.*, s.staff_number, s.first_name, s.last_name, 
                      d.department_name, des.designation_name
                      FROM payroll_entries pe
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      WHERE pe.payroll_period_id = :period_id
                      ORDER BY s.last_name, s.first_name";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':period_id', $_GET['period_id']);
            $stmt->execute();
            
            $entries = $stmt->fetchAll();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $entries
            ]);
        } else if (isset($_GET['id'])) {
            // Get single entry with allowances and deductions
            $query = "SELECT pe.*, s.staff_number, s.first_name, s.last_name, s.email,
                      d.department_name, des.designation_name, s.bank_name, s.account_number
                      FROM payroll_entries pe
                      JOIN staffs s ON pe.staff_id = s.id
                      LEFT JOIN departments d ON s.department_id = d.id
                      LEFT JOIN designations des ON s.designation_id = des.id
                      WHERE pe.id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $_GET['id']);
            $stmt->execute();
            
            $entry = $stmt->fetch();
            
            // Get allowances
            $allowQuery = "SELECT pa.*, a.allowance_name 
                           FROM payroll_allowances pa
                           JOIN allowances a ON pa.allowance_id = a.id
                           WHERE pa.payroll_entry_id = :entry_id";
            $allowStmt = $db->prepare($allowQuery);
            $allowStmt->bindParam(':entry_id', $_GET['id']);
            $allowStmt->execute();
            $entry['allowances'] = $allowStmt->fetchAll();
            
            // Get deductions
            $deductQuery = "SELECT pd.*, d.deduction_name 
                            FROM payroll_deductions pd
                            JOIN deductions d ON pd.deduction_id = d.id
                            WHERE pd.payroll_entry_id = :entry_id";
            $deductStmt = $db->prepare($deductQuery);
            $deductStmt->bindParam(':entry_id', $_GET['id']);
            $deductStmt->execute();
            $entry['deductions'] = $deductStmt->fetchAll();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $entry
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Period ID or Entry ID is required'
            ]);
        }
    }

    // POST - Create payroll entry
    else if ($method === 'POST') {
        requireAdmin($user);
        
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->payroll_period_id) || !isset($data->staff_id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Payroll period and staff are required'
            ]);
            exit();
        }
        
        // Check if entry already exists
        $checkQuery = "SELECT id FROM payroll_entries 
                       WHERE payroll_period_id = :period_id AND staff_id = :staff_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(':period_id', $data->payroll_period_id);
        $checkStmt->bindParam(':staff_id', $data->staff_id);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Payroll entry already exists for this staff in this period'
            ]);
            exit();
        }
        
        // Get current currency rate
        $rateQuery = "SELECT rate FROM currency_rates WHERE is_active = 1 LIMIT 1";
        $rateStmt = $db->query($rateQuery);
        $rateData = $rateStmt->fetch();
        $currencyRate = ($rateData !== false && isset($rateData['rate'])) ? (float)$rateData['rate'] : 1.0;
        
        // Calculate totals
        $basicSalary = $data->basic_salary;
        $totalAllowances = 0;
        $totalDeductions = 0;
        
        // Calculate allowances
        if (isset($data->allowances) && is_array($data->allowances)) {
            foreach ($data->allowances as $allowance) {
                if ($allowance->is_percentage) {
                    $totalAllowances += ($basicSalary * $allowance->percentage_value / 100);
                } else {
                    $totalAllowances += $allowance->amount;
                }
            }
        }
        
        // Calculate deductions
        if (isset($data->deductions) && is_array($data->deductions)) {
            foreach ($data->deductions as $deduction) {
                if ($deduction->is_percentage) {
                    $totalDeductions += ($basicSalary * $deduction->percentage_value / 100);
                } else {
                    $totalDeductions += $deduction->amount;
                }
            }
        }
        
        $grossSalary = $basicSalary + $totalAllowances;
        $netSalary = $grossSalary - $totalDeductions;
        $netSalaryGHS = $netSalary * $currencyRate;

        // Use transaction to ensure data consistency
        $db->beginTransaction();

        try {
            // Insert payroll entry
            $query = "INSERT INTO payroll_entries
                      (payroll_period_id, staff_id, basic_salary, total_allowances, total_deductions,
                       gross_salary, net_salary, currency_rate, net_salary_ghs, created_by)
                      VALUES (:period_id, :staff_id, :basic_salary, :total_allowances, :total_deductions,
                              :gross_salary, :net_salary, :currency_rate, :net_salary_ghs, :created_by)";
            $stmt = $db->prepare($query);

            $stmt->bindParam(':period_id', $data->payroll_period_id);
            $stmt->bindParam(':staff_id', $data->staff_id);
            $stmt->bindParam(':basic_salary', $basicSalary);
            $stmt->bindParam(':total_allowances', $totalAllowances);
            $stmt->bindParam(':total_deductions', $totalDeductions);
            $stmt->bindParam(':gross_salary', $grossSalary);
            $stmt->bindParam(':net_salary', $netSalary);
            $stmt->bindParam(':currency_rate', $currencyRate);
            $stmt->bindParam(':net_salary_ghs', $netSalaryGHS);
            $stmt->bindParam(':created_by', $user->user_id);
            $stmt->execute();

            $entryId = $db->lastInsertId();

            // Insert allowances
            if (isset($data->allowances) && is_array($data->allowances)) {
                $allowQuery = "INSERT INTO payroll_allowances
                              (payroll_entry_id, allowance_id, amount, is_percentage, percentage_value)
                              VALUES (:entry_id, :allowance_id, :amount, :is_percentage, :percentage_value)";
                $allowStmt = $db->prepare($allowQuery);

                foreach ($data->allowances as $allowance) {
                    $amount = $allowance->is_percentage
                        ? ($basicSalary * $allowance->percentage_value / 100)
                        : $allowance->amount;

                    $allowStmt->bindParam(':entry_id', $entryId);
                    $allowStmt->bindParam(':allowance_id', $allowance->allowance_id);
                    $allowStmt->bindParam(':amount', $amount);
                    $allowStmt->bindParam(':is_percentage', $allowance->is_percentage);
                    $allowStmt->bindParam(':percentage_value', $allowance->percentage_value);
                    $allowStmt->execute();
                }
            }

            // Insert deductions
            if (isset($data->deductions) && is_array($data->deductions)) {
                $deductQuery = "INSERT INTO payroll_deductions
                               (payroll_entry_id, deduction_id, amount, is_percentage, percentage_value)
                               VALUES (:entry_id, :deduction_id, :amount, :is_percentage, :percentage_value)";
                $deductStmt = $db->prepare($deductQuery);

                foreach ($data->deductions as $deduction) {
                    $amount = $deduction->is_percentage
                        ? ($basicSalary * $deduction->percentage_value / 100)
                        : $deduction->amount;

                    $deductStmt->bindParam(':entry_id', $entryId);
                    $deductStmt->bindParam(':deduction_id', $deduction->deduction_id);
                    $deductStmt->bindParam(':amount', $amount);
                    $deductStmt->bindParam(':is_percentage', $deduction->is_percentage);
                    $deductStmt->bindParam(':percentage_value', $deduction->percentage_value);
                    $deductStmt->execute();
                }
            }

            // Log action
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id)
                         VALUES (:user_id, 'CREATE', 'payroll_entries', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $entryId);
            $logStmt->execute();

            $db->commit();

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Payroll entry created successfully',
                'id' => $entryId,
                'calculations' => [
                    'basic_salary' => $basicSalary,
                    'total_allowances' => $totalAllowances,
                    'total_deductions' => $totalDeductions,
                    'gross_salary' => $grossSalary,
                    'net_salary' => $netSalary,
                    'net_salary_ghs' => $netSalaryGHS,
                    'currency_rate' => $currencyRate
                ]
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // PUT - Update payroll entry
    else if ($method === 'PUT') {
        requireAdmin($user);
        
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Entry ID is required'
            ]);
            exit();
        }
        
        // Get current currency rate
        $rateQuery = "SELECT rate FROM currency_rates WHERE is_active = 1 LIMIT 1";
        $rateStmt = $db->query($rateQuery);
        $rateData = $rateStmt->fetch();
        $currencyRate = ($rateData !== false && isset($rateData['rate'])) ? (float)$rateData['rate'] : 1.0;
        
        // Calculate totals
        $basicSalary = $data->basic_salary;
        $totalAllowances = 0;
        $totalDeductions = 0;
        
        // Calculate allowances
        if (isset($data->allowances) && is_array($data->allowances)) {
            foreach ($data->allowances as $allowance) {
                if ($allowance->is_percentage) {
                    $totalAllowances += ($basicSalary * $allowance->percentage_value / 100);
                } else {
                    $totalAllowances += $allowance->amount;
                }
            }
        }
        
        // Calculate deductions
        if (isset($data->deductions) && is_array($data->deductions)) {
            foreach ($data->deductions as $deduction) {
                if ($deduction->is_percentage) {
                    $totalDeductions += ($basicSalary * $deduction->percentage_value / 100);
                } else {
                    $totalDeductions += $deduction->amount;
                }
            }
        }
        
        $grossSalary = $basicSalary + $totalAllowances;
        $netSalary = $grossSalary - $totalDeductions;
        $netSalaryGHS = $netSalary * $currencyRate;

        // Use transaction to ensure data consistency
        $db->beginTransaction();

        try {
            // Update payroll entry
            $query = "UPDATE payroll_entries SET
                      basic_salary = :basic_salary,
                      total_allowances = :total_allowances,
                      total_deductions = :total_deductions,
                      gross_salary = :gross_salary,
                      net_salary = :net_salary,
                      currency_rate = :currency_rate,
                      net_salary_ghs = :net_salary_ghs
                      WHERE id = :id";
            $stmt = $db->prepare($query);

            $stmt->bindParam(':id', $data->id);
            $stmt->bindParam(':basic_salary', $basicSalary);
            $stmt->bindParam(':total_allowances', $totalAllowances);
            $stmt->bindParam(':total_deductions', $totalDeductions);
            $stmt->bindParam(':gross_salary', $grossSalary);
            $stmt->bindParam(':net_salary', $netSalary);
            $stmt->bindParam(':currency_rate', $currencyRate);
            $stmt->bindParam(':net_salary_ghs', $netSalaryGHS);
            $stmt->execute();

            // Delete existing allowances and deductions
            $db->prepare("DELETE FROM payroll_allowances WHERE payroll_entry_id = :id")->execute([':id' => $data->id]);
            $db->prepare("DELETE FROM payroll_deductions WHERE payroll_entry_id = :id")->execute([':id' => $data->id]);

            // Insert new allowances
            if (isset($data->allowances) && is_array($data->allowances)) {
                $allowQuery = "INSERT INTO payroll_allowances
                              (payroll_entry_id, allowance_id, amount, is_percentage, percentage_value)
                              VALUES (:entry_id, :allowance_id, :amount, :is_percentage, :percentage_value)";
                $allowStmt = $db->prepare($allowQuery);

                foreach ($data->allowances as $allowance) {
                    $amount = $allowance->is_percentage
                        ? ($basicSalary * $allowance->percentage_value / 100)
                        : $allowance->amount;

                    $allowStmt->bindParam(':entry_id', $data->id);
                    $allowStmt->bindParam(':allowance_id', $allowance->allowance_id);
                    $allowStmt->bindParam(':amount', $amount);
                    $allowStmt->bindParam(':is_percentage', $allowance->is_percentage);
                    $allowStmt->bindParam(':percentage_value', $allowance->percentage_value);
                    $allowStmt->execute();
                }
            }

            // Insert new deductions
            if (isset($data->deductions) && is_array($data->deductions)) {
                $deductQuery = "INSERT INTO payroll_deductions
                               (payroll_entry_id, deduction_id, amount, is_percentage, percentage_value)
                               VALUES (:entry_id, :deduction_id, :amount, :is_percentage, :percentage_value)";
                $deductStmt = $db->prepare($deductQuery);

                foreach ($data->deductions as $deduction) {
                    $amount = $deduction->is_percentage
                        ? ($basicSalary * $deduction->percentage_value / 100)
                        : $deduction->amount;

                    $deductStmt->bindParam(':entry_id', $data->id);
                    $deductStmt->bindParam(':deduction_id', $deduction->deduction_id);
                    $deductStmt->bindParam(':amount', $amount);
                    $deductStmt->bindParam(':is_percentage', $deduction->is_percentage);
                    $deductStmt->bindParam(':percentage_value', $deduction->percentage_value);
                    $deductStmt->execute();
                }
            }

            // Log action
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id)
                         VALUES (:user_id, 'UPDATE', 'payroll_entries', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();

            $db->commit();

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Payroll entry updated successfully',
                'calculations' => [
                    'basic_salary' => $basicSalary,
                    'total_allowances' => $totalAllowances,
                    'total_deductions' => $totalDeductions,
                    'gross_salary' => $grossSalary,
                    'net_salary' => $netSalary,
                    'net_salary_ghs' => $netSalaryGHS,
                    'currency_rate' => $currencyRate
                ]
            ]);
        } catch (Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    // DELETE - Delete payroll entry
    else if ($method === 'DELETE') {
        requireAdmin($user);
        
        $data = json_decode(file_get_contents("php://input"));
        
        if (!isset($data->id)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Entry ID is required'
            ]);
            exit();
        }
        
        $query = "DELETE FROM payroll_entries WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $data->id);
        
        if ($stmt->execute()) {
            $logQuery = "INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                         VALUES (:user_id, 'DELETE', 'payroll_entries', :record_id)";
            $logStmt = $db->prepare($logQuery);
            $logStmt->bindParam(':user_id', $user->user_id);
            $logStmt->bindParam(':record_id', $data->id);
            $logStmt->execute();
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Payroll entry deleted successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Failed to delete payroll entry'
            ]);
        }
    }
} catch (PDOException $e) {
    ErrorLogger::logDatabaseError($e, $query ?? 'Unknown query', [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'payroll/entries',
        'period_id' => $_GET['period_id'] ?? 'N/A'
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred'
    ]);
} catch (Exception $e) {
    ErrorLogger::logError($e, [
        'method' => $method ?? 'Unknown',
        'endpoint' => 'payroll/entries'
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred'
    ]);
}
?>
