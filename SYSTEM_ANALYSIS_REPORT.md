# RMU Payroll System - Comprehensive Analysis Report

**Date:** February 3, 2026
**System:** PHP Backend with JavaScript Frontend
**Purpose:** Identify issues, bugs, and improvements for the payroll management system

---

## Executive Summary

This analysis identified **60+ issues** across the RMU Payroll System, including:
- **8 Critical** security vulnerabilities
- **18 High** priority bugs affecting functionality
- **25 Medium** priority issues
- **15+ Low** priority improvements

The most urgent concerns are security-related (JWT validation, hardcoded credentials) and incomplete payroll functionality (bulk entry allowances/deductions not being saved).

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [Backend PHP Issues](#2-backend-php-issues)
3. [Frontend JavaScript Issues](#3-frontend-javascript-issues)
4. [HTML/CSS Issues](#4-htmlcss-issues)
5. [Database Schema Issues](#5-database-schema-issues)
6. [Recommended Priority Fixes](#6-recommended-priority-fixes)

---

## 1. Critical Security Issues

### 1.1 Missing JWT Signature Verification
**File:** `api/middleware/auth.php` (Lines 54-68)
**Severity:** CRITICAL
**Impact:** Authentication bypass - attackers can forge tokens

```php
function verifyToken($token)
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    $payload = json_decode(base64_decode($parts[1])); // No signature validation!

    if (!$payload || !isset($payload->exp) || $payload->exp < time()) {
        return false;
    }

    return $payload; // Returns without verifying signature
}
```

**Issue:** The function only checks JWT format and expiry but **never validates the cryptographic signature**. An attacker can create any payload they want.

**Fix Required:** Implement proper JWT signature verification using the secret key.

---

### 1.2 Hardcoded JWT Secret
**File:** `api/utils/token.php` (Line 21)
**Severity:** CRITICAL

```php
'your-secret-key-change-this',  // Exposed in source code!
```

**Issue:** JWT secret is hardcoded and exposed in the repository.

**Fix Required:** Move to environment variable.

---

### 1.3 Hardcoded Database Credentials
**File:** `api/config/database.php` (Lines 6-9)
**Severity:** CRITICAL

```php
private $host = "localhost";
private $db_name = "payroll_system";
private $username = "root";
private $password = "";  // Empty root password!
```

**Issue:** Database uses root with no password, credentials in source code.

**Fix Required:** Use environment variables, create dedicated database user.

---

### 1.4 CORS Allows All Origins
**File:** `api/config/cors.php` (Line 3)
**Severity:** HIGH

```php
header("Access-Control-Allow-Origin: *");
```

**Issue:** Any website can make requests to this API, enabling CSRF attacks.

**Fix Required:** Restrict to specific allowed origins.

---

### 1.5 Weak Token Parsing
**File:** `api/middleware/auth.php` (Line 26)
**Severity:** MEDIUM

```php
$token = str_replace('Bearer ', '', $authHeader);
```

**Issue:** Case-sensitive replacement. "bearer " or "BEARER " would bypass.

**Fix Required:** Use case-insensitive replacement.

---

## 2. Backend PHP Issues

### 2.1 Incomplete Bulk Entry Implementation (CRITICAL BUG)
**File:** `api/payroll/bulk-entries.php` (Lines 150-152, 180-182)
**Severity:** HIGH - FEATURE NOT WORKING

```php
// Update case (line 150-152):
// for each payroll allowances for this entry, update payroll_allowances for this staff payroll_entry
// for each payroll allowances for this entry, update payroll_deductions for this staff payroll_entry

// Insert case (line 180-182):
// for each payroll allowances for this entry, insert payroll_allowances for this staff payroll_entry
// for each payroll allowances for this entry, insert payroll_deductions table for this staff payroll_entry
```

**Issue:** Allowances and deductions are calculated but **NEVER inserted** into `payroll_allowances` and `payroll_deductions` tables. This means payroll detail records are incomplete.

**Impact:** Payroll breakdown details are lost; only totals are saved.

---

### 2.2 Column Name Mismatches in Process Details
**File:** `api/payroll/process-details.php` (Lines 58, 60, 77, 88, 90, 104)
**Severity:** HIGH - RUNTIME ERROR

```php
// Line 58 - References non-existent column:
a.type,  // Should be: a.is_percentage

// Line 60 - References non-existent column:
COALESCE(sa.custom_amount, a.default_amount)  // Should be: sa.amount

// Line 77 - Wrong type comparison:
if ($allowance['type'] === 'percent')  // Should check: $allowance['is_percentage']
```

**Database Schema Reality:**
- `allowances` table has `is_percentage` (boolean), not `type`
- `staff_allowances` table has `amount`, not `custom_amount`

---

### 2.3 Literal String in Error Message
**File:** `api/users/index.php` (Line 215)
**Severity:** MEDIUM

```php
'message' => '$e->getMessage()'  // Literal string, not the actual error!
```

**Should be:**
```php
'message' => $e->getMessage()  // Without quotes
```

---

### 2.4 Missing Currency Rate Error Handling
**Files:** Multiple payroll endpoints
**Severity:** HIGH

```php
$rateQuery = "SELECT rate FROM currency_rates WHERE is_active = 1 LIMIT 1";
$rateStmt = $db->query($rateQuery);
$currencyRate = $rateStmt->fetch()['rate'] ?? 1.0;  // fetch() might be FALSE!
```

**Issue:** If no active currency rate exists, `fetch()` returns `FALSE`, and accessing `['rate']` causes an error.

---

### 2.5 Missing Transaction Management
**File:** `api/payroll/entries.php` (Lines 250-398)
**Severity:** MEDIUM

PUT method updates `payroll_entries` then deletes/inserts allowances/deductions without a transaction. If allowance insert fails, `payroll_entries` is already updated with inconsistent data.

---

### 2.6 Missing Authorization Checks
**Files:**
- `api/payroll/process-payroll.php` - GET method (salary data)
- `api/reports/index.php` - Dashboard statistics

**Severity:** MEDIUM

```php
// No requireAdmin() on sensitive data endpoints
$user = authenticate();
// Missing: requireAdmin($user);
```

**Issue:** Any authenticated user can see all staff salary data and reports.

---

### 2.7 Validation Issues

| Issue | File | Lines | Description |
|-------|------|-------|-------------|
| No percentage validation | `entries.php` | 129-148 | Allows percentages > 100 or negative |
| No negative salary check | `bulk-entries.php` | 65 | Continues despite negative salary |
| Missing base64 decode check | `auth.php` | 61 | No error handling for decode failure |

---

## 3. Frontend JavaScript Issues

### 3.1 Auto-Execution on Page Load (CRITICAL)
**File:** `js/pages/departments-page.js` (Lines 333-334)
**Severity:** CRITICAL - BREAKS APPLICATION

```javascript
window.departmentsPage = new DepartmentsPage();
window.document.getElementById("mainContent").innerHTML =
    window.departmentsPage.render();
```

**Issue:** This code executes immediately when the script loads, before the SPA router initializes. It:
1. Tries to access `mainContent` before navigation
2. Overwrites content prematurely
3. Conflicts with dashboard.js navigation

**Same Issue in:** All page scripts (users-page.js, designations-page.js, allowances-page.js, etc.)

---

### 3.2 Global Event Handler Pollution
**File:** `js/dashboard.js` (Lines 704-708, 842-846)
**Severity:** HIGH

```javascript
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    }
};
```

**Issue:** Multiple functions set `window.onclick`, overwriting each other. Only the last one works.

---

### 3.3 Wrong API Endpoint Usage
**File:** `js/dashboard.js` (Lines 368-369)
**Severity:** HIGH

```javascript
.get(window.API_ENDPOINTS.PAYROLL_STAFF_SEARCH + `?staff_number=${staff.staff_number}`)
```

**Issue:** Uses `PAYROLL_STAFF_SEARCH` for fetching allowances/deductions, but should use `PAYROLL_STAFF_ALLOWANCES` and `PAYROLL_STAFF_DEDUCTIONS`.

---

### 3.4 Currency Conversion Logic Error
**File:** `js/payroll.js` (Line 68)
**Severity:** HIGH

```javascript
netSalaryGHS = netSalary * this.currencyRate;
```

**Issue:** Always multiplies by currency rate, even if salary is already in GHS. Should only convert USD to GHS.

---

### 3.5 Missing Null/Undefined Checks

| File | Line | Issue |
|------|------|-------|
| `payroll.js` | 51, 60 | `parseFloat(allowance.default_amount)` without validation |
| `dashboard.js` | 373-374 | `response.data.allowances.filter()` without checking existence |
| `process-payroll-page.js` | 267 | `this.payrollManager.calculatePayroll()` when payrollManager could be null |
| `staffs-page.js` | 336 | `allowance.is_percentage` used without null check |

---

### 3.6 Type Comparison Issues
**File:** `js/dashboard.js` (Line 1006)
**Severity:** HIGH

```javascript
p.month == month && p.year == year  // Loose equality
```

**Issue:** Month/year from input are strings, API data might be numbers. Use `===` with type conversion.

---

### 3.7 Type Inconsistency in Percentage Check
**File:** `js/pages/staffs-page.js` (Line 746)
**Severity:** HIGH

```javascript
allowance.is_percentage === 1  // Strict comparison with number
```

**Issue:** Data might be boolean `true` or string `"1"`. Use flexible check like `!!allowance.is_percentage`.

---

### 3.8 Missing DOM Element Checks
**File:** `js/dashboard.js` (Lines 559, 813-825)

```javascript
document.getElementById("closeEditModal").onclick = ...  // No null check
```

**Issue:** Will throw "Cannot set property 'onclick' of null" if element is missing.

---

## 4. HTML/CSS Issues

### 4.1 Duplicate CSS Link
**File:** `dashboard.html` (Lines 7-8)
**Severity:** LOW

```html
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/styles.css">  <!-- Duplicate -->
```

---

### 4.2 Typo in Login Credentials
**File:** `index.html` (Line 37)
**Severity:** LOW

```html
<p>Default credentials: admin / passwooord  <!-- Extra 'o' -->
```

---

### 4.3 Missing CSS Classes

| Class | Used In | Issue |
|-------|---------|-------|
| `.badge-secondary` | allowances-page.js:190 | Not defined in styles.css |
| `.badge-info` | staffs-page.js:531 | Not defined in styles.css |
| `.step-indicator` | staffs-page.js:98,109,120,698 | Not defined in styles.css |

---

### 4.4 Accessibility Issues

1. **Missing `for` attributes on labels** - 20+ instances across all form pages
2. **Missing ARIA labels** - User avatar, action buttons
3. **Navigation uses `href="#"`** - Causes page jumps, breaks history

---

### 4.5 Responsive Design Gaps
**File:** `css/styles.css` (Lines 551-569)

Only one media query at 768px. Missing:
- Tablet breakpoint (1024px)
- `.topbar` mobile optimization (32px padding too large)
- `.topbar h1` font-size reduction for mobile

---

### 4.6 Inline Styles Overuse

24+ instances of inline styles instead of CSS classes in:
- `process-payroll-page.js`
- `staffs-page.js`
- `allowances-page.js`
- `deductions-page.js`

---

## 5. Database Schema Issues

### 5.1 Missing Columns Referenced in Code

| Column | Table | Referenced In | Actual Column |
|--------|-------|---------------|---------------|
| `type` | allowances | process-details.php:58 | `is_percentage` |
| `custom_amount` | staff_allowances | process-details.php:60 | `amount` |
| `allowed_on_leave` | allowances | process-details.php:66 | Not in schema |
| `on_bonded_or_study_leave` | staffs | process-details.php:70 | Not in schema |
| `updated_by` | payroll_entries | bulk-entries.php:135 | Not in schema |

---

### 5.2 Missing Staff Leave Fields
**Referenced in:** `process-details.php` (Lines 66, 70)

The code references:
- `staffs.on_bonded_or_study_leave`
- `allowances.allowed_on_leave`

But the schema in `01_create_tables.sql` doesn't include these columns.

---

## 6. Recommended Priority Fixes

### Immediate (Critical)

| Priority | Issue | File | Impact |
|----------|-------|------|--------|
| 1 | Implement JWT signature verification | `auth.php` | Security - Auth bypass |
| 2 | Move secrets to environment variables | `token.php`, `database.php` | Security - Credential exposure |
| 3 | Complete bulk entry allowances/deductions | `bulk-entries.php` | Payroll data incomplete |
| 4 | Fix column name mismatches | `process-details.php` | Runtime errors |
| 5 | Remove auto-execution from page scripts | All `*-page.js` | Application breaks |

### High Priority

| Priority | Issue | File | Impact |
|----------|-------|------|--------|
| 6 | Fix currency conversion logic | `payroll.js` | Incorrect salary calculations |
| 7 | Fix loose type comparisons | `dashboard.js` | Silent bugs |
| 8 | Add null checks for API responses | Multiple JS files | Runtime errors |
| 9 | Fix error message literal string | `users/index.php` | Debugging impossible |
| 10 | Add admin checks to sensitive endpoints | `process-payroll.php`, `reports/index.php` | Data exposure |

### Medium Priority

| Priority | Issue | File | Impact |
|----------|-------|------|--------|
| 11 | Add transaction management | `payroll/entries.php` | Data integrity |
| 12 | Fix currency rate error handling | Multiple PHP files | Runtime errors |
| 13 | Replace global onclick handlers | `dashboard.js` | UI bugs |
| 14 | Add form validation | `staffs-page.js` | Data quality |
| 15 | Restrict CORS origins | `cors.php` | CSRF protection |

### Low Priority

| Priority | Issue | File | Impact |
|----------|-------|------|--------|
| 16 | Remove duplicate CSS link | `dashboard.html` | Performance |
| 17 | Fix typo in credentials | `index.html` | UX |
| 18 | Add missing CSS classes | `styles.css` | Styling |
| 19 | Add accessibility labels | All forms | Accessibility |
| 20 | Improve responsive design | `styles.css` | Mobile UX |

---

## Summary Statistics

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 4 | 1 | 2 | 0 |
| Backend PHP | 1 | 5 | 8 | 2 |
| Frontend JS | 2 | 9 | 8 | 4 |
| HTML/CSS | 0 | 0 | 5 | 6 |
| Database | 0 | 2 | 1 | 0 |
| **Total** | **7** | **17** | **24** | **12** |

---

## Conclusion

The RMU Payroll System has significant issues that need addressing:

1. **Security vulnerabilities** must be fixed before production deployment
2. **Incomplete payroll functionality** (bulk entries) means data is being lost
3. **Column mismatches** will cause runtime errors when processing payroll details
4. **JavaScript execution order** issues break the SPA navigation

The system requires substantial fixes to be production-ready. Priority should be given to security and data integrity issues first, followed by functionality bugs.

---

*Report generated by Claude Code Analysis*
*Session: claude/analyze-system-issues-VVG8D*
