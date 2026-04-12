# Objective
Fix email images, CSS overflow, admin dashboard, role-based views, and overall design polish

# Tasks

### T001: Fix email logo/banner CID attachments
- **Blocked By**: []
- **Details**: Fix SMTP2GO inline image property name (`cid` → `content_id`)
- **Files**: `server/modules/email/email.service.js`

### T002: Fix CSS overflow (site breaking out of frame)
- **Blocked By**: []
- **Details**: Add overflow-x hidden, fix responsive issues, fix navbar/container overflow
- **Files**: `public/css/style.css`

### T003: Role-based navigation
- **Blocked By**: []
- **Details**: Different nav items for patient/doctor/pharmacist/employee/admin
- **Files**: `client/views/partials/header.ejs`

### T004: Redesign admin dashboard
- **Blocked By**: []
- **Details**: Professional admin panel with sidebar, better stats, charts placeholders
- **Files**: `client/views/pages/admin.ejs`, `server/modules/admin/admin.routes.js`

### T005: Role-based dashboard
- **Blocked By**: [T003]
- **Details**: Different stats/actions for doctor/pharmacist/employee vs patient
- **Files**: `client/views/pages/dashboard.ejs`, `server/modules/users/dashboard.routes.js`

### T006: Design polish for remaining pages
- **Blocked By**: [T002]
- **Details**: Consistent modern styling across all pages
- **Files**: Various EJS files
