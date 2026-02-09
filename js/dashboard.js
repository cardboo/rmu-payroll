let currentPage = "overview"

// Assume AuthService, ApiService, API_ENDPOINTS, usersPage, departmentsPage, departmentsPage, designationsPage, staffsPage are defined elsewhere or globally available.
// For the purpose of this merge, we will assume they are accessible.

document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  if (typeof window.AuthService !== "undefined") {
    window.AuthService.checkAuth()
  }

  // Initialize user info
  initializeUserInfo()

  // Setup navigation
  setupNavigation()

  // Setup logout
  document.getElementById("logoutBtn").addEventListener("click", handleLogout)

  // Load initial page
  loadPage("overview")
})

function initializeUserInfo() {
  const user = window.AuthService.getUser()

  if (!user) {
    window.AuthService.logout()
    return
  }

  // Set user info
  document.getElementById("userName").textContent = user.full_name
  document.getElementById("userRole").textContent = user.role

  // Set avatar initials
  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
  document.getElementById("userAvatar").textContent = initials

  // Show admin menu if user is admin
  if (user.role === "admin") {
    document.getElementById("adminMenu").style.display = "block"
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item")

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()

      const page = item.getAttribute("data-page")

      // Update active state
      navItems.forEach((nav) => nav.classList.remove("active"))
      item.classList.add("active")

      // Load page
      loadPage(page)
    })
  })
}

function loadPage(page) {
  currentPage = page

  const pageTitle = document.getElementById("pageTitle")
  const mainContent = document.getElementById("mainContent")

  // Update page title
  const titles = {
    overview: "Dashboard",
    users: "User Management",
    departments: "Departments",
    designations: "Designations",
    staffs: "Staff Management",
    allowances: "Allowances",
    deductions: "Deductions",
    currency: "Currency Rates",
    payroll: "Bulk Payroll",
    reports: "Reports & Analytics",
  }

  pageTitle.textContent = titles[page] || "Dashboard"

  // Load page content
  switch (page) {
    case "overview":
      loadOverview()
      break
    case "users":
      loadUsersPage()
      break
    case "departments":
      loadDepartmentsPage()
      break
    case "designations":
      loadDesignationsPage()
      break
    case "staffs":
      loadStaffsPage()
      break
    case "allowances":
      loadAllowancesPage()
      break
    case "deductions":
      loadDeductionsPage()
      break
    case "currency":
      loadCurrencyPage()
      break
    case "payroll":
      loadPayrollPage()
      break
    case "reports":
      loadReportsPage()
      break
    default:
      loadOverview()
  }
}

async function loadOverview() {
  const mainContent = document.getElementById("mainContent")

  mainContent.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Staff</div>
        <div class="stat-value" id="totalStaff">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Departments</div>
        <div class="stat-value" id="totalDepartments">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">This Month's Payroll</div>
        <div class="stat-value" id="monthlyPayroll">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Users</div>
        <div class="stat-value" id="activeUsers">-</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Recent Activity</h3>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="recentActivity">
            <tr>
              <td colspan="4" style="text-align: center; padding: 40px;">
                Loading...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  // Load dashboard stats
  loadDashboardStats()
}

async function loadDashboardStats() {
  try {
    // Load stats from API
    const statsData = await window.ApiService.get(window.API_ENDPOINTS.REPORTS + "?type=dashboard")

    if (statsData && statsData.success) {
      document.getElementById("totalStaff").textContent = statsData.data.total_staff || 0
      document.getElementById("totalDepartments").textContent = statsData.data.total_departments || 0
      document.getElementById("monthlyPayroll").textContent =
        "GHS " + (statsData.data.monthly_payroll || 0).toLocaleString()
      document.getElementById("activeUsers").textContent = statsData.data.active_users || 0

      // Load recent activity
      if (statsData.data.recent_activity) {
        const tbody = document.getElementById("recentActivity")
        tbody.innerHTML = statsData.data.recent_activity
          .map(
            (activity) => `
          <tr>
            <td>${new Date(activity.created_at).toLocaleDateString()}</td>
            <td>${activity.user_name}</td>
            <td><span class="badge badge-primary">${activity.action}</span></td>
            <td>${activity.details || "-"}</td>
          </tr>
        `,
          )
          .join("")
      }
    }
  } catch (error) {
    console.error("Error loading dashboard stats:", error)
  }
}

async function handleLogout() {
  try {
    await window.ApiService.post(window.API_ENDPOINTS.LOGOUT, {})
  } catch (error) {
    console.error("Logout error:", error)
  } finally {
    window.AuthService.logout()
  }
}

function loadUsersPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.usersPage !== "undefined") {
    mainContent.innerHTML = window.usersPage.render()
    window.usersPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">User Management</h3>
        </div>
        <p style="padding: 20px;">Loading user management...</p>
      </div>
    `
  }
}

function loadDepartmentsPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.departmentsPage !== "undefined") {
    mainContent.innerHTML = window.departmentsPage.render()
    window.departmentsPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Departments</h3>
        </div>
        <p style="padding: 20px;">Loading departments...</p>
      </div>
    `
  }
}

function loadDesignationsPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.designationsPage !== "undefined") {
    mainContent.innerHTML = window.designationsPage.render()
    window.designationsPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Designations</h3>
        </div>
        <p style="padding: 20px;">Loading designations...</p>
      </div>
    `
  }
}

function loadStaffsPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.staffsPage !== "undefined") {
    mainContent.innerHTML = window.staffsPage.render()
    window.staffsPage.loadDepartmentsAndDesignations()
    window.staffsPage.attachEventListeners()
    window.staffsPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Staff Management</h3>
        </div>
        <p style="padding: 20px;">Loading staff management...</p>
      </div>
    `
  }
}

function loadAllowancesPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.allowancesPage !== "undefined") {
    mainContent.innerHTML = window.allowancesPage.render()
    window.allowancesPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Allowances</h3>
        </div>
        <p style="padding: 20px;">Loading allowances management...</p>
      </div>
    `
  }
}

function loadDeductionsPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.deductionsPage !== "undefined") {
    mainContent.innerHTML = window.deductionsPage.render()
    window.deductionsPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Deductions</h3>
        </div>
        <p style="padding: 20px;">Loading deductions management...</p>
      </div>
    `
  }
}

