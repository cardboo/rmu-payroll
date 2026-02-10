class StaffsPage {
	constructor() {
  this.crudManager = new window.CRUDManager(
    window.API_ENDPOINTS.STAFFS,
    "staff"
  );
  this.currentEditId = null;
  this.currentEditStaff = null; // ✅ ADD THIS
  this.showArchived = false;
  this.departments = [];
  this.designations = [];
  this.allowances = [];
  this.deductions = [];
  this.selectedAllowances = [];
  this.selectedDeductions = [];
  this.currentStep = 1;
}

updateStaffSummary() {
  const staffNumber = document.getElementById("staffNumber").value;
  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const status = document.getElementById("status").value;
  const salary = parseFloat(document.getElementById("basicSalary").value || 0);
  const onLeave = document.getElementById("onLeave").checked;

  const formattedSalary = salary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  document.getElementById("summaryName").textContent =
    `${staffNumber} — ${firstName} ${lastName}`;

  document.getElementById("summaryMeta").textContent =
    `Status: ${status} | Basic Salary: ${document.getElementById("currencyLabel").textContent} ${formattedSalary} | On Leave: ${onLeave ? "Yes" : "No"}`;

  document.getElementById("staffSummary").classList.remove("hidden");
}


	render() {
		return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Staff Management</h2>
          <div style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <input type="checkbox" id="showArchivedStaffs" ${
								this.showArchived ? "checked" : ""
							}>
              Show Archived
            </label>
            <button class="btn btn-primary" id="addStaffBtn">Add New Staff</button>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Staff Number</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Basic Salary</th>
                <th>Status</th>
                <th>Leave Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="staffsTableBody">
              <tr>
                <td colspan="8" style="text-align: center;">Loading...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Staff Modal with Multi-Step Form -->
      <div class="modal" id="staffModal">
        <div class="modal-content" style="max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3 class="modal-title" id="staffModalTitle">Add New Staff</h3>
            <button class="modal-close" id="closeStaffModal">&times;</button>
          </div>
          <div class="modal-body">
				<div id="staffSummary" class="staff-summary hidden">
				<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
					<i class="fa fa-user"></i>
					<strong id="summaryName"></strong>
				</div>
				<span id="summaryMeta"></span>
				</div>


            <!-- Step Indicator -->
            <div style="display: flex; justify-content: space-between; margin-bottom: 24px; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="step-indicator ${
									this.currentStep === 1 ? "active" : ""
								}" style="width: 40px; height: 40px; border-radius: 50%; background: ${
			this.currentStep === 1 ? "#007bff" : "#e0e0e0"
		}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">1</div>
                <span>Staff Details</span>
              </div>
              <div style="flex: 1; height: 2px; background: ${
								this.currentStep > 1 ? "#007bff" : "#e0e0e0"
							}; margin: 0 12px;"></div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="step-indicator ${
									this.currentStep === 2 ? "active" : ""
								}" style="width: 40px; height: 40px; border-radius: 50%; background: ${
			this.currentStep === 2 ? "#007bff" : "#e0e0e0"
		}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">2</div>
                <span>Allowances</span>
              </div>
              <div style="flex: 1; height: 2px; background: ${
								this.currentStep > 2 ? "#007bff" : "#e0e0e0"
							}; margin: 0 12px;"></div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="step-indicator ${
									this.currentStep === 3 ? "active" : ""
								}" style="width: 40px; height: 40px; border-radius: 50%; background: ${
			this.currentStep === 3 ? "#007bff" : "#e0e0e0"
		}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">3</div>
                <span>Deductions</span>
              </div>
            </div>

            <form id="staffForm">
              <!-- Step 1: Staff Details -->
              <div id="step1" class="form-step" style="display: ${
								this.currentStep === 1 ? "block" : "none"
							};">
                <div class="form-row">
                  <div class="form-group">
                    <label>Staff Number *</label>
                    <input type="text" id="staffNumber" required placeholder="e.g., STF001">
                  </div>
                  <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" id="firstName" required placeholder="John">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Last Name *</label>
                    <input type="text" id="lastName" required placeholder="Doe">
                  </div>
                  <div class="form-group">
                    <label>Other Names</label>
                    <input type="text" id="otherNames" placeholder="Middle name(s)">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>SSNIT</label>
                    <input type="text" id="ssnit" placeholder="SSNIT Number">
                  </div>
                  <div class="form-group">
                    <label>Ghana Card Number</label>
                    <input type="text" id="ghanacard" placeholder="GHA-XXXX-XXXX-XXXX">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Department *</label>
                    <select id="departmentId" required>
                      <option value="">Select Department</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Designation *</label>
                    <select id="designationId" required>
                      <option value="">Select Designation</option>
                    </select>
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Status *</label>
                  <select id="status" required onchange="staffsPage.updateCurrencyLabel()">
                    <option value="">Select Status</option>
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>

                <!-- Add leave status checkbox -->
                <div class="form-group">
                  <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="onLeave">
                    On Bonded or Study Leave
                  </label>
                </div>

                <!-- Dependents section -->
                <div class="form-group">
                  <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="hasDependents" onchange="staffsPage.toggleDependentsInput()">
                    Has Dependents
                  </label>
                </div>
                <div class="form-group" id="dependentsInputGroup" style="display: none;">
                  <label>Number of Dependents (max 3)</label>
                  <input type="number" id="numberOfDependents" min="1" max="3" value="1" placeholder="1-3">
                  <small style="color: #666; font-size: 11px;">This will multiply the dependents allowance value when saved</small>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Basic Salary (<span id="currencyLabel">USD</span>) *</label>
                    <input type="number" id="basicSalary" required step="0.01" min="0" placeholder="0.00">
                  </div>
                  <div class="form-group">
                    <label>Date Hired</label>
                    <input type="date" id="dateHired">
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Bank Name</label>
                    <input type="text" id="bankName" placeholder="e.g., GCB Bank">
                  </div>
                  <div class="form-group">
                    <label>Account Number</label>
                    <input type="text" id="accountNumber" placeholder="Bank account number">
                  </div>
                </div>
              </div>

              <!-- Step 2: Allowances -->
              <div id="step2" class="form-step" style="display: ${
								this.currentStep === 2 ? "block" : "none"
							};">
                <div class="form-group">
                  <label style="font-weight: bold; margin-bottom: 16px; display: block;">Select Applicable Allowances</label>
                  <div id="allowancesContainer" style="border: 1px solid #ddd; padding: 12px; border-radius: 4px; max-height: 300px; overflow-y: auto;">
                    <!-- Allowances will be populated here -->
                  </div>
                </div>
              </div>

              <!-- Step 3: Deductions -->
              <div id="step3" class="form-step" style="display: ${
								this.currentStep === 3 ? "block" : "none"
							};">
                <div class="form-group">
                  <label style="font-weight: bold; margin-bottom: 16px; display: block;">Select Applicable Deductions</label>
                  <div id="deductionsContainer" style="border: 1px solid #ddd; padding: 12px; border-radius: 4px; max-height: 300px; overflow-y: auto;">
                    <!-- Deductions will be populated here -->
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelStaffBtn">Cancel</button>
            <button class="btn btn-secondary" id="prevStaffBtn" style="display: ${
							this.currentStep > 1 ? "inline-block" : "none"
						};">Previous</button>
            <button class="btn btn-primary" id="nextStaffBtn" style="display: ${
							this.currentStep < 3 ? "inline-block" : "none"
						};">Next</button>
            <button class="btn btn-primary" id="saveStaffBtn" style="display: ${
							this.currentStep === 3 ? "inline-block" : "none"
						};">Save Staff</button>
          </div>
        </div>
      </div>
    `;
	}

	async loadDepartmentsAndDesignations() {
		try {
			const [
				deptResponse,
				desigResponse,
				allowancesResponse,
				deductionsResponse,
			] = await Promise.all([
				window.ApiService.get(window.API_ENDPOINTS.DEPARTMENTS),
				window.ApiService.get(window.API_ENDPOINTS.DESIGNATIONS),
				window.ApiService.get(window.API_ENDPOINTS.ALLOWANCES),
				window.ApiService.get(window.API_ENDPOINTS.DEDUCTIONS),
			]);

			if (deptResponse.success) {
				this.departments = deptResponse.data.filter((d) => !d.is_archived);
			}

			if (desigResponse.success) {
				this.designations = desigResponse.data.filter((d) => !d.is_archived);
			}

			if (allowancesResponse.success) {
				this.allowances = allowancesResponse.data.filter((a) => !a.is_archived);
			}

			if (deductionsResponse.success) {
				this.deductions = deductionsResponse.data.filter((d) => !d.is_archived);
			}

			this.populateDropdowns();
		} catch (error) {
			console.error("Error loading departments and designations:", error);
		}
	}

	populateDropdowns() {
		const deptSelect = document.getElementById("departmentId");
		const desigSelect = document.getElementById("designationId");

		if (deptSelect) {
			deptSelect.innerHTML =
				'<option value="">Select Department</option>' +
				this.departments
					.map((d) => `<option value="${d.id}">${d.department_name}</option>`)
					.join("");
		}

		if (desigSelect) {
			desigSelect.innerHTML =
				'<option value="">Select Designation</option>' +
				this.designations
					.map(
						(d) =>
							`<option value="${d.id}">${d.designation_name} (${d.designation_code})</option>`
					)
					.join("");
		}

		this.populateAllowancesAndDeductions();
	}

populateAllowancesAndDeductions() {
  const allowancesContainer = document.getElementById("allowancesContainer");
  const deductionsContainer = document.getElementById("deductionsContainer");
  const onLeave = document.getElementById("onLeave")?.checked || false;
  const status = document.getElementById("status")?.value;

  // --- ALLOWANCES ---
  if (allowancesContainer) {
    const filteredAllowances = this.allowances.filter(a => {
      if (a.eligible_status !== 'both' && a.eligible_status !== status) return false;
      if (onLeave && !a.allowed_on_leave) return false;
      return true;
    });

    const staffAllowanceMap = new Map(
      (this.currentEditStaff?.allowances || []).map(a => [a.id, a])
    );

    const mergedAllowances = filteredAllowances.map(a => {
      const staffA = staffAllowanceMap.get(a.id);
      return { ...a, staff_amount: staffA?.amount ?? null };
    });

    allowancesContainer.innerHTML = mergedAllowances.map(a => {
      const isFixed = a.is_percentage === 0;
      const checked = this.currentEditStaff?.allowances?.some(x => x.id === a.id) ? 'checked' : '';

      // For dependents allowance, always show the base default_amount (not the multiplied stored value)
      // This allows proper recalculation when number of dependents changes
      const allowanceName = (a.allowance_name || '').toLowerCase();
      const isDependentsAllowance = allowanceName.includes('dependent');

      let displayAmount;
      if (isDependentsAllowance) {
        // For dependents allowance, always show the base value from allowances table
        displayAmount = a.default_amount;
      } else {
        // For other allowances, show staff's custom amount or default
        displayAmount = this.currentEditStaff?.allowances?.find(x => x.id === a.id)?.amount ?? a.default_amount;
      }

      const amountField = isFixed
        ? `<input type="number"
            class="allowance-amount"
            data-id="${a.id}"
            data-is-dependents="${isDependentsAllowance ? '1' : '0'}"
            value="${displayAmount}"
            step="0.01"
            min="0"
            style="width: 90px; margin-left: auto;"
            ${checked ? '' : 'disabled'}>`
        : `<span style="font-size:12px; color:#666;">${a.default_amount}%</span>`;

      // Add hint for dependents allowance
      const dependentsHint = isDependentsAllowance
        ? `<span class="dependents-hint" data-allowance-id="${a.id}" style="font-size:11px; color:#1976d2; margin-left:4px;"></span>`
        : '';

      return `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <label style="flex:1; display:flex; gap:8px; align-items:center;">
            <input type="checkbox"
              class="allowance-checkbox"
              value="${a.id}"
              data-is-percentage="${a.is_percentage}"
              data-is-dependents="${isDependentsAllowance ? '1' : '0'}"
              ${checked}>
            ${a.allowance_name} (${a.allowance_code})
            ${dependentsHint}
          </label>
          ${amountField}
        </div>`;
    }).join("");

    // Update dependents hint based on current dependents count
    this.updateDependentsHint();

    document.querySelectorAll('.allowance-checkbox').forEach(cb => {
      const amountInput = document.querySelector(`.allowance-amount[data-id="${cb.value}"]`);
      if(amountInput) {
        cb.addEventListener('change', () => {
          amountInput.disabled = !cb.checked;
          // Update dependents hint when checkbox changes
          if (cb.getAttribute('data-is-dependents') === '1') {
            this.updateDependentsHint();
          }
        });
        // Update hint when amount changes for dependents allowance
        if (cb.getAttribute('data-is-dependents') === '1') {
          amountInput.addEventListener('input', () => this.updateDependentsHint());
        }
      }
    });

    // Add listener for number of dependents input to update hint
    const dependentsInput = document.getElementById('numberOfDependents');
    if (dependentsInput) {
      dependentsInput.addEventListener('input', () => this.updateDependentsHint());
    }
  }

  // --- DEDUCTIONS ---
if (deductionsContainer) {
  const staffDeductionMap = new Map(
    (this.currentEditStaff?.deductions || []).map(d => [d.id, d])
  );

  deductionsContainer.innerHTML = this.deductions.map(d => {
    const isFixed = d.is_percentage === 0; // Fixed if not percentage
    const checked = this.currentEditStaff?.deductions?.some(x => x.id === d.id) ? 'checked' : '';

    const amountField = isFixed
      ? `<input type="number"
          class="deduction-amount"
          data-id="${d.id}"
          value="${staffDeductionMap.get(d.id)?.amount ?? d.default_amount}"
          step="0.01"
          min="0"
          style="width: 90px; margin-left: auto;"
          ${checked ? '' : 'disabled'}>`
      : `<span style="font-size:12px; color:#666;">${d.default_amount}%</span>`;

    return `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <label style="flex:1; display:flex; gap:8px;">
          <input type="checkbox"
            class="deduction-checkbox"
            value="${d.id}"
            data-is-percentage="${d.is_percentage}"
            ${checked}>
          ${d.deduction_name} (${d.deduction_code})
        </label>
        ${amountField}
      </div>`;
  }).join("");

  // Enable/disable input fields dynamically
  document.querySelectorAll('.deduction-checkbox').forEach(cb => {
    const amountInput = document.querySelector(`.deduction-amount[data-id="${cb.value}"]`);
    if (amountInput) {
      cb.addEventListener('change', () => {
        amountInput.disabled = !cb.checked;
      });
    }
  });
}


}


	 applyStaffAllowances(staffAllowances = []) {
    staffAllowances.forEach(a => {
      const checkbox = document.querySelector(
        `.allowance-checkbox[value="${a.id}"]`
      );

      if (!checkbox) return;

      checkbox.checked = true;

      if (a.is_percentage === 0) {
        const amountInput = document.querySelector(
          `.allowance-amount[data-id="${a.id}"]`
        );
        if (amountInput) {
          amountInput.value = a.amount;
        }
      }
    });
  }

  // ✅ ADD THIS
  applyStaffDeductions(staffDeductions = []) {
    staffDeductions.forEach(d => {
      const checkbox = document.querySelector(
        `.deduction-checkbox[value="${d.id}"]`
      );

      if (!checkbox) return;

      checkbox.checked = true;

      if (d.is_percentage === 0) {
        const amountInput = document.querySelector(
          `.deduction-amount[data-id="${d.id}"]`
        );
        if (amountInput) {
          amountInput.value = d.amount;
        }
      }
    });
  }

	attachEventListeners() {
		const nextBtn = document.getElementById("nextStaffBtn");
		const prevBtn = document.getElementById("prevStaffBtn");
		const saveBtn = document.getElementById("saveStaffBtn");

		nextBtn.replaceWith(nextBtn.cloneNode(true));
		prevBtn.replaceWith(prevBtn.cloneNode(true));
		saveBtn.replaceWith(saveBtn.cloneNode(true));

		document
			.getElementById("nextStaffBtn")
			.addEventListener("click", () => this.nextStep());
		document
			.getElementById("prevStaffBtn")
			.addEventListener("click", () => this.previousStep());
		document
			.getElementById("saveStaffBtn")
			.addEventListener("click", () => this.saveStaff());

		// Other listeners
		document
			.getElementById("addStaffBtn")
			.addEventListener("click", () => this.openModal());
		document
			.getElementById("closeStaffModal")
			.addEventListener("click", () => this.closeModal());
		document
			.getElementById("cancelStaffBtn")
			.addEventListener("click", () => this.closeModal());
	}

	async loadStaffs() {
		try {
			const response = await this.crudManager.getAll(this.showArchived);
			const tbody = document.getElementById("staffsTableBody");

			if (response.success && response.data.length > 0) {
				tbody.innerHTML = response.data
					.map(
						(staff) => `
          <tr>
            <td><strong>${staff.staff_number}</strong></td>
            <td>${staff.first_name} ${staff.last_name}${
							staff.other_names ? " " + staff.other_names : ""
						}</td>
            <td>${staff.department_name || "-"}</td>
            <td>${staff.designation_name || "-"}</td>
           <td>${staff.salary_currency} ${Number.parseFloat(staff.basic_salary)
			.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

            <td><span class="badge ${
							staff.is_archived ? "badge-danger" : "badge-success"
						}">${staff.is_archived ? "Archived" : "Active"}</span></td>
            <td><span class="badge ${
							staff.on_bonded_or_study_leave ? "badge-warning" : "badge-info"
						}">${
							staff.on_bonded_or_study_leave ? "On Leave" : "Active"
						}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="staffsPage.editStaff(${
									staff.id
								})">Edit</button>
                ${
									!staff.is_archived
										? `<button class="btn btn-sm btn-warning" onclick="staffsPage.archiveStaff(${staff.id})">Archive</button>`
										: `<button class="btn btn-sm btn-success" onclick="staffsPage.unarchiveStaff(${staff.id})">Unarchive</button>`
								}
                <button class="btn btn-sm btn-danger" onclick="staffsPage.deleteStaff(${
									staff.id
								})">Delete</button>
              </div>
            </td>
          </tr>
        `
					)
					.join("");
			} else {
				tbody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <div class="empty-state-text">No staff members found</div>
              </div>
            </td>
          </tr>
        `;
			}
		} catch (error) {
			console.error("Error loading staffs:", error);
			alert("Failed to load staff members");
		}
	}

	openModal(staff = null) {
		this.currentEditId = staff ? staff.id : null;
		this.selectedAllowances = [];
		this.selectedDeductions = [];
		this.currentStep = 1;
		const modal = document.getElementById("staffModal");
		const title = document.getElementById("staffModalTitle");
		const form = document.getElementById("staffForm");

		title.textContent = staff ? "Edit Staff" : "Add New Staff";
		form.reset();

		if (staff) {
			document.getElementById("staffNumber").value = staff.staff_number;
			document.getElementById("firstName").value = staff.first_name;
			document.getElementById("lastName").value = staff.last_name;
			document.getElementById("otherNames").value = staff.other_names || "";
			document.getElementById("ssnit").value = staff.ssnit || "";
			document.getElementById("ghanacard").value = staff.ghana_card || "";
			document.getElementById("departmentId").value = staff.department_id || "";
			document.getElementById("designationId").value =
				staff.designation_id || "";
			document.getElementById("status").value = staff.status || "";
			document.getElementById("onLeave").checked =
				staff.on_bonded_or_study_leave || false;
			document.getElementById("basicSalary").value = staff.basic_salary;
			document.getElementById("dateHired").value = staff.hire_date || "";
			document.getElementById("bankName").value = staff.bank_name || "";
			document.getElementById("accountNumber").value =
				staff.account_number || "";

			// Handle dependents field
			const numberOfDependents = parseInt(staff.number_of_dependents) || 0;
			document.getElementById("hasDependents").checked = numberOfDependents > 0;
			document.getElementById("numberOfDependents").value = numberOfDependents;
			document.getElementById("dependentsInputGroup").style.display = numberOfDependents > 0 ? "block" : "none";

			this.updateCurrencyLabel();

			this.populateAllowancesAndDeductions();

			console.log("[v0] Staff data:", staff);
			console.log("[v0] Staff allowances:", staff.allowances);
			console.log("[v0] Staff deductions:", staff.deductions);

			
							if (staff) {
				this.currentEditStaff = staff; // ✅ store staff being edited
				}

				this.populateAllowancesAndDeductions();

		}

		modal.classList.add("active");
		this.updateStepDisplay();
	}

	closeModal() {
		document.getElementById("staffModal").classList.remove("active");
		this.currentEditId = null;
		this.selectedAllowances = [];
		this.selectedDeductions = [];
		this.currentStep = 1;
	}

	nextStep() {
  if (this.currentStep === 1) {
    // Step 1 validation
    const requiredFields = [
      "staffNumber",
      "firstName",
      "lastName",
      "ssnit",
      "ghanacard",
      "departmentId",
      "designationId",
      "status",
      "basicSalary",
    ];

    for (const id of requiredFields) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        this.crudManager.showMessage(
          "Please fill in all required fields in Step 1",
          "error"
        );
        return;
      }
    }

    // ✅ SHOW STAFF SUMMARY HERE
    this.updateStaffSummary();

    // Populate allowances
    this.populateAllowancesAndDeductions();

    this.currentStep = 2;
    this.updateStepDisplay();
  } 
  else if (this.currentStep === 2) {
    this.currentStep = 3;
    this.updateStepDisplay();
  }
}


	previousStep() {
		if (this.currentStep > 1) {
			this.currentStep--;
			this.updateStepDisplay();
		}
	}

	updateStepDisplay() {
		if (this.currentStep === 1) {
  document.getElementById("staffSummary").classList.add("hidden");
}

		document.getElementById("step1").style.display = "none";
		document.getElementById("step2").style.display = "none";
		document.getElementById("step3").style.display = "none";

		document.getElementById(`step${this.currentStep}`).style.display = "block";

		document.getElementById("prevStaffBtn").style.display =
			this.currentStep > 1 ? "inline-block" : "none";
		document.getElementById("nextStaffBtn").style.display =
			this.currentStep < 3 ? "inline-block" : "none";
		document.getElementById("saveStaffBtn").style.display =
			this.currentStep === 3 ? "inline-block" : "none";

		const stepIndicators = document.querySelectorAll(".step-indicator");
		stepIndicators.forEach((indicator, index) => {
			const stepNumber = index + 1;
			indicator.style.background =
				stepNumber <= this.currentStep ? "#007bff" : "#e0e0e0";
		});
	}

	async saveStaff() {
		const staffNumber = document.getElementById("staffNumber").value.trim();
		const firstName = document.getElementById("firstName").value.trim();
		const lastName = document.getElementById("lastName").value.trim();
		const otherNames = document.getElementById("otherNames").value.trim();
		const ssnit = document.getElementById("ssnit").value.trim();
		const ghanacard = document.getElementById("ghanacard").value.trim();
		const departmentId = document.getElementById("departmentId").value;
		const designationId = document.getElementById("designationId").value;
		const status = document.getElementById("status").value;
		const basicSalary = document.getElementById("basicSalary").value;
		const hireDate = document.getElementById("dateHired").value;
		const bankName = document.getElementById("bankName").value.trim();
		const accountNumber = document.getElementById("accountNumber").value.trim();
		const onLeave = document.getElementById("onLeave").checked;
		const hasDependents = document.getElementById("hasDependents").checked;
		let numberOfDependents = hasDependents ? parseInt(document.getElementById("numberOfDependents").value) || 0 : 0;
		// Ensure max 3 dependents
		if (numberOfDependents > 3) numberOfDependents = 3;
		if (numberOfDependents < 0) numberOfDependents = 0;

		if (
			!staffNumber ||
			!firstName ||
			!lastName ||
			!ssnit ||
			!ghanacard ||
			!departmentId ||
			!designationId ||
			!status ||
			!basicSalary
		) {
			this.crudManager.showMessage(
				"Please fill in all required fields",
				"error"
			);
			return;
		}

		const selectedAllowances = [];
document.querySelectorAll(".allowance-checkbox:checked").forEach(cb => {
  const allowanceId = parseInt(cb.value);
  const allowance = this.allowances.find(a => a.id === allowanceId);
  if (!allowance) return;

  if (Number(allowance.is_percentage) === 1 || allowance.is_percentage === true) {
    selectedAllowances.push({
      id: allowanceId,
      amount: allowance.default_amount, // % value
      is_percentage: 1
    });
  } else {
    const amountInput = document.querySelector(`.allowance-amount[data-id="${allowanceId}"]`);
    let fixedAmount = amountInput && amountInput.value !== ""
      ? parseFloat(amountInput.value)
      : allowance.default_amount;

    // Check if this is the dependents allowance - multiply by number of dependents
    const allowanceName = (allowance.allowance_name || '').toLowerCase();
    if (allowanceName.includes('dependent') && numberOfDependents > 0) {
      // Multiply the base amount by the number of dependents
      fixedAmount = fixedAmount * numberOfDependents;
    }

    selectedAllowances.push({
      id: allowanceId,
      amount: fixedAmount,  // customized per staff (multiplied if dependents allowance)
      is_percentage: 0
    });
  }
});



		const selectedDeductions = [];

		Array.from(
			document.querySelectorAll(".deduction-checkbox:checked")
		).forEach((cb) => {
			const deductionId = Number.parseInt(cb.value);
			const deduction = this.deductions.find((d) => d.id === deductionId);

			if (deduction && (Number(deduction.is_percentage) === 1 || deduction.is_percentage === true)) {
				selectedDeductions.push({
					id: deductionId,
					amount: deduction.default_amount,
					is_percentage: 1,
				});
			} else {
				const amountInput = document.querySelector(
					`.deduction-amount[data-id="${deductionId}"]`
				);
				const fixedAmount = amountInput
					? Number.parseFloat(amountInput.value) || 0
					: 0;
				selectedDeductions.push({
					id: deductionId,
					amount: fixedAmount,
					is_percentage: 0,
				});
			}
		});

		const salaryCurrency = status === "permanent" ? "USD" : "GHS";

		const data = {
			staff_number: staffNumber,
			first_name: firstName,
			last_name: lastName,
			other_names: otherNames || null,
			ssnit: ssnit,
			ghanacard: ghanacard,
			department_id: Number.parseInt(departmentId),
			designation_id: Number.parseInt(designationId),
			status: status,
			salary_currency: salaryCurrency,
			basic_salary: Number.parseFloat(basicSalary),
			hire_date: hireDate || null,
			bank_name: bankName || null,
			account_number: accountNumber || null,
			on_bonded_or_study_leave: onLeave,
			number_of_dependents: numberOfDependents,
			allowances: selectedAllowances,
			deductions: selectedDeductions,
		};

		try {
			const response = await this.crudManager.save(data, this.currentEditId);
			console.log("[v0] Save staff response:", response);
			if (response.success) {
				this.crudManager.showMessage(
					this.currentEditId
						? "Staff updated successfully!"
						: "Staff created successfully!",
					"success"
				);
				this.closeModal();
				await this.loadStaffs();
			} else {
				this.crudManager.showMessage(
					response.message || "An error occurred while saving the staff",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error saving staff:", error);
			this.crudManager.showMessage(
				"An error occurred while saving the staff",
				"error"
			);
		}
	}

	async editStaff(id) {
		try {
			const response = await this.crudManager.getById(id);
			if (response.success && response.data) {
				this.openModal(response.data);
			} else {
				this.crudManager.showMessage("Failed to load staff details", "error");
			}
		} catch (error) {
			console.error("[v0] Error loading staff:", error);
			this.crudManager.showMessage("Failed to load staff details", "error");
		}
	}

	async archiveStaff(id) {
		if (!confirm("Are you sure you want to archive this staff member?")) return;

		try {
			const response = await this.crudManager.archive(id, true);
			if (response.success) {
				this.crudManager.showMessage("Staff archived successfully", "success");
				await this.loadStaffs();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to archive staff",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error archiving staff:", error);
			this.crudManager.showMessage(
				"An error occurred while archiving the staff",
				"error"
			);
		}
	}

	async unarchiveStaff(id) {
		try {
			const response = await this.crudManager.archive(id, false);
			if (response.success) {
				this.crudManager.showMessage(
					"Staff unarchived successfully",
					"success"
				);
				await this.loadStaffs();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to unarchive staff",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error unarchiving staff:", error);
			this.crudManager.showMessage(
				"An error occurred while unarchiving the staff",
				"error"
			);
		}
	}

	async deleteStaff(id) {
		if (
			!confirm(
				"Are you sure you want to permanently delete this staff member? This action cannot be undone."
			)
		)
			return;

		try {
			const response = await this.crudManager.delete(id);
			if (response.success) {
				this.crudManager.showMessage("Staff deleted successfully", "success");
				await this.loadStaffs();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to delete staff",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error deleting staff:", error);
			this.crudManager.showMessage(
				"An error occurred while deleting the staff",
				"error"
			);
		}
	}

	updateCurrencyLabel() {
		const status = document.getElementById("status").value;
		const currencyLabel = document.getElementById("currencyLabel");
		if (status === "permanent") {
			currencyLabel.textContent = "USD";
		} else {
			currencyLabel.textContent = "GHS";
		}
	}

	toggleDependentsInput() {
		const hasDependents = document.getElementById("hasDependents").checked;
		const dependentsInputGroup = document.getElementById("dependentsInputGroup");
		const numberOfDependents = document.getElementById("numberOfDependents");

		if (hasDependents) {
			dependentsInputGroup.style.display = "block";
			// Default to 1 if not set or 0
			const currentVal = parseInt(numberOfDependents.value) || 0;
			if (currentVal < 1) {
				numberOfDependents.value = "1";
			}
			// Ensure max 3
			if (currentVal > 3) {
				numberOfDependents.value = "3";
			}
		} else {
			dependentsInputGroup.style.display = "none";
			numberOfDependents.value = "0";
		}

		// Update the dependents hint in allowances section
		this.updateDependentsHint();
	}

	updateDependentsHint() {
		const hasDependents = document.getElementById("hasDependents")?.checked || false;
		const numberOfDependents = hasDependents ? (parseInt(document.getElementById("numberOfDependents")?.value) || 0) : 0;

		// Find all dependents hints and update them
		document.querySelectorAll('.dependents-hint').forEach(hint => {
			const allowanceId = hint.getAttribute('data-allowance-id');
			const amountInput = document.querySelector(`.allowance-amount[data-id="${allowanceId}"]`);
			const checkbox = document.querySelector(`.allowance-checkbox[value="${allowanceId}"]`);

			if (amountInput && checkbox && checkbox.checked && numberOfDependents > 0) {
				const baseAmount = parseFloat(amountInput.value) || 0;
				const totalAmount = baseAmount * numberOfDependents;
				hint.textContent = `(${numberOfDependents} × ${baseAmount.toFixed(2)} = ${totalAmount.toFixed(2)})`;
			} else {
				hint.textContent = '';
			}
		});
	}

	async init() {
		await this.loadDepartmentsAndDesignations();
		this.attachEventListeners();
		await this.loadStaffs();
	}
}

window.staffsPage = new StaffsPage();
