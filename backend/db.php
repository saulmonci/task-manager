<?php
$host = getenv('DB_HOST') ?: 'localhost';
$db   = getenv('DB_NAME') ?: 'u235251407_tasks';
$user = getenv('DB_USER') ?: 'u235251407_tasks';
$pass = getenv('DB_PASS') ?: 'Ynn4C4WVjkYP@Km';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // Return 503 instead of crashing completely if db is starting up
    http_response_code(503);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

// Initialize tables if they don't exist
$init_sql = "
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS project_users (
    project_id INT,
    user_id INT,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(50) DEFAULT 'Medium',
    assignee VARCHAR(100) DEFAULT NULL,
    labels VARCHAR(255) DEFAULT NULL,
    project_id INT DEFAULT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
";

$pdo->exec($init_sql);

// Alter tasks table if project_id doesn't exist
try {
    $pdo->query("SELECT project_id FROM tasks LIMIT 1");
} catch (\PDOException $e) {
    // Column doesn't exist, add it
    $pdo->exec("ALTER TABLE tasks ADD COLUMN project_id INT DEFAULT NULL");
}

// Alter tasks table if is_archived doesn't exist
try {
    $pdo->query("SELECT is_archived FROM tasks LIMIT 1");
} catch (\PDOException $e) {
    // Column doesn't exist, add it
    $pdo->exec("ALTER TABLE tasks ADD COLUMN is_archived TINYINT(1) DEFAULT 0");
}

// Seed admin user
$stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
$stmt->execute(['admin']);
if (!$stmt->fetch()) {
    $hashedPassword = password_hash('secret', PASSWORD_BCRYPT);
    $insertAdmin = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    $insertAdmin->execute(['admin', $hashedPassword, 'admin']);
}

// Seed default project
$stmtProj = $pdo->query("SELECT id FROM projects LIMIT 1");
if (!$stmtProj->fetch()) {
    $pdo->exec("INSERT INTO projects (name, description) VALUES ('Proyecto Alpha', 'Proyecto por defecto para gestionar tareas')");
    $projectId = $pdo->lastInsertId();

    // Assign admin to the default project
    $stmtAdmin = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmtAdmin->execute(['admin']);
    $adminUser = $stmtAdmin->fetch();
    if ($adminUser) {
        $stmtAssign = $pdo->prepare("INSERT INTO project_users (project_id, user_id) VALUES (?, ?)");
        $stmtAssign->execute([$projectId, $adminUser['id']]);

        // Update any existing tasks to belong to this default project
        $stmtUpdateTasks = $pdo->prepare("UPDATE tasks SET project_id = ? WHERE project_id IS NULL");
        $stmtUpdateTasks->execute([$projectId]);
    }
}