function loadCurrencyPage() {
  const mainContent = document.getElementById("mainContent")
  if (typeof window.currencyRatesPage !== "undefined") {
    mainContent.innerHTML = window.currencyRatesPage.render()
    window.currencyRatesPage.init()
  } else {
    mainContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Currency Rates</h3>
        </div>
        <p style="padding: 20px;">Loading currency rates management...</p>
      </div>
    `
  }
}

// ===== Payroll Page & Modal Initialization =====
function loadPayrollPage() {
	const mainContent = document.getElementById("mainContent");
	const page = window.processPayrollPage;

	mainContent.innerHTML = page.render();

	// Initialize the page
	page.init().then(() => {
		page.attachEventListeners();
		console.log("[v0] Process payroll page initialized");
	});
}

// Bulk Payroll Helper Functions
async function calculateBulkPayrollPreview(eligibleStaff, period) {
	const staffPreview = [];

	for (const staff of eligibleStaff) {
		try {
			// Fetch staff allowances and deductions
			const response = await window.ApiService.get(
				window.API_ENDPOINTS.PAYROLL_STAFF_SEARCH + `?staff_number=${staff.staff_number}`
			);

			if (response.success && response.data) {
				const allowances = (response.data.allowances || []).filter((a) => a.is_applicable);
				const deductions = (response.data.deductions || []).filter((d) => d.is_applicable);
				const currencyRate = response.data.currency_rate || 1;

				// Calculate totals
				const basicSalary = Number.parseFloat(staff.basic_salary) || 0;
				let totalAllowances = 0;
				let totalDeductions = 0;

				allowances.forEach((allow) => {
					if (allow.is_percentage) {
						totalAllowances += (basicSalary * allow.default_amount) / 100;
					} else {
						totalAllowances += Number.parseFloat(allow.default_amount) || 0;
					}
				});

				deductions.forEach((deduct) => {
					if (deduct.is_percentage) {
						totalDeductions += (basicSalary * deduct.default_amount) / 100;
					} else {
						totalDeductions += Number.parseFloat(deduct.default_amount) || 0;
					}
				});

				const grossSalary = basicSalary + totalAllowances;
				const netSalary = grossSalary - totalDeductions;
				const netSalaryGHS = netSalary * currencyRate;

				staffPreview.push({
					staff: staff,
					basicSalary: basicSalary,
					allowances: allowances,
					deductions: deductions,
					totalAllowances: totalAllowances,
					totalDeductions: totalDeductions,
					netSalary: netSalary,
					netSalaryGHS: netSalaryGHS,
					currencyRate: currencyRate,
				});
			}
		} catch (error) {
			console.error(`Error calculating payroll for staff ${staff.staff_number}:`, error);
		}
	}

	return staffPreview;
}

function showBulkProcessingLoader(show) {
	let loader = document.getElementById("bulkProcessingLoader");
	if (!loader) {
		loader = document.createElement("div");
		loader.id = "bulkProcessingLoader";
		loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 9999;
            text-align: center;
        `;
		loader.innerHTML = `
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Processing Payroll</div>
            <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
		document.body.appendChild(loader);
	}
	loader.style.display = show ? "block" : "none";
}

function showStaffPayrollEditModal(staff, staffList, staffIndex) {
	let modal = document.getElementById("staffPayrollEditModal");

	if (!modal) {
		modal = document.createElement("div");
		modal.id = "staffPayrollEditModal";
		modal.style.cssText = `
            position: fixed;
            z-index: 1001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
            display: none;
        `;
		document.body.appendChild(modal);
	}

	const payrollManager = window.payrollManagerInstance;

	const allowanceCheckboxes = staff.allowances
		.map(
			(a, idx) => `
        <div style="margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
            <input type="checkbox" id="allowance_${idx}" class="allowanceCheckbox" data-id="${a.id}" data-index="${idx}" checked>
            <label for="allowance_${idx}" style="margin-left: 8px;">
                ${a.name} 
                <span style="color: #666;">${a.is_percentage ? `(${a.percentage_value}%)` : `(${payrollManager.formatCurrency(a.amount, staff.currency)})`}</span>
            </label>
            ${
				a.type === "fixed"
					? `<input type="number" class="fixedAmountInput" data-type="allowance" data-index="${idx}" value="${a.amount || a.percentage_value}" style="margin-left: 10px; padding: 5px; width: 100px;" placeholder="Amount">`
					: ""
			}
        </div>
    `
		)
		.join("");

	const deductionCheckboxes = staff.deductions
		.map(
			(d, idx) => `
        <div style="margin: 10px 0; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
            <input type="checkbox" id="deduction_${idx}" class="deductionCheckbox" data-id="${d.id}" data-index="${idx}" checked>
            <label for="deduction_${idx}" style="margin-left: 8px;">
                ${d.name} 
                <span style="color: #666;">${d.is_percentage ? `(${d.percentage_value}%)` : `(${payrollManager.formatCurrency(d.amount, staff.currency)})`}</span>
            </label>
            ${
				d.type === "fixed"
					? `<input type="number" class="fixedAmountInput" data-type="deduction" data-index="${idx}" value="${d.amount || d.percentage_value}" style="margin-left: 10px; padding: 5px; width: 100px;" placeholder="Amount">`
					: ""
			}
        </div>
    `
		)
		.join("");

	modal.innerHTML = `
        <div style="
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Edit Payroll - ${staff.name}</h2>
                <span style="font-size: 28px; cursor: pointer; font-weight: bold;" id="closeEditModal">&times;</span>
            </div>

            <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 4px;">
                <p style="margin: 5px 0;"><strong>Staff Number:</strong> ${staff.staffNumber}</p>
                <p style="margin: 5px 0;"><strong>Basic Salary:</strong> ${payrollManager.formatCurrency(staff.basicSalary, staff.currency)}</p>
            </div>

            <h3>Allowances</h3>
            <div id="allowancesContainer" style="margin-bottom: 20px;">
                ${allowanceCheckboxes || "<p style='color: #999;'>No allowances available</p>"}
            </div>

            <h3>Deductions</h3>
            <div id="deductionsContainer" style="margin-bottom: 20px;">
                ${deductionCheckboxes || "<p style='color: #999;'>No deductions available</p>"}
            </div>

            <div id="editCalculationSummary" style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Total Allowances:</strong> <span id="editTotalAllowances">${payrollManager.formatCurrency(staff.totalAllowances, staff.currency)}</span></p>
                <p style="margin: 5px 0;"><strong>Total Deductions:</strong> <span id="editTotalDeductions">${payrollManager.formatCurrency(staff.totalDeductions, staff.currency)}</span></p>
                <p style="margin: 5px 0; font-weight: bold; color: #27ae60;"><strong>Net Salary:</strong> <span id="editNetSalary">${payrollManager.formatCurrency(staff.netSalary, staff.currency)}</span></p>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button id="cancelEditBtn" class="btn btn-secondary" style="padding: 10px 20px;">Cancel</button>
                <button id="saveEditBtn" class="btn btn-success" style="padding: 10px 20px;">Save Changes</button>
            </div>
        </div>
    `;

	// Attach event listeners with null checks
	const closeEditModalBtn = document.getElementById("closeEditModal");
	const cancelEditBtn = document.getElementById("cancelEditBtn");
	const saveEditBtn = document.getElementById("saveEditBtn");

	if (closeEditModalBtn) {
		closeEditModalBtn.onclick = () => {
			modal.style.display = "none";
		};
	}

	if (cancelEditBtn) {
		cancelEditBtn.onclick = () => {
			modal.style.display = "none";
		};
	}

	if (saveEditBtn) {
		saveEditBtn.onclick = () => {
		// Get selected allowances and deductions
		const selectedAllowances = Array.from(
			modal.querySelectorAll(".allowanceCheckbox:checked")
		).map((cb) => {
			const idx = parseInt(cb.getAttribute("data-index"));
			const fixedInput = modal.querySelector(
				`.fixedAmountInput[data-type="allowance"][data-index="${idx}"]`
			);
			const allowance = { ...staff.allowances[idx] };
			if (fixedInput && fixedInput.value) {
				allowance.amount = parseFloat(fixedInput.value);
				allowance.percentage_value = parseFloat(fixedInput.value);
			}
			return allowance;
		});

		const selectedDeductions = Array.from(
			modal.querySelectorAll(".deductionCheckbox:checked")
		).map((cb) => {
			const idx = parseInt(cb.getAttribute("data-index"));
			const fixedInput = modal.querySelector(
				`.fixedAmountInput[data-type="deduction"][data-index="${idx}"]`
			);
			const deduction = { ...staff.deductions[idx] };
			if (fixedInput && fixedInput.value) {
				deduction.amount = parseFloat(fixedInput.value);
				deduction.percentage_value = parseFloat(fixedInput.value);
			}
			return deduction;
		});

		// Recalculate payroll
		const payrollCalc = payrollManager.calculatePayroll(
			staff.basicSalary,
			selectedAllowances,
			selectedDeductions
		);

		// Update staff object
		staffList[staffIndex].allowances = selectedAllowances;
		staffList[staffIndex].deductions = selectedDeductions;
		staffList[staffIndex].totalAllowances = payrollCalc.total_allowances;
		staffList[staffIndex].totalDeductions = payrollCalc.total_deductions;
		staffList[staffIndex].grossSalary = payrollCalc.gross_salary;
		staffList[staffIndex].netSalary = payrollCalc.net_salary;
		staffList[staffIndex].netSalaryGHS = payrollCalc.net_salary_ghs;

		// Close modal
		modal.style.display = "none";

		// Refresh the bulk confirmation modal
		const bulkModal = document.getElementById("bulkConfirmationModal");
		if (bulkModal && bulkModal.style.display !== "none") {
			// Update the table row
			const row = bulkModal.querySelector(`tr:nth-child(${staffIndex + 1})`);
			if (row) {
				const cells = row.querySelectorAll("td");
				if (cells.length >= 6) {
					cells[3].textContent = payrollManager.formatCurrency(
						payrollCalc.total_allowances,
						staff.currency
					);
					cells[4].textContent = payrollManager.formatCurrency(
						payrollCalc.total_deductions,
						staff.currency
					);
					cells[5].textContent = payrollManager.formatCurrency(
						payrollCalc.net_salary,
						staff.currency
					);
				}
			}
		}

		alert("Payroll updated for " + staff.name);
	};
	}

	// Add live calculation on checkbox/input change
	const updateCalculation = () => {
		const selectedAllowances = Array.from(
			modal.querySelectorAll(".allowanceCheckbox:checked")
		).map((cb) => {
			const idx = parseInt(cb.getAttribute("data-index"));
			const fixedInput = modal.querySelector(
				`.fixedAmountInput[data-type="allowance"][data-index="${idx}"]`
			);
			const allowance = { ...staff.allowances[idx] };
			if (fixedInput && fixedInput.value) {
				allowance.amount = parseFloat(fixedInput.value);
				allowance.percentage_value = parseFloat(fixedInput.value);
			}
			return allowance;
		});

		const selectedDeductions = Array.from(
			modal.querySelectorAll(".deductionCheckbox:checked")
		).map((cb) => {
			const idx = parseInt(cb.getAttribute("data-index"));
			const fixedInput = modal.querySelector(
				`.fixedAmountInput[data-type="deduction"][data-index="${idx}"]`
			);
			const deduction = { ...staff.deductions[idx] };
			if (fixedInput && fixedInput.value) {
				deduction.amount = parseFloat(fixedInput.value);
				deduction.percentage_value = parseFloat(fixedInput.value);
			}
			return deduction;
		});

		const payrollCalc = payrollManager.calculatePayroll(
			staff.basicSalary,
			selectedAllowances,
			selectedDeductions
		);

		document.getElementById("editTotalAllowances").textContent =
			payrollManager.formatCurrency(payrollCalc.total_allowances, staff.currency);
		document.getElementById("editTotalDeductions").textContent =
			payrollManager.formatCurrency(payrollCalc.total_deductions, staff.currency);
		document.getElementById("editNetSalary").textContent =
			payrollManager.formatCurrency(payrollCalc.net_salary, staff.currency);
	};

	// Attach change listeners
	setTimeout(() => {
		modal.querySelectorAll(".allowanceCheckbox, .deductionCheckbox, .fixedAmountInput").forEach(
			(elem) => {
				elem.addEventListener("change", updateCalculation);
				elem.addEventListener("input", updateCalculation);
			}
		);
	}, 0);

	modal.style.display = "block";

	// Close on outside click - use event listener instead of overwriting window.onclick
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			modal.style.display = "none";
		}
	});
}

function showBulkConfirmationModal(staffList, period, month, year) {
	let modal = document.getElementById("bulkConfirmationModal");

	if (!modal) {
		modal = document.createElement("div");
		modal.id = "bulkConfirmationModal";
		modal.style.cssText = `
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
            display: none;
        `;
		document.body.appendChild(modal);
	}

	const totalAllowances = staffList.reduce((sum, s) => sum + s.totalAllowances, 0);
	const totalDeductions = staffList.reduce((sum, s) => sum + s.totalDeductions, 0);
	const totalNetSalary = staffList.reduce((sum, s) => sum + s.netSalary, 0);

	const tableHtml = staffList
		.map(
			(staff, index) => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${staff.staffNumber}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${staff.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
                ${window.payrollManagerInstance.formatCurrency(staff.basicSalary, staff.currency)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
                ${window.payrollManagerInstance.formatCurrency(staff.totalAllowances, staff.currency)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
                ${window.payrollManagerInstance.formatCurrency(staff.totalDeductions, staff.currency)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
                ${window.payrollManagerInstance.formatCurrency(staff.netSalary, staff.currency)}
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
                <button class="editStaffBtn" data-index="${index}" style="padding: 5px 10px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
            </td>
        </tr>
    `
		)
		.join("");

	modal.innerHTML = `
        <div style="
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            border-radius: 8px;
            width: 90%;
            max-width: 900px;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Confirm Bulk Payroll Processing</h2>
                <span style="font-size: 28px; cursor: pointer; font-weight: bold;" id="closeBulkModal">&times;</span>
            </div>

            <p style="margin: 10px 0;"><strong>Period:</strong> ${month}/${year}</p>
            <p style="margin: 10px 0;"><strong>Total Staff:</strong> ${staffList.length} employees</p>

            <div style="margin: 20px 0;">
                <h3>Staff Payroll Preview</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                    <thead style="background-color: #f9f9f9;">
                        <tr>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Staff #</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Name</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Basic Salary</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Allowances</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Deductions</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Net Salary</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableHtml}
                    </tbody>
                </table>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Total Allowances:</strong> ${window.payrollManagerInstance.formatCurrency(totalAllowances, "USD")}</p>
                <p style="margin: 5px 0;"><strong>Total Deductions:</strong> ${window.payrollManagerInstance.formatCurrency(totalDeductions, "USD")}</p>
                <p style="margin: 5px 0; font-weight: bold; color: #27ae60;"><strong>Total Net Salary:</strong> ${window.payrollManagerInstance.formatCurrency(totalNetSalary, "USD")}</p>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button id="cancelBulkBtn" class="btn btn-secondary" style="padding: 10px 20px;">Cancel</button>
                <button id="confirmBulkBtn" class="btn btn-success" style="padding: 10px 20px;">Confirm & Process</button>
            </div>
        </div>
    `;

	const closeBulkModalBtn = document.getElementById("closeBulkModal");
	const cancelBulkBtn = document.getElementById("cancelBulkBtn");
	const confirmBulkBtn = document.getElementById("confirmBulkBtn");

	if (closeBulkModalBtn) {
		closeBulkModalBtn.onclick = () => {
			modal.style.display = "none";
		};
	}

	if (cancelBulkBtn) {
		cancelBulkBtn.onclick = () => {
			modal.style.display = "none";
		};
	}

	if (confirmBulkBtn) {
		confirmBulkBtn.onclick = async () => {
			await processBulkPayroll(staffList, period);
			modal.style.display = "none";
		};
	}

	modal.style.display = "block";

	// Add event listeners for edit buttons AFTER modal is displayed
	setTimeout(() => {
		const editButtons = modal.querySelectorAll(".editStaffBtn");
		editButtons.forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const index = parseInt(btn.getAttribute("data-index"));
				showStaffPayrollEditModal(staffList[index], staffList, index);
			});
		});
	}, 10);

	// Close on outside click - use event listener instead of overwriting window.onclick
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			modal.style.display = "none";
		}
	});
}

