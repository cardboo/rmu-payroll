const API_BASE_URL = "http://localhost/rmu-payroll/api";

const API_ENDPOINTS = {
	// Auth
	LOGIN: `${API_BASE_URL}/auth/login.php`,
	LOGOUT: `${API_BASE_URL}/auth/logout.php`,

	// Users
	USERS: `${API_BASE_URL}/users/index.php`,

	// Departments
	DEPARTMENTS: `${API_BASE_URL}/departments/index.php`,

	// Designations
	DESIGNATIONS: `${API_BASE_URL}/designations/index.php`,

	// Staffs
	STAFFS: `${API_BASE_URL}/staffs/index.php`,

	// Allowances
	ALLOWANCES: `${API_BASE_URL}/allowances/index.php`,

	// Deductions
	DEDUCTIONS: `${API_BASE_URL}/deductions/index.php`,

	// Currency Rates
	CURRENCY_RATES: `${API_BASE_URL}/currency-rates/index.php`,
	CURRENCY_RATES_MANAGE: `${API_BASE_URL}/currency-rates/manage.php`,

	// Payroll
	PAYROLL_PERIODS: `${API_BASE_URL}/payroll/periods.php`,
	PAYROLL_GET_OR_CREATE_PERIOD: `${API_BASE_URL}/payroll/get-or-create-period.php`,
	PAYROLL_LOAD_ENTRIES: `${API_BASE_URL}/payroll/load-payroll-entries.php`,
	PAYROLL_ENTRIES: `${API_BASE_URL}/payroll/entries.php`,
	PAYROLL_BULK_ENTRIES: `${API_BASE_URL}/payroll/bulk-entries.php`,
	PAYROLL_STAFF_SEARCH: `${API_BASE_URL}/payroll/staff-search.php`,
	PAYROLL_STAFF_ALLOWANCES: `${API_BASE_URL}/payroll/staff-allowances.php`,
	PAYROLL_STAFF_DEDUCTIONS: `${API_BASE_URL}/payroll/staff-deductions.php`,
	PAYROLL_PROCESS_DETAILS: `${API_BASE_URL}/payroll/process-details.php`,
	PAYROLL_LIST_BY_DEPARTMENT: `${API_BASE_URL}/payroll/list-by-department.php`,

	// Reports
	REPORTS: `${API_BASE_URL}/reports/index.php`,
};

window.API_ENDPOINTS = API_ENDPOINTS;
