# Practical 9: Role-Based Authentication and Access Control (RBAC) System

Demonstration of **Role-Based Authentication and Access Control (RBAC)** using JavaScript and Node.js.

Two independent versions are provided:

---

## Version 1: In-Memory Role-Based Auth
- **Folder:** Root directory (`/`)
- **Key Files:** `server.js`, `index.html`
- **Default Port:** `http://localhost:3000`
- **How to Run:**
  ```powershell
  npm start
  # or
  node server.js
  ```
- **How it works:**
  - Uses predefined JavaScript user accounts (`admin`, `faculty`, `student`).
  - No complex JWT, cookies, or external auth packages required.
  - Authenticates via `/api/login` and persists the session in client `localStorage`.
  - The client UI disables/enables actions according to the logged-in role.
  - Server endpoints enforce role security (`canAccess(role, action)`) with alert notifications.

---

## Version 2: MySQL Database-Backed Auth
- **Folder:** `sql_auth_version/`
- **Key Files:** `sql_auth_version/server.js`, `sql_auth_version/index.html`
- **Default Port:** `http://localhost:3001`
- **How to Run:**
  ```powershell
  npm run start:sql
  # or
  cd sql_auth_version
  node server.js
  ```
- **How it works:**
  - Creates and manages a dedicated `users` table (`username`, `password`, `role`) in MySQL (`prac9_sql_db`).
  - Automatically seeds default user accounts into MySQL on first boot.
  - Authenticates login requests directly via SQL query (`SELECT username, role FROM users WHERE username = ? AND password = ?`).
  - Has a live endpoint/button to display registered users directly from the MySQL database table.
  - Enforces the same role permissions matrix on both client UI and server endpoints.

---

## Demo Credentials (Both Versions)

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `123` | Full access: View, Add, Update, Delete, Drop/Create Tables |
| **Faculty** | `faculty` | `123` | View, Add, and Update Student Records |
| **Student** | `student` | `123` | Read-only: Search by UID, View All, View Unique |

---

## Role Permissions Matrix

| Operation | Student | Faculty | Admin |
| :--- | :---: | :---: | :---: |
| Search by UID (`/select-record`) | Allowed | Allowed | Allowed |
| View All (`/select-all`) | Allowed | Allowed | Allowed |
| View Unique Courses (`/select-unique`) | Allowed | Allowed | Allowed |
| Add Student (`/insert`) | Blocked (Denied) | Allowed | Allowed |
| Update Student (`/update`) | Blocked (Denied) | Allowed | Allowed |
| Delete Student (`/delete`) | Blocked (Denied) | Blocked (Denied) | Allowed |
| Drop / Create Table | Blocked (Denied) | Blocked (Denied) | Allowed |
