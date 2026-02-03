class DepartmentsPage {
	constructor() {
		this.crudManager = new window.CRUDManager(
			window.API_ENDPOINTS.DEPARTMENTS,
			"department"
		);
		this.currentEditId = null;
		this.showArchived = false;
	}

	async init() {
		this.attachEventListeners();
		await this.loadDepartments();
	}

	render() {
		return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Department Management</h2>
          <div style="display: flex; gap: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <input type="checkbox" id="showArchivedDepartments" ${
								this.showArchived ? "checked" : ""
							}>
              Show Archived
            </label>
            <button class="btn btn-primary" id="addDepartmentBtn">Add New Department</button>
          </div>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Department Code</th>
                <th>Department Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="departmentsTableBody">
              <tr>
                <td colspan="5" style="text-align: center;">Loading...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Department Modal -->
      <div class="modal" id="departmentModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="departmentModalTitle">Add New Department</h3>
            <button class="modal-close" id="closeDepartmentModal">&times;</button>
          </div>
          <div class="modal-body">
            <form id="departmentForm">
              <div class="form-row">
                <div class="form-group">
                  <label for="departmentCode">Department Code *</label>
                  <input type="text" id="departmentCode" required placeholder="e.g., CS, ENG, HR">
                </div>
                <div class="form-group">
                  <label for="departmentName">Department Name *</label>
                  <input type="text" id="departmentName" required placeholder="e.g., Computer Science">
                </div>
              </div>

              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" rows="3" placeholder="Optional description"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="cancelDepartmentBtn">Cancel</button>
            <button class="btn btn-primary" id="saveDepartmentBtn">Save Department</button>
          </div>
        </div>
      </div>
    `;
	}

	attachEventListeners() {
		document
			.getElementById("addDepartmentBtn")
			.addEventListener("click", () => this.openModal());
		document
			.getElementById("closeDepartmentModal")
			.addEventListener("click", () => this.closeModal());
		document
			.getElementById("cancelDepartmentBtn")
			.addEventListener("click", () => this.closeModal());
		document
			.getElementById("saveDepartmentBtn")
			.addEventListener("click", () => this.saveDepartment());
		document
			.getElementById("showArchivedDepartments")
			.addEventListener("change", (e) => {
				this.showArchived = e.target.checked;
				this.loadDepartments();
			});
	}

	async loadDepartments() {
		try {
			const response = await this.crudManager.getAll(this.showArchived);
			const tbody = document.getElementById("departmentsTableBody");

			if (response.success && response.data.length > 0) {
				tbody.innerHTML = response.data
					.map(
						(dept) => `
          <tr>
            <td><strong>${dept.department_code}</strong></td>
            <td>${dept.department_name}</td>
            <td>${dept.description || "-"}</td>
            <td><span class="badge ${
							dept.is_archived ? "badge-danger" : "badge-success"
						}">${dept.is_archived ? "Archived" : "Active"}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-primary" onclick="departmentsPage.editDepartment(${
									dept.id
								})">Edit</button>
                ${
									!dept.is_archived
										? `<button class="btn btn-sm btn-warning" onclick="departmentsPage.archiveDepartment(${dept.id})">Archive</button>`
										: `<button class="btn btn-sm btn-success" onclick="departmentsPage.unarchiveDepartment(${dept.id})">Unarchive</button>`
								}
                <button class="btn btn-sm btn-danger" onclick="departmentsPage.deleteDepartment(${
									dept.id
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
                <div class="empty-state-icon">🏢</div>
                <div class="empty-state-text">No departments found</div>
              </div>
            </td>
          </tr>
        `;
			}
		} catch (error) {
			console.error("Error loading departments:", error);
			this.crudManager.showMessage("Failed to load departments", "error");
		}
	}

	openModal(department = null) {
		this.currentEditId = department ? department.id : null;
		const modal = document.getElementById("departmentModal");
		const title = document.getElementById("departmentModalTitle");
		const form = document.getElementById("departmentForm");

		title.textContent = department ? "Edit Department" : "Add New Department";
		form.reset();

		if (department) {
			document.getElementById("departmentCode").value =
				department.department_code;
			document.getElementById("departmentName").value =
				department.department_name;
			document.getElementById("description").value =
				department.description || "";
		}

		modal.classList.add("active");
	}

	closeModal() {
		document.getElementById("departmentModal").classList.remove("active");
		this.currentEditId = null;
	}

	async saveDepartment() {
		const departmentCode = document
			.getElementById("departmentCode")
			.value.trim();
		const departmentName = document
			.getElementById("departmentName")
			.value.trim();
		const description = document.getElementById("description").value.trim();

		if (!departmentCode || !departmentName) {
			this.crudManager.showMessage(
				"Please fill in all required fields",
				"error"
			);
			return;
		}

		const data = {
			department_code: departmentCode,
			department_name: departmentName,
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
					response.message || "Department saved successfully",
					"success"
				);
				this.closeModal();
				await this.loadDepartments();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to save department",
					"error"
				);
			}
		} catch (error) {
			console.error("Error saving department:", error);
			this.crudManager.showMessage(
				"An error occurred while saving the department",
				"error"
			);
		}
	}

	async editDepartment(id) {
		try {
			const response = await this.crudManager.getById(id);
			if (response.success && response.data) {
				this.openModal(response.data);
			}
		} catch (error) {
			console.error("Error loading department:", error);
			this.crudManager.showMessage(
				"Failed to load department details",
				"error"
			);
		}
	}

	async archiveDepartment(id) {
		this.crudManager.confirmArchive(async () => {
			try {
				const response = await this.crudManager.archive(id, true);
				if (response.success) {
					this.crudManager.showMessage(
						"Department archived successfully",
						"success"
					);
					await this.loadDepartments();
				} else {
					this.crudManager.showMessage(
						response.message || "Failed to archive department",
						"error"
					);
				}
			} catch (error) {
				console.error("Error archiving department:", error);
				this.crudManager.showMessage(
					"An error occurred while archiving the department",
					"error"
				);
			}
		});
	}

	async unarchiveDepartment(id) {
		try {
			const response = await this.crudManager.archive(id, false);
			if (response.success) {
				this.crudManager.showMessage(
					"Department unarchived successfully",
					"success"
				);
				await this.loadDepartments();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to unarchive department",
					"error"
				);
			}
		} catch (error) {
			console.error("Error unarchiving department:", error);
			this.crudManager.showMessage(
				"An error occurred while unarchiving the department",
				"error"
			);
		}
	}

	async deleteDepartment(id) {
		this.crudManager.confirmDelete(async () => {
			try {
				const response = await this.crudManager.delete(id);
				if (response.success) {
					this.crudManager.showMessage(
						"Department deleted successfully",
						"success"
					);
					await this.loadDepartments();
				} else {
					this.crudManager.showMessage(
						response.message || "Failed to delete department",
						"error"
					);
				}
			} catch (error) {
				console.error("Error deleting department:", error);
				this.crudManager.showMessage(
					"An error occurred while deleting the department",
					"error"
				);
			}
		});
	}
}

// Export for use by dashboard.js router
window.departmentsPage = new DepartmentsPage();
