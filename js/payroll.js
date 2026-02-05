// PayrollManager class - handles payroll calculations and API operations
class PayrollManager {
	constructor() {
		this.currentPeriod = null;
		this.currentStaff = null;
		this.selectedAllowances = [];
		this.selectedDeductions = [];
		this.currencyRate = 1.0;
	}

	async initialize() {
		await this.loadCurrencyRate();
	}

	async loadCurrencyRate() {
		try {
			const response = await window.ApiService.get(
				window.API_ENDPOINTS.CURRENCY_RATES + "?current=true"
			);
			if (response.success && response.data) {
				this.currencyRate = Number.parseFloat(response.data.rate);
			}
		} catch (error) {
			console.error("Error loading currency rate:", error);
		}
	}

	async searchStaff(staffNumber) {
		try {
			const response = await window.ApiService.get(
				window.API_ENDPOINTS.STAFFS + `?staff_number=${staffNumber}`
			);
			if (response.success && response.data) {
				this.currentStaff = response.data;
				return response.data;
			}
			return null;
		} catch (error) {
			console.error("Error searching staff:", error);
			return null;
		}
	}

	calculatePayroll(basicSalary, allowances, deductions, salaryCurrency = 'USD') {
		let totalAllowances = 0;
		let totalDeductions = 0;

		// Calculate allowances based on original basic salary
		allowances.forEach((allowance) => {
			if (allowance.is_percentage) {
				const percentValue = parseFloat(allowance.default_amount) || parseFloat(allowance.amount) || 0;
				totalAllowances += (basicSalary * percentValue) / 100;
			} else {
				totalAllowances += parseFloat(allowance.amount) || parseFloat(allowance.default_amount) || 0;
			}
		});

		// Calculate deductions based on original basic salary
		deductions.forEach((deduction) => {
			if (deduction.is_percentage) {
				const percentValue = parseFloat(deduction.default_amount) || parseFloat(deduction.amount) || 0;
				totalDeductions += (basicSalary * percentValue) / 100;
			} else {
				totalDeductions += parseFloat(deduction.amount) || parseFloat(deduction.default_amount) || 0;
			}
		});

		const grossSalary = basicSalary + totalAllowances;
		const netSalary = grossSalary - totalDeductions;

		// For USD salaries (permanent staff), convert ONLY the final net salary to GHS for display
		// Allowances and deductions remain in their original values
		const netSalaryGHS = salaryCurrency === 'USD'
			? netSalary * this.currencyRate
			: netSalary;

		return {
			basic_salary: basicSalary,
			total_allowances: totalAllowances,
			total_deductions: totalDeductions,
			gross_salary: grossSalary,
			net_salary: netSalary,
			net_salary_ghs: netSalaryGHS,
			currency_rate: this.currencyRate,
			salary_currency: salaryCurrency,
		};
	}

	async savePayrollEntry(
		periodId,
		staffId,
		basicSalary,
		allowances,
		deductions
	) {
		const payrollData = {
			payroll_period_id: periodId,
			staff_id: staffId,
			basic_salary: basicSalary,
			allowances: allowances,
			deductions: deductions,
		};

		try {
			const response = await window.ApiService.post(
				window.API_ENDPOINTS.PAYROLL_ENTRIES,
				payrollData
			);
			return response;
		} catch (error) {
			console.error("Error saving payroll entry:", error);
			throw error;
		}
	}

	async updatePayrollEntry(entryId, basicSalary, allowances, deductions) {
		const payrollData = {
			id: entryId,
			basic_salary: basicSalary,
			allowances: allowances,
			deductions: deductions,
		};

		try {
			const response = await window.ApiService.put(
				window.API_ENDPOINTS.PAYROLL_ENTRIES,
				payrollData
			);
			return response;
		} catch (error) {
			console.error("Error updating payroll entry:", error);
			throw error;
		}
	}

	async savePayrollEntriesBulk(periodId, staffEntries) {
		if (!Array.isArray(staffEntries) || staffEntries.length === 0) {
			return {
				success: false,
				message: "Staff entries array is empty or invalid",
				data: {
					successCount: 0,
					failureCount: 0,
					results: [],
				},
			};
		}

		try {
			// Prepare payload for bulk endpoint
			const payload = {
				payroll_period_id: periodId,
				entries: staffEntries.map((entry) => ({
					staff_id: entry.staffId,
					basic_salary: Number.parseFloat(entry.basicSalary),
					allowances: entry.allowances || [],
					deductions: entry.deductions || [],
				})),
			};

			// Send all entries in a single bulk request
			const response = await window.ApiService.post(
				window.API_ENDPOINTS.PAYROLL_BULK_ENTRIES,
				payload
			);

			if (!response.success) {
				return {
					success: false,
					message: response.message || "Failed to process bulk payroll",
					data: {
						successCount: 0,
						failureCount: staffEntries.length,
						totalCount: staffEntries.length,
						results: staffEntries.map((entry) => ({
							staffId: entry.staffId,
							success: false,
							error: response.message || "Bulk operation failed",
							isDuplicate: false,
						})),
					},
				};
			}

			// Parse results from API response
			const results = response.data?.results || [];
			const successCount = results.filter((r) => r.success).length;
			const failureCount = results.filter((r) => !r.success).length;

			return {
				success: successCount > 0,
				message: `Processed ${staffEntries.length} entries: ${successCount} successful, ${failureCount} failed`,
				data: {
					successCount,
					failureCount,
					totalCount: staffEntries.length,
					results,
				},
			};
		} catch (error) {
			console.error("[v0] Error in savePayrollEntriesBulk:", error);
			return {
				success: false,
				message: `Error: ${error.message}`,
				data: {
					successCount: 0,
					failureCount: staffEntries.length,
					totalCount: staffEntries.length,
					results: staffEntries.map((entry) => ({
						staffId: entry.staffId,
						success: false,
						error: error.message || "Unknown error occurred",
						isDuplicate: false,
					})),
				},
			};
		}
	}

	formatCurrency(amount, currency = "USD") {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency,
			minimumFractionDigits: 2,
		}).format(amount);
	}

	formatCurrencyGHS(amount) {
		return `GHS ${Number.parseFloat(amount).toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	}
}

// Export for use in other modules
window.PayrollManager = PayrollManager;

// Create a global instance for convenience
window.payrollManagerInstance = new PayrollManager();