async function processBulkPayroll(staffList, period) {
	showBulkProcessingLoader(true);

	try {
		const staffEntries = staffList.map((staff) => ({
			staffId: staff.id,
			basicSalary: staff.basicSalary,
			allowances: (staff.allowances || []).map((a) => a.id),
			deductions: (staff.deductions || []).map((d) => d.id),
		}));

		const result = await window.payrollManagerInstance.savePayrollEntriesBulk(
			period.id,
			staffEntries
		);

		showBulkProcessingLoader(false);

		// Show results modal
		showBulkResultsModal(result, period);

		// Refresh payroll entries
		loadPayrollEntries(period.id);
	} catch (error) {
		console.error("Error processing bulk payroll:", error);
		alert("Error processing bulk payroll: " + error.message);
		showBulkProcessingLoader(false);
	}
}

function showBulkResultsModal(result, period) {
	let modal = document.getElementById("bulkResultsModal");

	if (!modal) {
		modal = document.createElement("div");
		modal.id = "bulkResultsModal";
		modal.style.cssText = `
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
            display: none;
        `;
		document.body.appendChild(modal);
	}

	const successRows = result.data.results
		.filter((r) => r.success)
		.map(
			(r) => `
        <tr style="background-color: #d4edda;">
            <td style="padding: 8px; border: 1px solid #ddd;">${r.staffId}</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><span style="color: #28a745; font-weight: bold;">✓ Success</span></td>
            <td style="padding: 8px; border: 1px solid #ddd;">Payroll entry created</td>
        </tr>
    `
		)
		.join("");

	const failureRows = result.data.results
		.filter((r) => !r.success)
		.map(
			(r) => `
        <tr style="background-color: #f8d7da;">
            <td style="padding: 8px; border: 1px solid #ddd;">${r.staffId}</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><span style="color: #dc3545; font-weight: bold;">✗ Failed</span></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${r.error || "Unknown error"}</td>
        </tr>
    `
		)
		.join("");

	modal.innerHTML = `
        <div style="
            background-color: #fefefe;
            margin: 5% auto;
            padding: 20px;
            border: 1px solid #888;
            border-radius: 8px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Bulk Payroll Processing Results</h2>
                <span style="font-size: 28px; cursor: pointer; font-weight: bold;" id="closeBulkResultsModal">&times;</span>
            </div>

            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #2196F3;">
                <p style="margin: 5px 0;"><strong>Total Processed:</strong> ${result.data.totalCount}</p>
                <p style="margin: 5px 0;"><span style="color: #28a745; font-weight: bold;">✓ Successful:</span> ${result.data.successCount}</p>
                <p style="margin: 5px 0;"><span style="color: #dc3545; font-weight: bold;">✗ Failed:</span> ${result.data.failureCount}</p>
            </div>

            <div style="margin: 20px 0;">
                <h3>Processing Details</h3>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
                    <thead style="background-color: #f9f9f9;">
                        <tr>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Staff ID</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Status</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${successRows}
                        ${failureRows}
                    </tbody>
                </table>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button id="closeBulkResultsBtn" class="btn btn-primary" style="padding: 10px 20px;">Close</button>
            </div>
        </div>
    `;

	const closeBulkResultsModalBtn = document.getElementById("closeBulkResultsModal");
	const closeBulkResultsBtn = document.getElementById("closeBulkResultsBtn");

	if (closeBulkResultsModalBtn) {
		closeBulkResultsModalBtn.onclick = () => {
			modal.style.display = "none";
		};
	}

	if (closeBulkResultsBtn) {
		closeBulkResultsBtn.onclick = () => {
			modal.style.display = "none";
		};
	}

	modal.style.display = "block";

	// Close on outside click - use event listener instead of overwriting window.onclick
	modal.addEventListener("click", (event) => {
		if (event.target === modal) {
			modal.style.display = "none";
		}
	});
}

