class DesignationsPage {
	constructor() {
		this.crudManager = new window.CRUDManager(
			window.API_ENDPOINTS.DESIGNATIONS,
			"designation"
		);
		this.currentEditId = null;
		this.showArchived = false;
	}

	render() {
		return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Designations Management</h2>
          <div style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <input type="checkbox" id="showArchivedDesignations" ${
								this.showArchived ? "checked" : ""
							}>
              Show Archived
            </label>
            <button class="btn btn-primary" id="addDesignationBtn">Add New Designation</button>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Designation Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="designationsTableBody">
              <tr>
                <td colspan="5" style="text-align: center;">Loading designations...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Designation Modal -->
      <div class="modal" id="designationModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="designationModalTitle">Add New Designation</h3>
            <button class="modal-close" id="closeDesignationModal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="designationForm">
              <div class="form-group">
                <label for="designationCode">Designation Code *</label>
                <input type="text" id="designationCode" required placeholder="e.g., PROF, LECT">
              </div>

              <div class="form-group">
                <label for="designationName">Designation Name *</label>
                <input type="text" id="designationName" required placeholder="e.g., Professor, Lecturer">
              </div>

              <div class="form-group">
                <label for="desDescription">Description</label>
                <textarea id="desDescription" rows="3" placeholder="Optional description"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelDesignationBtn">Cancel</button>
            <button class="btn btn-primary" id="saveDesignationBtn">Save Designation</button>
          </div>
        </div>
      </div>
    `;
	}

	async init() {
		this.attachEventListeners();
		await this.loadDesignations();
	}

	attachEventListeners() {
		document
			.getElementById("addDesignationBtn")
			.addEventListener("click", () => this.openModal());
		document
			.getElementById("closeDesignationModal")
			.addEventListener("click", () => this.closeModal());
		document
			.getElementById("cancelDesignationBtn")
			.addEventListener("click", () => this.closeModal());
		document
			.getElementById("saveDesignationBtn")
			.addEventListener("click", () => this.saveDesignation());
		document
			.getElementById("showArchivedDesignations")
			.addEventListener("change", (e) => {
				this.showArchived = e.target.checked;
				this.loadDesignations();
			});
	}

	async loadDesignations() {
		try {
			const response = await this.crudManager.getAll(this.showArchived);
			const designations = response.data || [];
			const tbody = document.getElementById("designationsTableBody");

			if (designations.length > 0) {
				tbody.innerHTML = designations
					.map(
						(designation) => `
          <tr>
            <td><strong>${designation.designation_code}</strong></td>
            <td>${designation.designation_name}</td>
            <td>${designation.description || "-"}</td>
            <td><span class="badge ${
							designation.is_archived ? "badge-danger" : "badge-success"
						}">${designation.is_archived ? "Archived" : "Active"}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="window.designationsPage.editDesignation(${
									designation.id
								})">Edit</button>
                ${
									!designation.is_archived
										? `<button class="btn btn-sm btn-warning" onclick="window.designationsPage.archiveDesignation(${designation.id})">Archive</button>`
										: `<button class="btn btn-sm btn-success" onclick="window.designationsPage.unarchiveDesignation(${designation.id})">Unarchive</button>`
								}
                <button class="btn btn-sm btn-danger" onclick="window.designationsPage.deleteDesignation(${
									designation.id
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
            <td colspan="5">
              <div class="empty-state">
                <div class="empty-state-icon">💼</div>
                <div class="empty-state-text">No designations found</div>
              </div>
            </td>
          </tr>
        `;
			}
		} catch (error) {
			console.error("Error loading designations:", error);
			const tbody = document.getElementById("designationsTableBody");
			tbody.innerHTML = `
        <tr>
          <td colspan="5" class="error-message">Failed to load designations. Please try again.</td>
        </tr>
      `;
		}
	}

	openModal(designation = null) {
		this.currentEditId = designation ? designation.id : null;
		const modal = document.getElementById("designationModal");
		const title = document.getElementById("designationModalTitle");
		const form = document.getElementById("designationForm");

		title.textContent = designation
			? "Edit Designation"
			: "Add New Designation";
		form.reset();

		if (designation) {
			document.getElementById("designationCode").value =
				designation.designation_code;
			document.getElementById("designationName").value =
				designation.designation_name;
			document.getElementById("desDescription").value =
				designation.description || "";
		}

		modal.classList.add("active");
	}

	closeModal() {
		document.getElementById("designationModal").classList.remove("active");
		this.currentEditId = null;
	}

	async saveDesignation() {
		const designationCode = document
			.getElementById("designationCode")
			.value.trim();
		const designationName = document
			.getElementById("designationName")
			.value.trim();
		const description = document.getElementById("desDescription").value.trim();

		if (!designationCode || !designationName) {
			this.crudManager.showMessage(
				"Please fill in all required fields",
				"error"
			);
			return;
		}

		const data = {
			designation_code: designationCode,
			designation_name: designationName,
			description: description || null,
		};

		try {
			let response;
			if (this.currentEditId) {
				response = await this.crudManager.update(this.currentEditId, data);
			} else {
				response = await this.crudManager.create(data);
			}

			if (response.success) {
				this.crudManager.showMessage(
					response.message || "Designation saved successfully",
					"success"
				);
				this.closeModal();
				await this.loadDesignations();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to save designation",
					"error"
				);
			}
		} catch (error) {
			console.error("Error saving designation:", error);
			this.crudManager.showMessage(
				"An error occurred while saving the designation",
				"error"
			);
		}
	}

	async editDesignation(id) {
		try {
			const response = await this.crudManager.getById(id);
			if (response.success && response.data) {
				this.openModal(response.data);
			}
		} catch (error) {
			console.error("Error loading designation:", error);
			this.crudManager.showMessage(
				"Failed to load designation details",
				"error"
			);
		}
	}

	async archiveDesignation(id) {
		this.crudManager.confirmArchive(async () => {
			try {
				const response = await this.crudManager.archive(id, true);
				if (response.success) {
					this.crudManager.showMessage(
						"Designation archived successfully",
						"success"
					);
					await this.loadDesignations();
				} else {
					this.crudManager.showMessage(
						response.message || "Failed to archive designation",
						"error"
					);
				}
			} catch (error) {
				console.error("Error archiving designation:", error);
				this.crudManager.showMessage(
					"An error occurred while archiving the designation",
					"error"
				);
			}
		});
	}

	async unarchiveDesignation(id) {
		try {
			const response = await this.crudManager.archive(id, false);
			if (response.success) {
				this.crudManager.showMessage(
					"Designation unarchived successfully",
					"success"
				);
				await this.loadDesignations();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to unarchive designation",
					"error"
				);
			}
		} catch (error) {
			console.error("Error unarchiving designation:", error);
			this.crudManager.showMessage(
				"An error occurred while unarchiving the designation",
				"error"
			);
		}
	}

	async deleteDesignation(id) {
		this.crudManager.confirmDelete(async () => {
			try {
				const response = await this.crudManager.delete(id);
				if (response.success) {
					this.crudManager.showMessage(
						"Designation deleted successfully",
						"success"
					);
					await this.loadDesignations();
				} else {
					this.crudManager.showMessage(
						response.message || "Failed to delete designation",
						"error"
					);
				}
			} catch (error) {
				console.error("Error deleting designation:", error);
				this.crudManager.showMessage(
					"An error occurred while deleting the designation",
					"error"
				);
			}
		});
	}
}

window.designationsPage = new DesignationsPage();
