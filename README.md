# RMU Payroll Management System

A comprehensive monthly payroll management platform designed for Regional Maritime University (RMU) with multi-currency support, role-based access control, and detailed reporting capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [Payroll Calculation Logic](#payroll-calculation-logic)
- [Error Logging](#error-logging)
- [Security Considerations](#security-considerations)
- [Recommended Improvements](#recommended-improvements)
- [File Structure](#file-structure)
- [Contributing](#contributing)

## Overview

The RMU Payroll System is a web-based application that streamlines payroll processing for university staff. It supports both USD and GHS (Ghana Cedis) salary currencies with real-time exchange rate management, making it ideal for international academic institutions.

### Key Highlights

- **Multi-Currency Support**: Handle salaries in USD or GHS with automatic conversion
- **Flexible Allowances/Deductions**: Support for both fixed amounts and percentage-based calculations
- **Dependents Allowance**: Automatic multiplication of dependents allowance based on number of dependents
- **Bulk Payroll Processing**: Process all eligible staff in a single operation
- **Comprehensive Reporting**: Generate detailed reports with currency conversion tracking
- **Audit Trail**: Complete logging of all system activities

## Features

### Core Modules

1. **User Management**
   - Create, edit, and delete user accounts
   - Role-based access control (Admin/View)
   - Secure JWT-based authentication
   - Password management

2. **Staff Management**
   - Complete staff profile management
   - Department and designation assignment
   - Salary configuration (currency, amount, bank details)
   - Allowance and deduction assignment per staff
   - Archive/unarchive functionality for soft deletion
   - Dependents tracking for allowance calculations

3. **Department Management**
   - Create and manage organizational departments
   - Link staff to departments

4. **Designation Management**
   - Define job titles and positions
   - Associate staff with designations

5. **Allowances Management**
   - Create allowance types (fixed or percentage-based)
   - Assign allowances to individual staff
   - Special handling for dependents allowance (auto-multiplied)

6. **Deductions Management**
   - Configure deduction types (fixed or percentage-based)
   - Statutory deductions (SSNIT, Tax, etc.)
   - Voluntary deductions

7. **Currency Rates Management**
   - Set USD to GHS exchange rates
   - Track historical rates by effective date
   - Active rate indicator
   - Rate validation (must be positive and non-zero)

8. **Payroll Processing**
   - Individual staff payroll entry
   - Bulk payroll processing for all eligible staff
   - Automatic calculation of:
     - Total allowances (with dependents multiplication)
     - Total deductions
     - Gross salary
     - Net salary
   - Currency conversion using active exchange rate
   - Duplicate prevention for processed periods

9. **Reports & Analytics**
   - Payroll Summary Report (with rate per entry)
   - Staff List Report
   - Allowances Report
   - Deductions Report
   - Department Report
   - Export functionality

10. **Dashboard**
    - Current month payroll totals (with proper currency conversion)
    - Active staff count
    - Quick access to key functions
    - Real-time statistics

11. **Audit Logging**
    - Track all CRUD operations
    - User action history
    - Timestamp tracking

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Backend | PHP 7.4+ (RESTful API) |
| Database | MySQL 5.7+ / MariaDB 10.3+ |
| Authentication | JWT (JSON Web Tokens) |
| Architecture | Single Page Application (SPA) |

### Why Vanilla Stack?

- **No Build Process**: Deploy directly without compilation
- **Minimal Dependencies**: Reduced security vulnerabilities
- **Easy Maintenance**: Standard web technologies
- **Fast Loading**: No framework overhead
- **Simple Hosting**: Works on any PHP-enabled server

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   HTML      │  │    CSS      │  │    JavaScript       │  │
│  │  (Views)    │  │  (Styles)   │  │  (SPA Router/Logic) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS (REST API)
                              │
┌─────────────────────────────────────────────────────────────┐
│                      SERVER (PHP)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   API       │  │ Middleware  │  │    Config           │  │
│  │ Endpoints   │  │ (Auth/CORS) │  │   (Database)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ PDO (Prepared Statements)
                              │
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (MySQL)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  users, staffs, departments, designations,          │    │
│  │  allowances, deductions, currency_rates,            │    │
│  │  payroll_periods, payroll_entries, audit_logs       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites

- PHP 7.4 or higher
- MySQL 5.7+ or MariaDB 10.3+
- Apache with mod_rewrite enabled (or Nginx)
- Web server with PHP support

### Step-by-Step Installation

1. **Clone/Download the Project**
   ```bash
   git clone <repository-url> /var/www/html/rmu-payroll
   cd /var/www/html/rmu-payroll
   ```

2. **Database Setup**
   ```bash
   # Create the database
   mysql -u root -p -e "CREATE DATABASE payroll_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   
   # Import the schema
   mysql -u root -p payroll_system < scripts/01_create_tables.sql
   ```

3. **Configure Database Connection**
   
   Edit `api/config/database.php`:
   ```php
   private $host = "localhost";
   private $db_name = "payroll_system";
   private $username = "your_username";
   private $password = "your_password";
   ```

4. **Configure API URL**
   
   Edit `js/config.js`:
   ```javascript
   const API_BASE_URL = "http://your-domain.com/rmu-payroll/api";
   ```

5. **Set Directory Permissions**
   ```bash
   chmod 755 logs/
   chmod 644 logs/.htaccess
   ```

6. **Apache Configuration** (if using Apache)
   
   Ensure `.htaccess` is enabled in your Apache configuration:
   ```apache
   <Directory /var/www/html/rmu-payroll>
       AllowOverride All
       Require all granted
   </Directory>
   ```

7. **Access the Application**
   
   Navigate to `http://your-domain.com/rmu-payroll/`

### Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

**Important**: Change the default password immediately after first login.

## Configuration

### Environment Configuration

#### Database (`api/config/database.php`)
```php
private $host = "localhost";      // Database host
private $db_name = "payroll_system"; // Database name
private $username = "root";       // Database user
private $password = "";           // Database password
```

#### API Base URL (`js/config.js`)
```javascript
const API_BASE_URL = "http://localhost/rmu-payroll/api";
```

#### JWT Secret (`api/middleware/auth.php`)
```php
$secret_key = "your_secure_secret_key_here";
```

### CORS Configuration (`api/config/cors.php`)

The system includes CORS headers for cross-origin requests. Modify as needed for your deployment environment.

## Usage Guide

### Dashboard

The dashboard provides an overview of:
- Current month's total payroll (properly converted to GHS)
- Number of active staff
- Quick action buttons

### Managing Staff

1. Navigate to **Staff** from the sidebar
2. Click **Add Staff** to create a new staff member
3. Fill in required fields:
   - Basic info (name, email, staff ID)
   - Department and designation
   - Salary details (amount, currency, bank info)
   - Number of dependents
4. Assign allowances and deductions in the respective tabs
5. Save the staff record

**Note**: Dependents allowance is automatically multiplied by the number of dependents when assigned.

### Processing Payroll

#### Individual Processing
1. Go to **Process Payroll**
2. Select month and year
3. Choose a staff member
4. Review calculated values
5. Submit payroll entry

#### Bulk Processing
1. Go to **Process Payroll**
2. Select month and year
3. Click **Bulk Process All**
4. Review eligible staff list
5. Confirm to process all

### Setting Currency Rates

1. Navigate to **Currency Rates**
2. Click **Set New Rate**
3. Enter effective date and exchange rate
4. Save (this automatically sets the new rate as active)

### Generating Reports

1. Go to **Reports**
2. Select report type
3. Choose date range if applicable
4. Click **Generate**
5. View or export the report

**Note**: Reports show the exchange rate that was used at the time of each payroll entry, not the current active rate.

## API Documentation

### Authentication

All API endpoints (except login) require JWT authentication.

**Header**: `Authorization: Bearer <token>`

### Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/auth/login.php` | POST | User authentication |
| `/api/auth/logout.php` | POST | User logout |
| `/api/users/` | GET, POST, PUT, DELETE | User management |
| `/api/staffs/` | GET, POST, PUT, DELETE | Staff management |
| `/api/departments/` | GET, POST, PUT, DELETE | Department management |
| `/api/designations/` | GET, POST, PUT, DELETE | Designation management |
| `/api/allowances/` | GET, POST, PUT, DELETE | Allowances management |
| `/api/deductions/` | GET, POST, PUT, DELETE | Deductions management |
| `/api/currency-rates/` | GET, POST, PUT, DELETE | Currency rates |
| `/api/payroll/` | GET, POST | Payroll processing |
| `/api/payroll/bulk.php` | POST | Bulk payroll processing |
| `/api/reports/` | GET | Report generation |
| `/api/audit-logs/` | GET | Audit log retrieval |

### Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | System users with roles |
| `staffs` | Employee records |
| `departments` | Organizational departments |
| `designations` | Job titles/positions |
| `allowances` | Allowance type definitions |
| `deductions` | Deduction type definitions |
| `staff_allowances` | Staff-allowance assignments |
| `staff_deductions` | Staff-deduction assignments |
| `currency_rates` | Exchange rate history |
| `payroll_periods` | Monthly payroll periods |
| `payroll_entries` | Individual payroll records |
| `audit_logs` | System activity logs |

### Key Relationships

```
staffs ─────┬───── departments
            ├───── designations
            ├───── staff_allowances ───── allowances
            └───── staff_deductions ───── deductions

payroll_entries ─────┬───── staffs
                     └───── payroll_periods
```

## User Roles & Permissions

### Admin Role
- Full CRUD access to all modules
- User management capabilities
- Payroll processing
- Report generation
- System configuration

### View Role
- Read-only access to data
- Report generation (read-only)
- Dashboard viewing
- Cannot modify any records

### Permission Matrix

| Feature | Admin | View |
|---------|-------|------|
| View Dashboard | Yes | Yes |
| Manage Users | Yes | No |
| Manage Staff | Yes | No |
| View Staff | Yes | Yes |
| Process Payroll | Yes | No |
| View Payroll | Yes | Yes |
| Generate Reports | Yes | Yes |
| Manage Currency Rates | Yes | No |
| View Audit Logs | Yes | Yes |

## Payroll Calculation Logic

### Salary Calculation Formula

```
Gross Salary = Base Salary + Total Allowances
Net Salary = Gross Salary - Total Deductions
```

### Allowance Calculation

For each assigned allowance:
```
If type = 'fixed':
    amount = fixed_amount
    
If type = 'percentage':
    amount = (percentage / 100) * base_salary

If allowance name contains 'dependent' AND number_of_dependents > 0:
    amount = amount * number_of_dependents
```

### Deduction Calculation

For each assigned deduction:
```
If type = 'fixed':
    amount = fixed_amount
    
If type = 'percentage':
    amount = (percentage / 100) * base_salary
```

### Currency Conversion

For USD salaries:
```
GHS Amount = USD Amount * Active Exchange Rate
```

The exchange rate used is captured at the time of payroll processing and stored with each payroll entry for historical accuracy.

## Error Logging

### Log Location
`logs/database_errors.log`

### What's Logged
- Timestamp of error occurrence
- Error message and type
- File and line number
- Full stack trace
- Query context (SQL and parameters)
- Endpoint and request method
- User context when available

### Log Format Example
```
================================================================================
[2025-01-08 14:30:45] ERROR
Message: SQLSTATE[42S22]: Column not found: 1054 Unknown column 'invalid_column'
File: /path/to/api/users/index.php
Line: 45
Context: {"query":"SELECT * FROM users WHERE invalid_column = ?","params":["value"]}
Stack Trace:
#0 /path/to/api/users/index.php(45): PDO->prepare()
#1 {main}
================================================================================
```

### Log Security
The `logs/` directory is protected by `.htaccess` to prevent web access.

## Security Considerations

### Current Security Measures

1. **Authentication**: JWT-based token authentication
2. **Authorization**: Role-based access control
3. **SQL Injection Prevention**: PDO prepared statements
4. **XSS Prevention**: Output encoding in frontend
5. **CORS**: Configured cross-origin headers
6. **Error Handling**: Errors logged, not exposed to users

### Recommended Security Actions

1. **Change JWT Secret**: Update the secret key in `api/middleware/auth.php`
2. **Use HTTPS**: Enable SSL/TLS in production
3. **Change Default Password**: Update admin password immediately
4. **Database User**: Use a limited-privilege database user
5. **Log Monitoring**: Regularly review error and audit logs
6. **Backup Strategy**: Implement regular database backups

## Recommended Improvements

### High Priority

1. **Password Hashing Upgrade**
   - Implement bcrypt with proper cost factor
   - Add password strength requirements
   - Implement password expiry policy

2. **Input Validation Enhancement**
   - Add server-side validation for all inputs
   - Implement request rate limiting
   - Add CSRF token protection

3. **Session Management**
   - Implement token refresh mechanism
   - Add session timeout handling
   - Support for multiple active sessions management

4. **Database Optimization**
   - Add indexes on frequently queried columns
   - Implement query caching
   - Add database connection pooling

5. **Error Handling Improvement**
   - Implement centralized error handling
   - Add user-friendly error messages
   - Create error notification system for admins

### Medium Priority

6. **Reporting Enhancements**
   - Add PDF export functionality
   - Implement Excel export with formatting
   - Add scheduled report generation
   - Create custom report builder

7. **Payroll Features**
   - Add payroll approval workflow
   - Implement payroll reversal/correction
   - Add payslip generation (PDF)
   - Support for mid-month advances

8. **Staff Management**
   - Add document upload capability
   - Implement staff photo management
   - Add employment history tracking
   - Create staff self-service portal

9. **Notification System**
   - Email notifications for payroll processing
   - System alerts for pending actions
   - Reminder system for payroll deadlines

10. **Audit Improvements**
    - Add detailed change tracking (before/after values)
    - Implement audit report generation
    - Add data export for compliance

11. **Multi-Currency Enhancement**
    - Support for more currencies
    - Automatic rate fetching from external APIs
    - Historical rate charts

12. **Backup and Recovery**
    - Automated database backup
    - Point-in-time recovery
    - Data export/import functionality

### Low Priority (Future Enhancements)

13. **Mobile Responsiveness**
    - Improve mobile UI/UX
    - Consider progressive web app (PWA) features

14. **Integration Capabilities**
    - Bank file generation for direct deposits
    - Integration with accounting systems
    - HR system integration

15. **Advanced Reporting**
    - Dashboard widgets customization
    - Graphical analytics
    - Trend analysis

16. **Performance Optimization**
    - Implement lazy loading
    - Add service worker for offline capability
    - Optimize database queries

17. **Testing Infrastructure**
    - Add unit tests for PHP API
    - Implement integration tests
    - Add end-to-end testing

18. **Documentation**
    - API documentation with Swagger/OpenAPI
    - User manual with screenshots
    - Video tutorials

19. **Accessibility**
    - WCAG 2.1 compliance
    - Screen reader support
    - Keyboard navigation improvements

20. **Internationalization**
    - Multi-language support
    - Locale-specific formatting
    - Right-to-left (RTL) support

21. **Data Analytics**
    - Payroll trends visualization
    - Cost center analysis
    - Predictive analytics

22. **Workflow Automation**
    - Automatic staff onboarding
    - Scheduled payroll processing
    - Auto-notification triggers

## File Structure

```
rmu-payroll/
├── api/
│   ├── allowances/
│   │   └── index.php           # Allowances CRUD
│   ├── audit-logs/
│   │   └── index.php           # Audit log retrieval
│   ├── auth/
│   │   ├── login.php           # User login
│   │   └── logout.php          # User logout
│   ├── config/
│   │   ├── cors.php            # CORS configuration
│   │   ├── database.php        # Database connection
│   │   └── error_logger.php    # Error logging utility
│   ├── currency-rates/
│   │   └── index.php           # Currency rates CRUD
│   ├── deductions/
│   │   └── index.php           # Deductions CRUD
│   ├── departments/
│   │   └── index.php           # Departments CRUD
│   ├── designations/
│   │   └── index.php           # Designations CRUD
│   ├── middleware/
│   │   └── auth.php            # JWT authentication
│   ├── payroll/
│   │   ├── index.php           # Individual payroll
│   │   └── bulk.php            # Bulk payroll processing
│   ├── reports/
│   │   └── index.php           # Report generation
│   ├── staffs/
│   │   └── index.php           # Staff CRUD
│   └── users/
│       └── index.php           # User management
├── css/
│   └── styles.css              # Application styles
├── js/
│   ├── auth.js                 # Authentication service
│   ├── config.js               # API configuration
│   ├── crud-manager.js         # Generic CRUD operations
│   ├── dashboard.js            # Dashboard & routing
│   └── pages/
│       ├── allowances-page.js
│       ├── audit-logs-page.js
│       ├── currency-rates-page.js
│       ├── deductions-page.js
│       ├── departments-page.js
│       ├── designations-page.js
│       ├── process-payroll-page.js
│       ├── reports-page.js
│       ├── staffs-page.js
│       └── users-page.js
├── logs/
│   ├── .htaccess               # Prevent web access
│   └── database_errors.log     # Error log file
├── scripts/
│   └── 01_create_tables.sql    # Database schema
├── dashboard.html              # Main application page
├── index.html                  # Login page
└── README.md                   # This file
```

## Contributing

### Development Guidelines

1. Follow existing code style and patterns
2. Use meaningful variable and function names
3. Add comments only for non-obvious logic
4. Test thoroughly before committing
5. Update documentation for new features

### Commit Message Format

```
type: brief description

- Detail 1
- Detail 2
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit PR with clear description
5. Address review feedback

## License

This project is proprietary software developed for Regional Maritime University.

## Support

For issues and support:
- Contact the IT Department
- Email: it-support@rmu.edu.gh

---

**Version**: 1.0.0  
**Last Updated**: May 2026  
**Maintained By**: RMU IT Department