function setupPayrollEventListeners(payrollManager) {
	const processBulkPayrollBtn = document.getElementById("processBulkPayrollBtn");
	if (!processBulkPayrollBtn) {
		console.warn("[v0] processBulkPayrollBtn not found");
		return;
	}
	processBulkPayrollBtn.addEventListener("click", async () => {
			const month = document.getElementById("payrollMonth").value;
			const year = document.getElementById("payrollYear").value;

			if (!month || !year) {
				alert("Please select a month and year");
				return;
			}

			try {
				// Show loading indicator
				showBulkProcessingLoader(true);

				// Get payroll period
				const periods = await window.ApiService.get(window.API_ENDPOINTS.PAYROLL_PERIODS);
				const period = periods.data.find((p) => Number(p.month) === Number(month) && Number(p.year) === Number(year));

				if (!period) {
					alert("Payroll period not found");
					showBulkProcessingLoader(false);
					return;
				}

				// Get all staff with hire dates
				const staffResponse = await window.ApiService.get(window.API_ENDPOINTS.STAFFS);
				const allStaff = staffResponse.data;

				// Get existing payroll entries for this period
				const entriesResponse = await window.ApiService.get(
					window.API_ENDPOINTS.PAYROLL_ENTRIES + `?period_id=${period.id}`
				);
				const existingEntries = entriesResponse.data || [];
				const existingStaffIds = new Set(existingEntries.map((e) => e.staff_id));

				// Filter eligible staff (hire date on or before period, and no existing entry)
				const periodDate = new Date(year, month - 1, 1);
				const eligibleStaff = allStaff.filter((staff) => {
					const hireDate = new Date(staff.hire_date);
					return (
						hireDate <= periodDate &&
						!existingStaffIds.has(staff.id) &&
						staff.is_archived === 0
					);
				});

				if (eligibleStaff.length === 0) {
					alert("No eligible staff found for bulk processing");
					showBulkProcessingLoader(false);
					return;
				}

				// Calculate payroll for preview
				const staffPreview = await calculateBulkPayrollPreview(
					eligibleStaff,
					period
				);

				// Show confirmation modal
				showBulkConfirmationModal(staffPreview, period, month, year);

				showBulkProcessingLoader(false);
			} catch (error) {
				console.error("Error preparing bulk payroll:", error);
				alert("Error preparing bulk payroll");
				showBulkProcessingLoader(false);
			}
		});
}

