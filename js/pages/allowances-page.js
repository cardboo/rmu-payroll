class AllowancesPage {
	constructor() {
		this.crudManager = new window.CRUDManager(
			window.API_ENDPOINTS.ALLOWANCES,
			"allowance"
		);
		this.currentAllowance = null;
		this.showArchived = false;
	}

	render() {
	return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Allowances Management</h2>
          <div style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <input type="checkbox" id="showArchivedAllowances" ${this.showArchived ? "checked" : ""}>
              Show Archived
            </label>
            <button class="btn btn-primary" onclick="window.allowancesPage.showCreateModal()">
              <span>+</span> Add Allowance
            </button>
          </div>
        </div>
        
        <div class="table-container">
          <table id="allowances-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Default Amount</th>
                <th>Eligible Status</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="allowances-tbody">
              <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                  <div class="loader" style="margin: 0 auto;"></div>
                  <p style="margin-top: 12px; color: var(--text-secondary);">Loading allowances...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div id="allowance-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title">Add Allowance</h3>
            <button class="modal-close" onclick="window.allowancesPage.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="allowance-form">

              <div class="form-row">
                <div class="form-group">
                    <label for="allowance_code">Allowance Code *</label>
                    <input type="text" id="allowance_code" name="allowance_code" required>
                </div>

                <div class="form-group">
                    <label for="allowance_name">Allowance Name *</label>
                    <input type="text" id="allowance_name" name="allowance_name" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="is_percentage">Type *</label>
                  <select id="is_percentage" name="is_percentage" required>
                    <option value="">Select Type</option>
                    <option value="0">Fixed Amount</option>
                    <option value="1">Percentage</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="default_amount">Default Amount *</label>
                  <input type="number" id="default_amount" name="default_amount" step="0.01" min="0" required>
                </div>
              </div>

              <div class="form-group">
                <label for="eligible_status">Eligible Staff Status *</label>
                <select id="eligible_status" name="eligible_status" required>
                  <option value="">Select Status</option>
                  <option value="both">Both</option>
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="bonded">Bonded/Study Leave *</label>
                <select id="bonded" name="bonded" required>
                  <option value="">Select Option</option>
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>

              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.allowancesPage.closeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="window.allowancesPage.saveAllowance()">Save Allowance</button>
          </div>
        </div>
      </div>
    `;
}


	async init() {
		this.attachEventListeners();
		await this.loadAllowances();
	}

	attachEventListeners() {
		// Add event listener for show archived checkbox after render
		setTimeout(() => {
			const checkbox = document.getElementById("showArchivedAllowances");
			if (checkbox) {
				checkbox.addEventListener("change", (e) => {
					this.showArchived = e.target.checked;
					this.loadAllowances();
				});
			}
		}, 100);
	}

	async loadAllowances() {
		try {
			const response = await this.crudManager.getAll(this.showArchived);
			console.log("[v0] Allowances response:", response);
			const allowances = response.data || [];
			this.renderTable(allowances);
		} catch (error) {
			console.error("[v0] Error loading allowances:", error);
			document.getElementById("allowances-tbody").innerHTML = `
        <tr>
          <td colspan="8" class="error-message">Failed to load allowances. Please try again.</td>
        </tr>
      `;
		}
	}

	renderTable(allowances) {
		const tbody = document.getElementById("allowances-tbody");

		if (allowances.length === 0) {
			tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-text">No allowances found. Create your first allowance to get started.</div>
          </td>
        </tr>
      `;
			return;
		}

		tbody.innerHTML = allowances
			.map(
				(allowance) => `
      <tr>
        <td><strong>${allowance.allowance_code}</strong></td>
        <td>${allowance.allowance_name}</td>
        <td><span class="badge badge-primary">${
					allowance.is_percentage ? "Percentage" : "Fixed"
				}</span></td>
        <td>${
					allowance.is_percentage
						? allowance.default_amount + "%"
						: "$" + Number.parseFloat(allowance.default_amount).toFixed(2)
				}</td>

				<td><span class="badge badge-secondary">${allowance.eligible_status || "-"}</span></td>
				
        <td>${allowance.description || "-"}</td>
        <td>
          <span class="badge ${
						allowance.is_archived ? "badge-danger" : "badge-success"
					}">
            ${allowance.is_archived ? "Archived" : "Active"}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-sm btn-primary" onclick="window.allowancesPage.showEditModal(${allowance.id})" title="Edit">Edit</button>
            <button class="btn btn-sm ${
							allowance.is_archived ? "btn-success" : "btn-warning"
						}" 
                    onclick="window.allowancesPage.toggleArchive(${
											allowance.id
										}, ${allowance.is_archived})" 
                    title="${allowance.is_archived ? "Unarchive" : "Archive"}">
              ${allowance.is_archived ? "Unarchive" : "Archive"}
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.allowancesPage.deleteAllowance(${
							allowance.id
						})" title="Delete">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
			)
			.join("");
	}

	showCreateModal() {
		this.currentAllowance = null;
		document.getElementById("modal-title").textContent = "Add Allowance";
		document.getElementById("allowance-form").reset();
		document.getElementById("allowance-modal").classList.add("active");
	}

	async showEditModal(id) {
		try {
			const response = await this.crudManager.getById(id);
			this.currentAllowance = response.data;
			document.getElementById("modal-title").textContent = "Edit Allowance";

			document.getElementById("allowance_code").value =
				this.currentAllowance.allowance_code;
			document.getElementById("allowance_name").value =
				this.currentAllowance.allowance_name;
			document.getElementById("is_percentage").value =
				this.currentAllowance.is_percentage;
			document.getElementById("default_amount").value =
				this.currentAllowance.default_amount;
			document.getElementById("bonded").value = this.currentAllowance.is_bonded
				? "1"
				: "0";
			document.getElementById("description").value =
				this.currentAllowance.description || "";

				document.getElementById("eligible_status").value = 
    this.currentAllowance.eligible_status || "both";


			document.getElementById("allowance-modal").classList.add("active");
		} catch (error) {
			console.error("[v0] Error loading allowance:", error);
			this.crudManager.showMessage("Failed to load allowance details", "error");
		}
	}

	closeModal() {
		document.getElementById("allowance-modal").classList.remove("active");
		this.currentAllowance = null;
	}

	async saveAllowance() {
		const form = document.getElementById("allowance-form");
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

		try {
			let response;
			if (this.currentAllowance) {
				response = await this.crudManager.update(
					this.currentAllowance.id,
					data
				);
			} else {
				response = await this.crudManager.create(data);
			}

			if (response.success) {
				this.crudManager.showMessage(
					response.message || "Allowance saved successfully!",
					"success"
				);
				this.closeModal();
				await this.loadAllowances();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to save allowance",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error saving allowance:", error);
			this.crudManager.showMessage(
				"Failed to save allowance. Please try again.",
				"error"
			);
		}
	}

	async toggleArchive(id, isArchived) {
		const action = isArchived ? "unarchive" : "archive";
		if (!confirm(`Are you sure you want to ${action} this allowance?`)) {
			return;
		}

		try {
			const response = await this.crudManager.archive(id, !isArchived);
			if (response.success) {
				this.crudManager.showMessage(
					`Allowance ${action}d successfully!`,
					"success"
				);
				await this.loadAllowances();
			} else {
				this.crudManager.showMessage(
					response.message || `Failed to ${action} allowance`,
					"error"
				);
			}
		} catch (error) {
			console.error(`[v0] Error ${action}ing allowance:`, error);
			this.crudManager.showMessage(
				`Failed to ${action} allowance. Please try again.`,
				"error"
			);
		}
	}

	async deleteAllowance(id) {
		if (
			!confirm(
				"Are you sure you want to permanently delete this allowance? This action cannot be undone."
			)
		) {
			return;
		}

		try {
			const response = await this.crudManager.delete(id);
			if (response.success) {
				this.crudManager.showMessage(
					"Allowance deleted successfully!",
					"success"
				);
				await this.loadAllowances();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to delete allowance",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error deleting allowance:", error);
			this.crudManager.showMessage(
				"Failed to delete allowance. Please try again.",
				"error"
			);
		}
	}
}

window.allowancesPage = new AllowancesPage();
