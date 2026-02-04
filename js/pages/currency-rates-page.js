class CurrencyRatesPage {
	constructor() {
		this.crudManager = new window.CRUDManager(
			window.API_ENDPOINTS.CURRENCY_RATES,
			"currency rate"
		);
		this.currentRate = null;
	}

	render() {
		return `
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Currency Rates Management (USD to GHS)</h2>
          <button class="btn btn-primary" onclick="window.currencyRatesPage.showCreateModal()">
            <span>+</span> Set New Rate
          </button>
        </div>
        
        <div class="table-container">
          <table id="rates-table">
            <thead>
              <tr>
                <th>Effective Date</th>
                <th>Rate (1 USD = ? GHS)</th>
                <th>Set By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="rates-tbody">
              <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                  <div class="loader" style="margin: 0 auto;"></div>
                  <p style="margin-top: 12px; color: var(--text-secondary);">Loading currency rates...</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div id="rate-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title">Set Currency Rate</h3>
            <button class="modal-close" onclick="window.currencyRatesPage.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="rate-form">
              <div class="form-group">
                <label for="effective_date">Effective Date *</label>
                <input type="date" id="effective_date" name="effective_date" required>
              </div>

              <div class="form-group">
                <label for="rate">Exchange Rate (1 USD = ? GHS) *</label>
                <input type="number" id="rate" name="rate" step="0.0001" min="0" required placeholder="e.g., 12.5000">
              </div>

              <div class="form-group">
                <label>Preview</label>
                <div style="padding: 12px; background-color: var(--background); border-radius: 6px; font-size: 14px;">
                  <strong>1 USD</strong> = <strong id="rate-preview">0.0000</strong> GHS
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="window.currencyRatesPage.closeModal()">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="window.currencyRatesPage.saveRate()">Save Rate</button>
          </div>
        </div>
      </div>
    `;
	}

	async init() {
		await this.loadRates();
		this.attachEventListeners();
	}

	attachEventListeners() {
		// Add event listener for rate preview after modal is rendered
		setTimeout(() => {
			const rateInput = document.getElementById("rate");
			if (rateInput) {
				rateInput.addEventListener("input", (e) => {
					const preview = document.getElementById("rate-preview");
					if (preview) {
						preview.textContent = Number.parseFloat(
							e.target.value || 0
						).toFixed(4);
					}
				});
			}
		}, 100);
	}

	async loadRates() {
		try {
			const response = await this.crudManager.getAll();
			console.log("[v0] Currency rates response:", response);
			const rates = response.data || [];
			this.renderTable(rates);
		} catch (error) {
			console.error("[v0] Error loading currency rates:", error);
			document.getElementById("rates-tbody").innerHTML = `
        <tr>
          <td colspan="4" class="error-message">Failed to load currency rates. Please try again.</td>
        </tr>
      `;
		}
	}

	renderTable(rates) {
		const tbody = document.getElementById("rates-tbody");

		if (rates.length === 0) {
			tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <div class="empty-state-icon">💱</div>
            <div class="empty-state-text">No currency rates found. Set your first exchange rate to get started.</div>
          </td>
        </tr>
      `;
			return;
		}

		tbody.innerHTML = rates
			.map((rate) => {
				// Use is_active from database to determine status
				const isActive = rate.is_active == 1 || rate.is_active === true;

				return `
        <tr>
          <td>${new Date(rate.effective_date).toLocaleDateString()}</td>
          <td><strong>${Number.parseFloat(rate.rate).toFixed(
						4
					)}</strong> GHS</td>
          <td>${rate.set_by_name || "System"}</td>
          <td>
            <span class="badge ${
							isActive ? "badge-success" : "badge-secondary"
						}">
              ${isActive ? "Active" : "Inactive"}
            </span>
          </td>
        </tr>
      `;
			})
			.join("");
	}

	showCreateModal() {
		this.currentRate = null;
		document.getElementById("modal-title").textContent = "Set Currency Rate";
		document.getElementById("rate-form").reset();

		// Set today's date as default
		const today = new Date().toISOString().split("T")[0];
		document.getElementById("effective_date").value = today;
		document.getElementById("rate-preview").textContent = "0.0000";

		document.getElementById("rate-modal").classList.add("active");
	}

	async showEditModal(id) {
		try {
			const response = await this.crudManager.getById(id);
			this.currentRate = response.data;
			document.getElementById("modal-title").textContent = "Edit Currency Rate";

			document.getElementById("effective_date").value =
				this.currentRate.effective_date;
			document.getElementById("rate").value = this.currentRate.rate;
			document.getElementById("rate-preview").textContent = Number.parseFloat(
				this.currentRate.rate
			).toFixed(4);

			document.getElementById("rate-modal").classList.add("active");
		} catch (error) {
			console.error("[v0] Error loading currency rate:", error);
			this.crudManager.showMessage(
				"Failed to load currency rate details",
				"error"
			);
		}
	}

	closeModal() {
		document.getElementById("rate-modal").classList.remove("active");
		this.currentRate = null;
	}

	async saveRate() {
		const form = document.getElementById("rate-form");
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const formData = new FormData(form);
		const data = Object.fromEntries(formData.entries());

		// Always set new rates as active (this will deactivate all other rates)
		data.is_active = true;

		try {
			// Only create new rates, no editing (since we removed edit buttons)
			const response = await this.crudManager.create(data);

			if (response.success) {
				this.crudManager.showMessage(
					response.message || "Currency rate set successfully! This rate is now active.",
					"success"
				);
				this.closeModal();
				await this.loadRates();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to set currency rate",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error saving currency rate:", error);
			this.crudManager.showMessage(
				"Failed to save currency rate. Please try again.",
				"error"
			);
		}
	}

	async deleteRate(id) {
		if (
			!confirm(
				"Are you sure you want to delete this currency rate? This action cannot be undone."
			)
		) {
			return;
		}

		try {
			const response = await this.crudManager.delete(id);
			if (response.success) {
				this.crudManager.showMessage(
					"Currency rate deleted successfully!",
					"success"
				);
				await this.loadRates();
			} else {
				this.crudManager.showMessage(
					response.message || "Failed to delete currency rate",
					"error"
				);
			}
		} catch (error) {
			console.error("[v0] Error deleting currency rate:", error);
			this.crudManager.showMessage(
				"Failed to delete currency rate. Please try again.",
				"error"
			);
		}
	}
}

window.currencyRatesPage = new CurrencyRatesPage();