// ===== Helper: Month Options =====
function generateMonthOptions() {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ]
  return months.map((m,i) => `<option value="${i+1}">${m}</option>`).join("")
}

function generateYearOptions() {
  const currentYear = new Date().getFullYear()
  let options = ""
  for (let year = currentYear - 5; year <= currentYear + 5; year++) {
    options += `<option value="${year}" ${year === currentYear ? "selected" : ""}>${year}</option>`
  }
  return options
}

async function loadPayrollEntries(periodId) {
	try {
		const response = await window.ApiService.get(
			window.API_ENDPOINTS.PAYROLL_ENTRIES + `?period_id=${periodId}`
		);

		if (response.success) {
			const tbody = document.getElementById("entriesTableBody");
			tbody.innerHTML = response.data
				.map(
					(entry) => `
        <tr>
          <td>${entry.staff_number}</td>
          <td>${entry.first_name} ${entry.last_name}</td>
          <td>${entry.department_name || "N/A"}</td>
          <td>$${Number.parseFloat(entry.basic_salary).toFixed(2)}</td>
          <td style="color: #10b981;">$${Number.parseFloat(
						entry.total_allowances
					).toFixed(2)}</td>
          <td style="color: #ef4444;">$${Number.parseFloat(
						entry.total_deductions
					).toFixed(2)}</td>
          <td><strong>GHS ${Number.parseFloat(
						entry.net_salary_ghs
					).toLocaleString()}</strong></td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-sm btn-danger" onclick="deletePayrollEntry(${
								entry.id
							})">Delete</button>
            </div>
          </td>
        </tr>
      `
				)
				.join("");
		}
	} catch (error) {
		console.error("Error loading payroll entries:", error);
	}
}

async function deletePayrollEntry(entryId) {
	if (!confirm("Are you sure you want to delete this payroll entry?")) {
		return;
	}

	try {
		const response = await window.ApiService.delete(
			window.API_ENDPOINTS.PAYROLL_ENTRIES,
			{ id: entryId }
		);

		if (response.success) {
			alert("Payroll entry deleted successfully");
			// Reload entries using the current period stored in payrollManager
			if (
				window.payrollManagerInstance &&
				window.payrollManagerInstance.currentPeriod
			) {
				loadPayrollEntries(window.payrollManagerInstance.currentPeriod);
			} else {
				// Fallback if payrollManagerInstance is not available or currentPeriod is not set
				const currentMonth = document.getElementById("payrollMonth").value;
				const currentYear = document.getElementById("payrollYear").value;
				const periods = await window.ApiService.get(
					window.API_ENDPOINTS.PAYROLL_PERIODS
				);
				const period = periods.data.find(
					(p) => p.month == currentMonth && p.year == currentYear
				);
				if (period) {
					loadPayrollEntries(period.id);
				} else {
					alert(
						"Could not determine the current payroll period to reload entries."
					);
				}
			}
		}
	} catch (error) {
		alert("Failed to delete payroll entry");
		console.error(error);
	}
}

