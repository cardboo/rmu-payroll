class ProcessPayrollPage {
  constructor() {
    this.payrollManager = window.PayrollManager ? new window.PayrollManager() : null;
    this.eligibleStaff = [];
    this.payrollPeriodId = null;
    this.selectedMonth = null;
    this.selectedYear = null;
    this.isModalLoading = false;
    this.isSubmitting = false;
    this.listenersAttached = false;
    this.isPeriodAlreadyProcessed = false;

    if (!this.payrollManager) {
      console.error("[v0] PayrollManager not available. Ensure payroll.js is loaded.");
    }
  }

  render() {
    return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Process Bulk Payroll</h2>
        </div>
        
        <div id="emptyState" style="padding: 40px; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h3>Process Payroll</h3>
            <p style="color: var(--text-secondary); margin: 16px 0;">Select a month and year to load eligible staff for payroll processing.</p>
            
            <div style="display: flex; gap: 12px; margin: 24px 0; justify-content: center;">
              <div>
                <label style="display: block; font-size: 14px; margin-bottom: 8px;">Month</label>
                <select id="payrollMonth" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border-color);">
                  <option value="">Select Month</option>
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
              
              <div>
                <label style="display: block; font-size: 14px; margin-bottom: 8px;">Year</label>
                <input type="number" id="payrollYear" placeholder="YYYY" style="padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); width: 120px;">
              </div>
            </div>
            
            <button class="btn btn-primary" id="loadStaffBtn" style="margin-top: 16px;">Load Eligible Staff</button>
          </div>
        </div>
        
        <div id="bulkPayrollContainer" style="display: none;">
          <div style="margin-bottom: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 4px;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Period:</strong> <span id="periodInfo">-</span>
            </p>
          </div>
          
          <div class="table-container">
            <table id="bulkPayrollTable">
              <thead>
                <tr>
                  <th>Staff #</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Gross Salary</th>
                  <th>Net Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="bulkPayrollTbody">
                <!-- Populated by renderBulkPayrollTable() -->
              </tbody>
            </table>
          </div>
          
          <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
            <button class="btn btn-secondary" id="cancelBulkBtn">Cancel</button>
            <button class="btn btn-primary" id="submitBulkBtn">Submit Payroll</button>
          </div>
        </div>
      </div>
    `;
  }

  getApiService() {
    return window.ApiService;
  }

  getApiEndpoints() {
    return window.API_ENDPOINTS;
  }

  async init() {
    this.attachEventListeners();

    // Initialize the payroll manager to load the current currency rate
    if (this.payrollManager) {
      await this.payrollManager.initialize();
    }

    // Safely set display properties only if elements exist
    const emptyState = document.getElementById("emptyState");
    const bulkContainer = document.getElementById("bulkPayrollContainer");

    if (emptyState) {
      emptyState.style.display = "block";
    }
    if (bulkContainer) {
      bulkContainer.style.display = "none";
    }
  }

  /* -------- LOAD ELIGIBLE STAFF FOR BULK PROCESSING -------- */
  async loadEligibleStaff() {
    const month = document.getElementById("payrollMonth").value;
    const year = document.getElementById("payrollYear").value;

    if (!month || !year) {
      alert("Please select month and year");
      return;
    }

    // Ensure currency rate is loaded before processing
    if (this.payrollManager && !this.payrollManager.currencyRateLoaded) {
      await this.payrollManager.initialize();
    }

    this.selectedMonth = parseInt(month);
    this.selectedYear = parseInt(year);

    try {
      const apiService = this.getApiService();
      const apiEndpoints = this.getApiEndpoints();

      if (!apiService || !apiEndpoints) {
        alert("API Service not properly initialized");
        return;
      }

      // Step 1: Get or create payroll period
      const periodRes = await apiService.get(
        `${apiEndpoints.PAYROLL_GET_OR_CREATE_PERIOD}?month=${this.selectedMonth}&year=${this.selectedYear}`
      );

      if (!periodRes.success || !periodRes.data) {
        alert("Failed to get or create payroll period");
        return;
      }

      const period = periodRes.data;
      this.payrollPeriodId = period.id;

      // Step 2: Load payroll entries or eligible staff based on what exists
      const loadRes = await apiService.get(
        `${apiEndpoints.PAYROLL_LOAD_ENTRIES}?period_id=${this.payrollPeriodId}`
      );

      if (!loadRes.success) {
        alert("Failed to load payroll data");
        return;
      }

      if (loadRes.entries_exist) {
        // Path A: Entries already exist - payroll already processed for this period
        this.isPeriodAlreadyProcessed = true;

        // Get month name for the message
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        const monthName = monthNames[this.selectedMonth - 1];

        // Show info message and prevent re-submission
        alert(`Payroll for ${monthName} ${this.selectedYear} has already been processed.\n\nPlease check the Reports section for details.`);

        // Reset to empty state - don't allow viewing/editing already processed payroll from here
        document.getElementById("emptyState").style.display = "block";
        document.getElementById("bulkPayrollContainer").style.display = "none";
        return;
      }

      // Path B: Entries don't exist - load eligible staff and their staff_allowances/staff_deductions
      this.eligibleStaff = loadRes.data.map((item) => {
          const staff = item.staff;
          const allowances = item.allowances || [];
          const deductions = item.deductions || [];

          return {
            id: staff.id,
            payroll_entry_id: null,
            staffNumber: staff.staff_number,
            name: `${staff.first_name} ${staff.last_name}`,
            department: staff.department_name || "N/A",
            designation: staff.designation_name || "N/A",
            basicSalary: parseFloat(staff.basic_salary) || 0,
            currency: staff.salary_currency || "GHS",
            numberOfDependents: parseInt(staff.number_of_dependents) || 0,
            totalAllowances: 0,
            totalDeductions: 0,
            grossSalary: 0,
            netSalary: 0,
            netSalaryGHS: 0,
            currencyRate: parseFloat(staff.currency_rate) || 1.0,
            allowances: allowances.map((a) => ({
              id: a.allowance_id,
              allowance_name: a.allowance_name,
              amount: parseFloat(a.amount) || 0,
              default_amount: parseFloat(a.default_amount) || 0,
              is_percentage: a.is_percentage,
              is_dependents_allowance: a.is_dependents_allowance == 1 || a.is_dependents_allowance === true,
            })),
            deductions: deductions.map((d) => ({
              id: d.deduction_id,
              deduction_name: d.deduction_name,
              amount: parseFloat(d.amount) || 0,
              default_amount: parseFloat(d.default_amount) || 0,
              is_percentage: d.is_percentage,
            })),
            selectedAllowances: allowances.map((a) => a.allowance_id),
            selectedDeductions: deductions.map((d) => d.deduction_id),
            is_existing_entry: false,
          };
        });

      // Calculate payroll for new entries
      this.eligibleStaff.forEach((staff) => {
        this.calculateStaffPayroll(staff);
      });

      if (this.eligibleStaff.length === 0) {
        alert("No eligible staff for this period");
        return;
      }

      this.renderBulkPayrollTable();
      document.getElementById("emptyState").style.display = "none";
      document.getElementById("bulkPayrollContainer").style.display = "block";
    } catch (error) {
      console.error("[v0] Error loading eligible staff:", error);
      alert(`Error loading eligible staff: ${error.message}`);
    }
  }

  /* -------- CALCULATE PAYROLL FOR INDIVIDUAL STAFF -------- */
  calculateStaffPayroll(staffData) {
    // Use allAllowances/allDeductions if available, otherwise fall back to staff.allowances/deductions
    const allowancesList = staffData.allAllowances || staffData.allowances;
    const deductionsList = staffData.allDeductions || staffData.deductions;

    const selectedAllowances = allowancesList.filter((a) => staffData.selectedAllowances.includes(a.id));
    const selectedDeductions = deductionsList.filter((d) => staffData.selectedDeductions.includes(d.id));

    // Calculate payroll with proper currency handling and dependents multiplier
    const calc = this.payrollManager.calculatePayroll(
      staffData.basicSalary,
      selectedAllowances,
      selectedDeductions,
      staffData.currency || 'GHS',
      staffData.numberOfDependents || 0
    );

    staffData.totalAllowances = calc.total_allowances;
    staffData.totalDeductions = calc.total_deductions;
    staffData.grossSalary = calc.gross_salary;
    staffData.netSalary = calc.net_salary;
    staffData.netSalaryGHS = calc.net_salary_ghs;
    staffData.currencyRate = calc.currency_rate;
  }

  /* -------- RENDER BULK PAYROLL TABLE -------- */
  renderBulkPayrollTable() {
    const tbody = document.getElementById("bulkPayrollTbody");
    if (!tbody) {
      console.error("[v0] bulkPayrollTbody element not found");
      return;
    }

    // Get current currency rate for display
    const currencyRate = this.payrollManager.currencyRate || 1.0;

    tbody.innerHTML = this.eligibleStaff
      .map(
        (staff, index) => {
          // For display: convert USD salary to GHS
          const displaySalary = staff.currency === 'USD'
            ? staff.basicSalary * currencyRate
            : staff.basicSalary;

          const currency = staff.currency || 'GHS';
          return `
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd;">${staff.staffNumber || "N/A"}</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${staff.name || "N/A"}</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${staff.department || "N/A"}</td>
            <td style="padding: 12px; border: 1px solid #ddd;">${staff.designation || "N/A"}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align:right;">
              ${this.payrollManager.formatCurrencyGHS(displaySalary)}
              ${staff.currency === 'USD' ? `<br><span style="font-size: 10px; color: #1976d2;">(${this.payrollManager.formatCurrency(staff.basicSalary, 'USD')} USD)</span>` : ''}
            </td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align:right;">${this.payrollManager.formatCurrency(staff.totalAllowances || 0, currency)}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align:right;">${this.payrollManager.formatCurrency(staff.totalDeductions || 0, currency)}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align:right;">${this.payrollManager.formatCurrency(staff.grossSalary || 0, currency)}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align:right;">${this.payrollManager.formatCurrencyGHS(staff.netSalaryGHS || 0)}</td>
            <td style="padding: 12px; border: 1px solid #ddd; text-align:center;">
              <button class="btn btn-sm btn-primary editStaffBtn" data-index="${index}" style="padding: 6px 12px;">Edit</button>
            </td>
          </tr>
        `})
      .join("");

    // Note: Edit button clicks are handled via event delegation in attachEventListeners()
    // Do NOT add direct event listeners here as it causes duplicate handlers
  }

  /* -------- OPEN STAFF EDIT MODAL -------- */
  async openStaffEditModal(index) {
    // Prevent multiple simultaneous modal opens
    if (this.isModalLoading) {
      return;
    }
    this.isModalLoading = true;

    // Remove any existing modal first to prevent multiple modals
    const existingModal = document.getElementById("staffEditModal");
    if (existingModal) {
      existingModal.remove();
    }

    const staff = this.eligibleStaff[index];

    // Get all available allowances and deductions from the system
    const apiService = this.getApiService();
    const apiEndpoints = this.getApiEndpoints();

    if (!apiService || !apiEndpoints) {
      alert("API not initialized");
      this.isModalLoading = false;
      return;
    }

    // Fetch ALL allowances and ALL deductions from the API
    let allAllowances = [];
    let allDeductions = [];

    try {
      const [allowancesRes, deductionsRes] = await Promise.all([
        apiService.get(apiEndpoints.ALLOWANCES),
        apiService.get(apiEndpoints.DEDUCTIONS)
      ]);

      if (allowancesRes.success && allowancesRes.data) {
        allAllowances = allowancesRes.data;
      }
      if (deductionsRes.success && deductionsRes.data) {
        allDeductions = deductionsRes.data;
      }
    } catch (error) {
      console.error("[v0] Error loading allowances/deductions:", error);
      this.isModalLoading = false;
      alert("Failed to load allowances/deductions. Please try again.");
      return;
    }

    // Merge ALL allowances with staff's existing allowances (to preserve custom amounts)
    const mergedAllowances = allAllowances.map((a) => {
      const staffAllowance = staff.allowances.find((sa) => sa.id === a.id);
      return {
        id: a.id,
        allowance_name: a.allowance_name,
        is_percentage: a.is_percentage,
        default_amount: parseFloat(a.default_amount) || 0,
        amount: staffAllowance ? (staffAllowance.amount || staffAllowance.default_amount || parseFloat(a.default_amount) || 0) : (parseFloat(a.default_amount) || 0),
        is_bonded: a.is_bonded,
        eligible_status: a.eligible_status
      };
    });

    // Merge ALL deductions with staff's existing deductions
    const mergedDeductions = allDeductions.map((d) => {
      const staffDeduction = staff.deductions.find((sd) => sd.id === d.id);
      return {
        id: d.id,
        deduction_name: d.deduction_name,
        is_percentage: d.is_percentage,
        default_amount: parseFloat(d.default_amount) || 0,
        amount: staffDeduction ? (staffDeduction.amount || staffDeduction.default_amount || parseFloat(d.default_amount) || 0) : (parseFloat(d.default_amount) || 0)
      };
    });

    // Store merged data for use in save/calculate
    staff.allAllowances = mergedAllowances;
    staff.allDeductions = mergedDeductions;

    // Build allowance checkboxes - ALL allowances with checked status based on staff's selection
    const allowanceCheckboxes = mergedAllowances
      .map(
        (a) => `
        <div style="margin: 10px 0; padding: 12px; background: #f9f9f9; border-radius: 4px; display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" id="allow_${a.id}" class="allowanceCheckbox" data-id="${a.id}" data-is-percentage="${a.is_percentage}" ${staff.selectedAllowances.includes(a.id) ? "checked" : ""}>
          <label for="allow_${a.id}" style="flex: 1; margin: 0;">
            <strong>${a.allowance_name || `Allowance ${a.id}`}</strong>
            ${a.is_bonded ? '<span style="color: #ff9800; font-size: 11px; margin-left: 5px;">(Bonded)</span>' : ''}
          </label>
          ${
            a.is_percentage
              ? `<span style="color: #666; font-size: 12px; min-width: 80px;">${a.default_amount || 0}%</span>`
              : `<input type="number" class="allowanceAmountInput" data-id="${a.id}" value="${a.amount || a.default_amount || 0}" style="width: 100px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" step="0.01" min="0">`
          }
        </div>
      `
      )
      .join("");

    const deductionCheckboxes = mergedDeductions
      .map(
        (d) => `
        <div style="margin: 10px 0; padding: 12px; background: #f9f9f9; border-radius: 4px; display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" id="deduct_${d.id}" class="deductionCheckbox" data-id="${d.id}" data-is-percentage="${d.is_percentage}" ${staff.selectedDeductions.includes(d.id) ? "checked" : ""}>
          <label for="deduct_${d.id}" style="flex: 1; margin: 0;">
            <strong>${d.deduction_name || `Deduction ${d.id}`}</strong>
          </label>
          ${
            d.is_percentage
              ? `<span style="color: #666; font-size: 12px; min-width: 80px;">${d.default_amount || 0}%</span>`
              : `<input type="number" class="deductionAmountInput" data-id="${d.id}" value="${d.amount || d.default_amount || 0}" style="width: 100px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" step="0.01" min="0">`
          }
        </div>
      `
      )
      .join("");

    const modal = document.createElement("div");
    modal.id = "staffEditModal";
    modal.style.cssText = `
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.4);
      display: block;
    `;

    // Calculate GHS equivalent for display
    const currencyRate = this.payrollManager.currencyRate || 1.0;
    const basicSalaryGHS = staff.currency === 'USD' ? staff.basicSalary * currencyRate : staff.basicSalary;

    modal.innerHTML = `
      <div style="
        background-color: white;
        margin: 3% auto;
        padding: 20px;
        border-radius: 8px;
        width: 90%;
        max-width: 700px;
        max-height: 85vh;
        overflow-y: auto;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">Edit Payroll - ${staff.name}</h2>
          <span id="closeEditModal" style="font-size: 28px; cursor: pointer; font-weight: bold;">&times;</span>
        </div>

        <div style="margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 4px;">
          <p style="margin: 5px 0;"><strong>Staff:</strong> ${staff.staffNumber} - ${staff.name}</p>
          <p style="margin: 5px 0;"><strong>Department:</strong> ${staff.department}</p>
          <p style="margin: 5px 0;"><strong>Basic Salary:</strong> ${this.payrollManager.formatCurrency(staff.basicSalary, staff.currency)} ${staff.currency}</p>
          ${staff.currency === 'USD' ? `
            <p style="margin: 5px 0; color: #1976d2;"><strong>Exchange Rate:</strong> 1 USD = ${currencyRate.toFixed(4)} GHS</p>
            <p style="margin: 5px 0; color: #1976d2;"><strong>Basic Salary (GHS):</strong> ${this.payrollManager.formatCurrencyGHS(basicSalaryGHS)}</p>
          ` : ''}
        </div>

        ${staff.currency === 'USD' ? `
        <div style="margin-bottom: 20px; padding: 12px; background: #e3f2fd; border-radius: 4px; border-left: 4px solid #1976d2;">
          <p style="margin: 0; font-size: 13px; color: #1565c0;">
            <strong>Note:</strong> This staff's salary is in USD. The net salary will be converted to GHS using the current exchange rate.
          </p>
        </div>
        ` : ''}

        <h3 style="margin: 20px 0 10px 0;">Allowances</h3>
        <div id="allowancesContainer" style="margin-bottom: 20px;">
          ${allowanceCheckboxes || '<p style="color: #999;">No allowances available</p>'}
        </div>

        <h3 style="margin: 20px 0 10px 0;">Deductions</h3>
        <div id="deductionsContainer" style="margin-bottom: 20px;">
          ${deductionCheckboxes || '<p style="color: #999;">No deductions available</p>'}
        </div>

        <div id="editSummary" style="background: #e8f5e9; padding: 15px; border-radius: 4px; margin: 20px 0; border: 2px solid #4caf50;">
          <p style="margin: 5px 0;"><strong>Gross Salary:</strong> <span id="editGrossSalary" style="font-weight: bold; color: #1976d2;">${this.payrollManager.formatCurrency(staff.grossSalary, staff.currency)} ${staff.currency}</span></p>
          <p style="margin: 5px 0;"><strong>Total Allowances:</strong> <span id="editTotalAllow" style="font-weight: bold; color: #4caf50;">+ ${this.payrollManager.formatCurrency(staff.totalAllowances, staff.currency)}</span></p>
          <p style="margin: 5px 0;"><strong>Total Deductions:</strong> <span id="editTotalDeduct" style="font-weight: bold; color: #d32f2f;">- ${this.payrollManager.formatCurrency(staff.totalDeductions, staff.currency)}</span></p>
          <p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 2px solid #4caf50; font-weight: bold; color: #27ae60; font-size: 16px;"><strong>Net Salary (GHS):</strong> <span id="editNetSalary">${this.payrollManager.formatCurrencyGHS(staff.netSalaryGHS)}</span></p>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
          <button class="btn btn-secondary" id="cancelEditBtn" style="padding: 10px 20px;">Cancel</button>
          <button class="btn btn-success" id="saveEditBtn" style="padding: 10px 20px;">Save Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Reset the loading flag now that modal is created
    this.isModalLoading = false;

    // Get references to elements within the modal
    const closeBtn = modal.querySelector("#closeEditModal");
    const cancelBtn = modal.querySelector("#cancelEditBtn");
    const saveBtn = modal.querySelector("#saveEditBtn");
    const modalContent = modal.querySelector("div");

    // Close modal function
    const closeModal = () => {
      this.isModalLoading = false;
      modal.remove();
    };

    // Event listeners using addEventListener for reliability
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });

    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveStaffChanges(modal, staff, index);
    });

    // Live calculation on change - attach to ALL inputs and checkboxes
    modal.querySelectorAll(".allowanceCheckbox, .deductionCheckbox, .allowanceAmountInput, .deductionAmountInput").forEach(
      (elem) => {
        elem.addEventListener("change", () => this.updateEditModalSummary(modal, staff));
        elem.addEventListener("input", () => this.updateEditModalSummary(modal, staff));
      }
    );

    // Close modal when clicking on the backdrop (outside modal content)
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Prevent clicks inside modal content from closing the modal
    modalContent.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  saveStaffChanges(modal, staff, index) {
    // Ensure selectedAllowances and selectedDeductions are initialized
    if (!staff.selectedAllowances) {
      staff.selectedAllowances = [];
    }
    if (!staff.selectedDeductions) {
      staff.selectedDeductions = [];
    }

    const selectedAllowanceIds = Array.from(
      modal.querySelectorAll(".allowanceCheckbox:checked")
    ).map((cb) => parseInt(cb.getAttribute("data-id")));

    const selectedDeductionIds = Array.from(
      modal.querySelectorAll(".deductionCheckbox:checked")
    ).map((cb) => parseInt(cb.getAttribute("data-id")));

    // Update staff object with selected allowances and deductions
    staff.selectedAllowances = selectedAllowanceIds;
    staff.selectedDeductions = selectedDeductionIds;

    // Use allAllowances/allDeductions if available (merged list), otherwise fall back to staff.allowances/deductions
    const allowancesList = staff.allAllowances || staff.allowances;
    const deductionsList = staff.allDeductions || staff.deductions;

    // Update amounts for allowances
    modal.querySelectorAll(".allowanceAmountInput").forEach((input) => {
      const allowanceId = parseInt(input.getAttribute("data-id"));
      const allowance = allowancesList.find((a) => a.id === allowanceId);
      if (allowance) {
        allowance.amount = parseFloat(input.value) || allowance.default_amount || 0;
      }
    });

    // Update amounts for deductions
    modal.querySelectorAll(".deductionAmountInput").forEach((input) => {
      const deductionId = parseInt(input.getAttribute("data-id"));
      const deduction = deductionsList.find((d) => d.id === deductionId);
      if (deduction) {
        deduction.amount = parseFloat(input.value) || deduction.default_amount || 0;
      }
    });

    // Update staff.allowances and staff.deductions to only include selected items with updated amounts
    staff.allowances = selectedAllowanceIds.map((id) => {
      const a = allowancesList.find((al) => al.id === id);
      return a ? { ...a } : null;
    }).filter(Boolean);

    staff.deductions = selectedDeductionIds.map((id) => {
      const d = deductionsList.find((de) => de.id === id);
      return d ? { ...d } : null;
    }).filter(Boolean);

    // Recalculate payroll with updated values
    this.calculateStaffPayroll(staff);

    // Update the table and close modal
    this.renderBulkPayrollTable();
    modal.remove();
  }

  /* -------- UPDATE EDIT MODAL SUMMARY ON CHANGES -------- */
  updateEditModalSummary(modal, staff) {
    const selectedAllowanceIds = Array.from(
      modal.querySelectorAll(".allowanceCheckbox:checked")
    ).map((cb) => parseInt(cb.getAttribute("data-id")));

    const selectedDeductionIds = Array.from(
      modal.querySelectorAll(".deductionCheckbox:checked")
    ).map((cb) => parseInt(cb.getAttribute("data-id")));

    // Use allAllowances/allDeductions if available (merged list), otherwise fall back to staff.allowances/deductions
    const allowancesList = staff.allAllowances || staff.allowances;
    const deductionsList = staff.allDeductions || staff.deductions;

    let totalAllowances = 0;
    let totalDeductions = 0;

    // Use original basic salary for calculations (no currency conversion for allowances/deductions)
    const basicSalary = staff.basicSalary;

    // Calculate total allowances (based on original basic salary)
    selectedAllowanceIds.forEach((allowanceId) => {
      const allowance = allowancesList.find((a) => a.id === allowanceId);
      if (allowance) {
        if (allowance.is_percentage) {
          // Percentage of original basic salary
          totalAllowances += (basicSalary * (allowance.default_amount || allowance.amount || 0)) / 100;
        } else {
          // Fixed amount - get value from input if available
          const input = modal.querySelector(`.allowanceAmountInput[data-id="${allowanceId}"]`);
          const amount = input ? parseFloat(input.value) || allowance.amount || allowance.default_amount || 0 : (allowance.amount || allowance.default_amount || 0);
          totalAllowances += amount;
        }
      }
    });

    // Calculate total deductions (based on original basic salary)
    selectedDeductionIds.forEach((deductionId) => {
      const deduction = deductionsList.find((d) => d.id === deductionId);
      if (deduction) {
        if (deduction.is_percentage) {
          // Percentage of original basic salary
          totalDeductions += (basicSalary * (deduction.default_amount || deduction.amount || 0)) / 100;
        } else {
          // Fixed amount - get value from input if available
          const input = modal.querySelector(`.deductionAmountInput[data-id="${deductionId}"]`);
          const amount = input ? parseFloat(input.value) || deduction.amount || deduction.default_amount || 0 : (deduction.amount || deduction.default_amount || 0);
          totalDeductions += amount;
        }
      }
    });

    // Calculate gross and net salaries in original currency
    const grossSalary = basicSalary + totalAllowances;
    const netSalary = grossSalary - totalDeductions;

    // Only convert net salary to GHS for USD staff (for display)
    const currencyRate = this.payrollManager.currencyRate || 1.0;
    const netSalaryGHS = staff.currency === 'USD' ? netSalary * currencyRate : netSalary;

    // Update summary display
    // Use modal.querySelector to ensure we're updating elements within this modal
    const grossSalaryEl = modal.querySelector("#editGrossSalary");
    const totalAllowEl = modal.querySelector("#editTotalAllow");
    const totalDeductEl = modal.querySelector("#editTotalDeduct");
    const netSalaryEl = modal.querySelector("#editNetSalary");

    // Display in original currency for basic salary, allowances, deductions
    // Display net salary in GHS (converted for USD staff)
    const currency = staff.currency || 'GHS';
    if (grossSalaryEl) grossSalaryEl.textContent = `${this.payrollManager.formatCurrency(grossSalary, currency)} ${currency}`;
    if (totalAllowEl) totalAllowEl.textContent = `+ ${this.payrollManager.formatCurrency(totalAllowances, currency)}`;
    if (totalDeductEl) totalDeductEl.textContent = `- ${this.payrollManager.formatCurrency(totalDeductions, currency)}`;
    if (netSalaryEl) netSalaryEl.textContent = `${this.payrollManager.formatCurrencyGHS(netSalaryGHS)}`;
  }

  /* -------- SUBMIT BULK PAYROLL -------- */
  async submitBulkPayroll() {
    // Prevent double-submission
    if (this.isSubmitting) {
      return;
    }

    const apiService = this.getApiService();
    const apiEndpoints = this.getApiEndpoints();

    if (!this.eligibleStaff || this.eligibleStaff.length === 0) {
      alert("No staff data to submit");
      return;
    }

    if (!confirm(`Submit payroll for ${this.eligibleStaff.length} staff members?`)) {
      return;
    }

    // Set submitting flag
    this.isSubmitting = true;

    try {
      const payrollData = this.eligibleStaff.map((staff) => ({
        staff_id: staff.id,
        payroll_entry_id: staff.payroll_entry_id,
        basic_salary: staff.basicSalary,
        total_allowances: staff.totalAllowances,
        total_deductions: staff.totalDeductions,
        gross_salary: staff.grossSalary,
        net_salary: staff.netSalary,
        net_salary_ghs: staff.netSalaryGHS,
        currency_rate: staff.currencyRate,
        allowances: staff.selectedAllowances.map((id) => {
          const allowance = staff.allowances.find((a) => a.id === id);
          const isPercentage = allowance?.is_percentage ? 1 : 0;
          // For percentages, the percentage value is stored in default_amount
          const percentageValue = isPercentage ? (allowance?.default_amount || allowance?.amount || 0) : 0;
          // For fixed amounts, use the amount; for percentages, the backend will calculate
          const amount = isPercentage ? 0 : (allowance?.amount || allowance?.default_amount || 0);
          return {
            allowance_id: id,
            amount: amount,
            is_percentage: isPercentage,
            percentage_value: percentageValue,
          };
        }),
        deductions: staff.selectedDeductions.map((id) => {
          const deduction = staff.deductions.find((d) => d.id === id);
          const isPercentage = deduction?.is_percentage ? 1 : 0;
          // For percentages, the percentage value is stored in default_amount
          const percentageValue = isPercentage ? (deduction?.default_amount || deduction?.amount || 0) : 0;
          // For fixed amounts, use the amount; for percentages, the backend will calculate
          const amount = isPercentage ? 0 : (deduction?.amount || deduction?.default_amount || 0);
          return {
            deduction_id: id,
            amount: amount,
            is_percentage: isPercentage,
            percentage_value: percentageValue,
          };
        }),
      }));

      const submitRes = await apiService.post(apiEndpoints.PAYROLL_BULK_ENTRIES, {
        payroll_period_id: this.payrollPeriodId,
        entries: payrollData,
      });

      if (submitRes.success) {
        alert("Payroll submitted successfully!");
        this.eligibleStaff = [];
        document.getElementById("bulkPayrollContainer").style.display = "none";
        document.getElementById("emptyState").style.display = "block";
      } else {
        alert(`Failed to submit payroll: ${submitRes.message}`);
      }
    } catch (error) {
      console.error("[v0] Error submitting payroll:", error);
      alert(`Error submitting payroll: ${error.message}`);
    } finally {
      // Reset submitting flag
      this.isSubmitting = false;
    }
  }

  /* -------- ATTACH EVENT LISTENERS -------- */
  attachEventListeners() {
    // Prevent attaching listeners multiple times
    if (this.listenersAttached) {
      return;
    }
    this.listenersAttached = true;

    document.getElementById("loadStaffBtn")?.addEventListener("click", () => {
      this.loadEligibleStaff();
    });

    document.getElementById("submitBulkBtn")?.addEventListener("click", () => {
      this.submitBulkPayroll();
    });

    document.getElementById("cancelBulkBtn")?.addEventListener("click", () => {
      const bulkContainer = document.getElementById("bulkPayrollContainer");
      const emptyState = document.getElementById("emptyState");
      if (bulkContainer) bulkContainer.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      this.eligibleStaff = [];
    });

    // Event delegation for edit buttons - scoped to payroll container
    const bulkContainer = document.getElementById("bulkPayrollContainer");
    if (bulkContainer) {
      bulkContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("editStaffBtn")) {
          const index = parseInt(e.target.getAttribute("data-index"));
          this.openStaffEditModal(index);
        }
      });

      // Event delegation for basic salary changes
      bulkContainer.addEventListener("change", (e) => {
        if (e.target.classList.contains("basicSalaryInput")) {
          const index = parseInt(e.target.getAttribute("data-index"));
          const staff = this.eligibleStaff[index];
          if (staff) {
            staff.basicSalary = parseFloat(e.target.value) || 0;
            this.calculateStaffPayroll(staff);
            this.renderBulkPayrollTable();
          }
        }
      });
    }
  }
}

// Export for use by dashboard.js router
window.processPayrollPage = new ProcessPayrollPage();
