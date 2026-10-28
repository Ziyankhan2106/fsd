const express = require('express');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Database connection configuration (MySQL)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    // port:3069
});

// ==========================================
// VERSION 1: IN-MEMORY ROLE-BASED AUTH & RBAC
// ==========================================

// Predefined Demo Users
const USERS = [
    { username: 'admin', password: '123', role: 'Admin' },
    { username: 'faculty', password: '123', role: 'Faculty' },
    { username: 'student', password: '123', role: 'Student' }
];

// Role-Based Permissions Mapping
const PERMISSIONS = {
    Student: ['select-record', 'select-all', 'select-unique'],
    Faculty: ['select-record', 'select-all', 'select-unique', 'insert', 'update'],
    Admin:   ['select-record', 'select-all', 'select-unique', 'insert', 'update', 'delete', 'drop-table', 'create-table']
};

// Check if a role is permitted to perform an action
function canAccess(role, action) {
    if (!role) return false;
    const allowedActions = PERMISSIONS[role] || [];
    return allowedActions.includes(action);
}

// Show alert and return to previous page
function sendAlert(res, message) {
    res.send(`
        <script>
            alert(${JSON.stringify(message)});
            history.back();
        </script>
    `);
}

// Connect to MySQL and prepare students table
db.connect((err) => {
    if (err) return console.error('Connection failed:', err.message);
    console.log('Connected to MySQL server.');

    db.query('CREATE DATABASE IF NOT EXISTS prac8_db', (err) => {
        if (err) throw err;
        db.changeUser({ database: 'prac8_db' }, (err) => {
            if (err) throw err;
            initTable((err) => {
                if (err) console.error(err.message);
                else console.log('Database and students table ready.');
            });
        });
    });
});

// -------- Student Database Operations --------

function initTable(cb) {
    const sql = `
        CREATE TABLE IF NOT EXISTS students (
            uid VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            course VARCHAR(100) NOT NULL
        )
    `;
    db.query(sql, cb);
}

function insertRecord(uid, name, course, cb) {
    db.query('INSERT INTO students (uid, name, course) VALUES (?, ?, ?)', [uid, name, course], cb);
}

function updateRecord(uid, name, course, cb) {
    db.query('UPDATE students SET name = ?, course = ? WHERE uid = ?', [name, course, uid], cb);
}

function deleteRecord(uid, cb) {
    db.query('DELETE FROM students WHERE uid = ?', [uid], cb);
}

function selectRecordByUid(uid, cb) {
    db.query('SELECT * FROM students WHERE uid = ?', [uid], cb);
}

function selectAllRecords(cb) {
    db.query('SELECT * FROM students', cb);
}

function selectUnique(cb) {
    db.query('SELECT DISTINCT course FROM students', cb);
}

function dropTable(cb) {
    db.query('DROP TABLE IF EXISTS students', cb);
}

// -------- Routes --------

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login API (In-Memory check)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const matchedUser = USERS.find(u => u.username === username.trim() && u.password === password.trim());
    if (!matchedUser) {
        return res.status(401).json({ success: false, message: 'Invalid username or password!' });
    }

    res.json({
        success: true,
        message: 'Login successful!',
        user: {
            username: matchedUser.username,
            role: matchedUser.role
        }
    });
});

// Insert Record (Faculty & Admin only)
app.post('/insert', (req, res) => {
    const role = req.body.userRole || req.query.userRole;
    if (!canAccess(role, 'insert')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' is not authorized to add students!`);
    }

    const { uid, name, course } = req.body;
    insertRecord(uid, name, course, (err) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        sendAlert(res, 'Record inserted successfully!');
    });
});

// Update Record (Faculty & Admin only)
app.post('/update', (req, res) => {
    const role = req.body.userRole || req.query.userRole;
    if (!canAccess(role, 'update')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' is not authorized to update students!`);
    }

    const { uid, name, course } = req.body;
    updateRecord(uid, name, course, (err, result) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        if (result.affectedRows === 0) {
            return sendAlert(res, 'No record found with UID: ' + uid);
        }
        sendAlert(res, 'Record updated successfully!');
    });
});

// Select Record by UID (All Roles)
app.get('/select-record', (req, res) => {
    const role = req.query.userRole;
    if (!canAccess(role, 'select-record')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' cannot search records.`);
    }

    const uid = req.query.uid;
    selectRecordByUid(uid, (err, rows) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        if (rows.length === 0) {
            return sendAlert(res, 'No student found with UID: ' + uid);
        }
        const student = rows[0];
        sendAlert(res, `Student Details:\nUID: ${student.uid}\nName: ${student.name}\nCourse: ${student.course}`);
    });
});

// Delete Record (Admin Only)
app.post('/delete', (req, res) => {
    const role = req.body.userRole || req.query.userRole;
    if (!canAccess(role, 'delete')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' is not authorized to delete records! (Admin only)`);
    }

    const { uid } = req.body;
    deleteRecord(uid, (err, result) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        if (result.affectedRows === 0) {
            return sendAlert(res, 'No record found with UID: ' + uid);
        }
        sendAlert(res, 'Record deleted successfully!');
    });
});

// Select All Records (All Roles)
app.get('/select-all', (req, res) => {
    const role = req.query.userRole;
    if (!canAccess(role, 'select-all')) {
        return res.status(403).json({ error: `Access Denied: Role '${role || 'None'}' cannot view records.` });
    }

    selectAllRecords((err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json(rows);
    });
});

// Select Unique Courses (All Roles)
app.get('/select-unique', (req, res) => {
    const role = req.query.userRole;
    if (!canAccess(role, 'select-unique')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' cannot view unique courses.`);
    }

    selectUnique((err, rows) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        if (rows.length === 0) {
            return sendAlert(res, 'No records found.');
        }
        const courses = rows.map(r => r.course).join('\n');
        sendAlert(res, 'Unique Courses:\n' + courses);
    });
});

// Drop Table (Admin Only)
app.get('/drop-table', (req, res) => {
    const role = req.query.userRole;
    if (!canAccess(role, 'drop-table')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' is not authorized to drop table! (Admin only)`);
    }

    dropTable((err) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        sendAlert(res, 'Students table dropped successfully!');
    });
});

// Create Table (Admin Only)
app.get('/create-table', (req, res) => {
    const role = req.query.userRole;
    if (!canAccess(role, 'create-table')) {
        return sendAlert(res, `Access Denied: Role '${role || 'None'}' is not authorized to create table! (Admin only)`);
    }

    initTable((err) => {
        if (err) return sendAlert(res, 'Error: ' + err.message);
        sendAlert(res, 'Students table created successfully!');
    });
});

app.listen(PORT, () => {
    console.log(`[Version 1 - In-Memory RBAC] Server running at http://localhost:${PORT}`);
});