async function loadReportsPage() {
  const mainContent = document.getElementById("mainContent")

  // Load departments for filter
  let departmentsOptions = '<option value="">All Departments</option>'
  try {
    const deptResponse = await window.ApiService.get(window.API_ENDPOINTS.DEPARTMENTS)
    if (deptResponse.success && deptResponse.data) {
      departmentsOptions += deptResponse.data
        .map(d => `<option value="${d.id}">${d.department_name}</option>`)
        .join('')
    }
  } catch (error) {
    console.error("Error loading departments:", error)
  }

  mainContent.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">Reports & Analytics</h3>
      </div>
      <div style="padding: 24px;">
        <div class="form-row" style="margin-bottom: 24px;">
          <div class="form-group">
            <label for="reportType">Report Type</label>
            <select id="reportType" class="form-control">
              <option value="payroll_summary">Payroll Summary</option>
              <option value="gross_salary">Gross Salary Report</option>
              <option value="deductions_report">Deductions Report</option>
              <option value="ssnit_paye_eligible">SSNIT & PAYE Eligible Staff</option>
              <option value="department_payroll">Department Payroll</option>
              <option value="yearly_comparison">Yearly Comparison</option>
              <option value="allowances_deductions">Allowances & Deductions Breakdown</option>
            </select>
          </div>
          <div class="form-group" id="monthGroup">
            <label for="reportMonth">Month</label>
            <select id="reportMonth" class="form-control">
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>
          <div class="form-group">
            <label for="reportYear">Year</label>
            <select id="reportYear" class="form-control">
              ${generateYearOptions()}
            </select>
          </div>
          <div class="form-group" id="departmentGroup">
            <label for="reportDepartment">Department</label>
            <select id="reportDepartment" class="form-control">
              ${departmentsOptions}
            </select>
          </div>
          <div class="form-group" id="staffStatusGroup">
            <label for="reportStaffStatus">Staff Status</label>
            <select id="reportStaffStatus" class="form-control">
              <option value="">All Staff</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>

        <button id="generateReportBtn" class="btn btn-primary">Generate Report</button>
        <button id="exportReportBtn" class="btn btn-secondary" style="display: none;">Export to CSV</button>

        <div id="reportContent" style="margin-top: 32px;"></div>
      </div>
    </div>
  `

  // Set current month and year
  const now = new Date()
  document.getElementById("reportMonth").value = now.getMonth() + 1
  document.getElementById("reportYear").value = now.getFullYear()

  // Setup event listeners
  setupReportsEventListeners()
}

function setupReportsEventListeners() {
  const reportType = document.getElementById("reportType")
  const monthGroup = document.getElementById("monthGroup")
  const departmentGroup = document.getElementById("departmentGroup")
  const staffStatusGroup = document.getElementById("staffStatusGroup")

  reportType.addEventListener("change", () => {
    // Hide month selector for yearly comparison
    if (reportType.value === "yearly_comparison") {
      monthGroup.style.display = "none"
    } else {
      monthGroup.style.display = "block"
    }

    // Hide department filter for department_payroll (it's already grouped by department)
    // and yearly_comparison
    if (reportType.value === "department_payroll" || reportType.value === "yearly_comparison") {
      departmentGroup.style.display = "none"
      staffStatusGroup.style.display = "none"
    } else {
      departmentGroup.style.display = "block"
      staffStatusGroup.style.display = "block"
    }
  })

  document.getElementById("generateReportBtn").addEventListener("click", generateReport)
  document.getElementById("exportReportBtn").addEventListener("click", exportReport)
}

async function generateReport() {
  const reportType = document.getElementById("reportType").value
  const month = document.getElementById("reportMonth").value
  const year = document.getElementById("reportYear").value
  const departmentId = document.getElementById("reportDepartment").value
  const staffStatus = document.getElementById("reportStaffStatus").value

  const reportContent = document.getElementById("reportContent")
  reportContent.innerHTML = '<p style="text-align: center; padding: 40px;">Loading report...</p>'

  try {
    let url = `${window.API_ENDPOINTS.REPORTS}?type=${reportType}`

    if (reportType !== "yearly_comparison") {
      url += `&month=${month}`
    }
    url += `&year=${year}`

    // Add department filter if selected and applicable
    if (departmentId && reportType !== "department_payroll" && reportType !== "yearly_comparison") {
      url += `&department_id=${departmentId}`
    }

    // Add staff status filter if selected and applicable
    if (staffStatus && reportType !== "department_payroll" && reportType !== "yearly_comparison") {
      url += `&staff_status=${staffStatus}`
    }

    const response = await window.ApiService.get(url)

    if (response.success) {
      document.getElementById("exportReportBtn").style.display = "inline-flex"

      switch (reportType) {
        case "payroll_summary":
          displayPayrollSummary(response.data)
          break
        case "gross_salary":
          displayGrossSalaryReport(response.data)
          break
        case "deductions_report":
          displayDeductionsReport(response.data)
          break
        case "ssnit_paye_eligible":
          displaySsnitPayeReport(response.data)
          break
        case "department_payroll":
          displayDepartmentPayroll(response.data)
          break
        case "yearly_comparison":
          displayYearlyComparison(response.data)
          break
        case "allowances_deductions":
          displayAllowancesDeductions(response.data)
          break
      }
    } else {
      reportContent.innerHTML =
        '<p style="text-align: center; padding: 40px; color: #ef4444;">Failed to load report</p>'
    }
  } catch (error) {
    console.error("Error generating report:", error)
    reportContent.innerHTML = '<p style="text-align: center; padding: 40px; color: #ef4444;">An error occurred</p>'
  }
}

function displayPayrollSummary(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">Payroll Summary - ${monthNames[data.period.month - 1]} ${data.period.year}</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Staff</div>
          <div style="font-size: 24px; font-weight: 700;">${data.totals.count}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Basic Salary</div>
          <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${Number.parseFloat(
            data.totals.basic_salary,
          ).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Allowances</div>
          <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${Number.parseFloat(
            data.totals.total_allowances,
          ).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Deductions</div>
          <div style="font-size: 24px; font-weight: 700; color: #ef4444;">$${Number.parseFloat(
            data.totals.total_deductions,
          ).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Net (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">GHS ${Number.parseFloat(
            data.totals.net_salary_ghs,
          ).toLocaleString()}</div>
        </div>
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Staff No.</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Basic Salary</th>
            <th>Allowances</th>
            <th>Deductions</th>
            <th>Net Salary (GHS)</th>
            <th>Bank</th>
            <th>Account No.</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries
            .map(
              (entry) => `
            <tr>
              <td>${entry.staff_number}</td>
              <td>${entry.staff_name}</td>
              <td>${entry.department_name || "N/A"}</td>
              <td>${entry.designation_name || "N/A"}</td>
              <td>$${Number.parseFloat(entry.basic_salary).toFixed(2)}</td>
              <td style="color: #10b981;">$${Number.parseFloat(entry.total_allowances).toFixed(2)}</td>
              <td style="color: #ef4444;">$${Number.parseFloat(entry.total_deductions).toFixed(2)}</td>
              <td><strong>GHS ${Number.parseFloat(entry.net_salary_ghs).toLocaleString()}</strong></td>
              <td>${entry.bank_name || "N/A"}</td>
              <td>${entry.account_number || "N/A"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
}

function displayDepartmentPayroll(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">Department Payroll - ${
        monthNames[data.period.month - 1]
      } ${data.period.year}</h4>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Staff Count</th>
            <th>Total Basic</th>
            <th>Total Allowances</th>
            <th>Total Deductions</th>
            <th>Total Gross</th>
            <th>Total Net (GHS)</th>
          </tr>
        </thead>
        <tbody>
          ${data.departments
            .map(
              (dept) => `
            <tr>
              <td><strong>${dept.department_name || "Unassigned"}</strong></td>
              <td>${dept.staff_count}</td>
              <td>$${Number.parseFloat(dept.total_basic).toLocaleString()}</td>
              <td style="color: #10b981;">$${Number.parseFloat(dept.total_allowances).toLocaleString()}</td>
              <td style="color: #ef4444;">$${Number.parseFloat(dept.total_deductions).toLocaleString()}</td>
              <td>$${Number.parseFloat(dept.total_gross).toLocaleString()}</td>
              <td><strong>GHS ${Number.parseFloat(dept.total_net_ghs).toLocaleString()}</strong></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
}

function displayYearlyComparison(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  // Calculate total
  let totalPayroll = 0
  let totalStaff = 0

  data.months.forEach((month) => {
    totalPayroll += Number.parseFloat(month.total_payroll || 0)
    totalStaff += Number.parseInt(month.staff_count || 0)
  })

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">Yearly Comparison - ${data.year}</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Annual Payroll</div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">GHS ${totalPayroll.toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Average Monthly</div>
          <div style="font-size: 24px; font-weight: 700;">GHS ${(
            totalPayroll / (data.months.length || 1)
          ).toLocaleString()}</div>
        </div>
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Staff Count</th>
            <th>Total Payroll (GHS)</th>
          </tr>
        </thead>
        <tbody>
          ${data.months
            .map(
              (month) => `
            <tr>
              <td><strong>${monthNames[month.month - 1]} ${month.year}</strong></td>
              <td>${month.staff_count || 0}</td>
              <td>GHS ${Number.parseFloat(month.total_payroll || 0).toLocaleString()}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
}

function displayAllowancesDeductions(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">Allowances & Deductions Breakdown - ${
        monthNames[data.period.month - 1]
      } ${data.period.year}</h4>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px;">
      <div>
        <h5 style="margin-bottom: 16px; color: #10b981;">Allowances</h5>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Allowance</th>
                <th>Usage Count</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                (data.allowances || []).length > 0
                  ? data.allowances
                      .map(
                        (allow) => `
                <tr>
                  <td>${allow.allowance_name}</td>
                  <td>${allow.usage_count}</td>
                  <td style="color: #10b981;"><strong>$${Number.parseFloat(
                    allow.total_amount || 0,
                  ).toLocaleString()}</strong></td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="3" style="text-align: center; padding: 20px;">No allowances data</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <h5 style="margin-bottom: 16px; color: #ef4444;">Deductions</h5>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Deduction</th>
                <th>Usage Count</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${
                (data.deductions || []).length > 0
                  ? data.deductions
                      .map(
                        (deduct) => `
                <tr>
                  <td>${deduct.deduction_name}</td>
                  <td>${deduct.usage_count}</td>
                  <td style="color: #ef4444;"><strong>$${Number.parseFloat(
                    deduct.total_amount || 0,
                  ).toLocaleString()}</strong></td>
                </tr>
              `,
                      )
                      .join("")
                  : '<tr><td colspan="3" style="text-align: center; padding: 20px;">No deductions data</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

function displayGrossSalaryReport(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Helper function to format currency
  const formatGhs = (amount) => `GHS ${Number.parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
  const formatUsd = (amount) => `$${Number.parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`

  // Build dynamic allowance column headers
  const allowanceHeaders = data.allowance_types
    .map(at => `<th style="text-align: right;">${at.allowance_name}</th>`)
    .join('')

  // Calculate total allowances sum
  let totalAllowancesSum = 0
  Object.values(data.totals.allowances).forEach(val => {
    totalAllowancesSum += val
  })

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">Gross Salary Report - ${monthNames[data.period.month - 1]} ${data.period.year}</h4>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Exchange Rate: 1 USD = ${Number.parseFloat(data.currency_rate).toFixed(4)} GHS</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Staff</div>
          <div style="font-size: 24px; font-weight: 700;">${data.entries.length}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Basic Salary (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${formatGhs(data.totals.basic_salary_ghs)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Allowances (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #10b981;">${formatGhs(totalAllowancesSum)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Gross Salary (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${formatGhs(data.totals.gross_salary_ghs)}</div>
        </div>
      </div>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Staff No.</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th style="text-align: right;">Basic Salary (GHS)</th>
            ${allowanceHeaders}
            <th style="text-align: right;">Gross Salary (GHS)</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries.map(entry => {
            const isUsd = entry.salary_currency === 'USD'
            const allowanceCells = data.allowance_types
              .map(at => {
                const allowanceData = entry.allowances[at.id]
                if (!allowanceData || allowanceData.ghs === 0) {
                  return `<td style="text-align: right; color: #10b981;">-</td>`
                }
                if (isUsd && allowanceData.original > 0) {
                  return `<td style="text-align: right; color: #10b981;">
                    ${formatGhs(allowanceData.ghs)}
                    <br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(allowanceData.original)})</span>
                  </td>`
                }
                return `<td style="text-align: right; color: #10b981;">${formatGhs(allowanceData.ghs)}</td>`
              })
              .join('')

            const basicSalaryDisplay = isUsd
              ? `${formatGhs(entry.basic_salary_ghs)}<br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(entry.basic_salary_original)})</span>`
              : formatGhs(entry.basic_salary_ghs)

            const grossSalaryDisplay = isUsd
              ? `${formatGhs(entry.gross_salary_ghs)}<br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(entry.gross_salary_original)})</span>`
              : formatGhs(entry.gross_salary_ghs)

            return `
            <tr>
              <td>${entry.staff_number}</td>
              <td>${entry.staff_name}</td>
              <td>${entry.department_name || 'N/A'}</td>
              <td>${entry.designation_name || 'N/A'}</td>
              <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${entry.staff_status === 'permanent' ? '#dbeafe' : '#fef3c7'}; color: ${entry.staff_status === 'permanent' ? '#1e40af' : '#92400e'};">${entry.staff_status}</span></td>
              <td style="text-align: right;">${basicSalaryDisplay}</td>
              ${allowanceCells}
              <td style="text-align: right; font-weight: bold; color: #7c3aed;">${grossSalaryDisplay}</td>
            </tr>
          `}).join('')}
        </tbody>
        <tfoot style="background-color: #f1f5f9; font-weight: bold;">
          <tr>
            <td colspan="5" style="text-align: right;">TOTALS:</td>
            <td style="text-align: right;">${formatGhs(data.totals.basic_salary_ghs)}</td>
            ${data.allowance_types.map(at => {
              const total = data.totals.allowances[at.id] || 0
              return `<td style="text-align: right; color: #10b981;">${formatGhs(total)}</td>`
            }).join('')}
            <td style="text-align: right; color: #7c3aed;">${formatGhs(data.totals.gross_salary_ghs)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
}

function displayDeductionsReport(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Helper function to format currency
  const formatGhs = (amount) => `GHS ${Number.parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
  const formatUsd = (amount) => `$${Number.parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`

  // Build dynamic deduction column headers
  const deductionHeaders = data.deduction_types
    .map(dt => `<th style="text-align: right;">${dt.deduction_name}</th>`)
    .join('')

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">Deductions Report - ${monthNames[data.period.month - 1]} ${data.period.year}</h4>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Exchange Rate: 1 USD = ${Number.parseFloat(data.currency_rate).toFixed(4)} GHS</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Staff</div>
          <div style="font-size: 24px; font-weight: 700;">${data.entries.length}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total Deductions (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${formatGhs(data.totals.total_deductions_ghs)}</div>
        </div>
      </div>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Staff No.</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            ${deductionHeaders}
            <th style="text-align: right;">Total Deductions (GHS)</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries.map(entry => {
            const isUsd = entry.salary_currency === 'USD'
            const deductionCells = data.deduction_types
              .map(dt => {
                const deductionData = entry.deductions[dt.id]
                if (!deductionData || deductionData.ghs === 0) {
                  return `<td style="text-align: right; color: #ef4444;">-</td>`
                }
                if (isUsd && deductionData.original > 0) {
                  return `<td style="text-align: right; color: #ef4444;">
                    ${formatGhs(deductionData.ghs)}
                    <br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(deductionData.original)})</span>
                  </td>`
                }
                return `<td style="text-align: right; color: #ef4444;">${formatGhs(deductionData.ghs)}</td>`
              })
              .join('')

            const totalDeductionsDisplay = isUsd
              ? `${formatGhs(entry.total_deductions_ghs)}<br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(entry.total_deductions_original)})</span>`
              : formatGhs(entry.total_deductions_ghs)

            return `
            <tr>
              <td>${entry.staff_number}</td>
              <td>${entry.staff_name}</td>
              <td>${entry.department_name || 'N/A'}</td>
              <td>${entry.designation_name || 'N/A'}</td>
              <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${entry.staff_status === 'permanent' ? '#dbeafe' : '#fef3c7'}; color: ${entry.staff_status === 'permanent' ? '#1e40af' : '#92400e'};">${entry.staff_status}</span></td>
              ${deductionCells}
              <td style="text-align: right; font-weight: bold; color: #ef4444;">${totalDeductionsDisplay}</td>
            </tr>
          `}).join('')}
        </tbody>
        <tfoot style="background-color: #f1f5f9; font-weight: bold;">
          <tr>
            <td colspan="5" style="text-align: right;">TOTALS:</td>
            ${data.deduction_types.map(dt => {
              const total = data.totals.deductions[dt.id] || 0
              return `<td style="text-align: right; color: #ef4444;">${formatGhs(total)}</td>`
            }).join('')}
            <td style="text-align: right; color: #ef4444;">${formatGhs(data.totals.total_deductions_ghs)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `
}

function displaySsnitPayeReport(data) {
  const reportContent = document.getElementById("reportContent")

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  // Helper function to format currency
  const formatGhs = (amount) => `GHS ${Number.parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
  const formatUsd = (amount) => `$${Number.parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`

  reportContent.innerHTML = `
    <div class="card" style="background-color: #f8fafc; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;">SSNIT & PAYE Eligible Staff - ${monthNames[data.period.month - 1]} ${data.period.year}</h4>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">Exchange Rate: 1 USD = ${Number.parseFloat(data.currency_rate).toFixed(4)} GHS</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div>
          <div style="font-size: 12px; color: #64748b;">Eligible Staff</div>
          <div style="font-size: 24px; font-weight: 700;">${data.totals.count}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total SSNIT Deductions (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${formatGhs(data.totals.ssnit_ghs)}</div>
        </div>
        <div>
          <div style="font-size: 12px; color: #64748b;">Total PAYE/Income Tax (GHS)</div>
          <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${formatGhs(data.totals.paye_ghs)}</div>
        </div>
      </div>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Staff No.</th>
            <th>Name</th>
            <th>Department</th>
            <th>Designation</th>
            <th>Status</th>
            <th>SSNIT No.</th>
            <th style="text-align: right;">Basic Salary (GHS)</th>
            <th style="text-align: right;">Gross Salary (GHS)</th>
            <th>SSNIT Deductions</th>
            <th>PAYE/Tax Deductions</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries.length > 0 ? data.entries.map(entry => {
            const isUsd = entry.salary_currency === 'USD'

            const ssnitDeductions = entry.ssnit_deductions.map(d => {
              if (isUsd) {
                return `<div style="margin: 2px 0;"><span style="font-size: 11px;">${d.name}:</span> <strong style="color: #f59e0b;">${formatGhs(d.amount_ghs)}</strong><br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(d.amount_original)})</span></div>`
              }
              return `<div style="margin: 2px 0;"><span style="font-size: 11px;">${d.name}:</span> <strong style="color: #f59e0b;">${formatGhs(d.amount_ghs)}</strong></div>`
            }).join('') || '-'

            const payeDeductions = entry.paye_deductions.map(d => {
              if (isUsd) {
                return `<div style="margin: 2px 0;"><span style="font-size: 11px;">${d.name}:</span> <strong style="color: #ef4444;">${formatGhs(d.amount_ghs)}</strong><br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(d.amount_original)})</span></div>`
              }
              return `<div style="margin: 2px 0;"><span style="font-size: 11px;">${d.name}:</span> <strong style="color: #ef4444;">${formatGhs(d.amount_ghs)}</strong></div>`
            }).join('') || '-'

            const basicSalaryDisplay = isUsd
              ? `${formatGhs(entry.basic_salary_ghs)}<br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(entry.basic_salary_original)})</span>`
              : formatGhs(entry.basic_salary_ghs)

            const grossSalaryDisplay = isUsd
              ? `${formatGhs(entry.gross_salary_ghs)}<br><span style="font-size: 10px; color: #1976d2;">(${formatUsd(entry.gross_salary_original)})</span>`
              : formatGhs(entry.gross_salary_ghs)

            return `
            <tr>
              <td>${entry.staff_number}</td>
              <td>${entry.staff_name}</td>
              <td>${entry.department_name || 'N/A'}</td>
              <td>${entry.designation_name || 'N/A'}</td>
              <td><span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${entry.staff_status === 'permanent' ? '#dbeafe' : '#fef3c7'}; color: ${entry.staff_status === 'permanent' ? '#1e40af' : '#92400e'};">${entry.staff_status}</span></td>
              <td>${entry.ssnit_number || 'N/A'}</td>
              <td style="text-align: right;">${basicSalaryDisplay}</td>
              <td style="text-align: right;">${grossSalaryDisplay}</td>
              <td>${ssnitDeductions}</td>
              <td>${payeDeductions}</td>
            </tr>
          `}).join('') : '<tr><td colspan="10" style="text-align: center; padding: 20px;">No staff with SSNIT/PAYE deductions found for this period</td></tr>'}
        </tbody>
        ${data.entries.length > 0 ? `
        <tfoot style="background-color: #f1f5f9; font-weight: bold;">
          <tr>
            <td colspan="8" style="text-align: right;">TOTALS:</td>
            <td style="color: #f59e0b;">${formatGhs(data.totals.ssnit_ghs)}</td>
            <td style="color: #ef4444;">${formatGhs(data.totals.paye_ghs)}</td>
          </tr>
        </tfoot>
        ` : ''}
      </table>
    </div>
  `
}

function exportReport() {
  const reportType = document.getElementById("reportType").value
  const month = document.getElementById("reportMonth").value
  const year = document.getElementById("reportYear").value

  // Get the table data
  const table = document.querySelector("#reportContent table")

  if (!table) {
    alert("No report data to export")
    return
  }

  const csv = []
  const rows = table.querySelectorAll("tr")

  rows.forEach((row) => {
    const cols = row.querySelectorAll("td, th")
    const csvRow = []

    cols.forEach((col) => {
      csvRow.push('"' + col.textContent.replace(/"/g, '""') + '"')
    })

    csv.push(csvRow.join(","))
  })

  const csvContent = csv.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")

  a.href = url
  a.download = `${reportType}_${year}_${month}.csv`
  a.click()

  window.URL.revokeObjectURL(url)
}
