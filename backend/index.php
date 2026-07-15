<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-User-Id");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '/';

// Authentication Header Extraction
$currentUserId = isset($_SERVER['HTTP_X_USER_ID']) ? intval($_SERVER['HTTP_X_USER_ID']) : null;
$currentUserRole = 'user';

if ($currentUserId) {
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$currentUserId]);
    $userRoleFetch = $stmt->fetch();
    if ($userRoleFetch) {
        $currentUserRole = $userRoleFetch['role'];
    }
}

// Router
if ($path == '/login' && $method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if (!empty($data->username) && !empty($data->password)) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$data->username]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($data->password, $user['password'])) {
            echo json_encode([
                "id" => $user['id'],
                "username" => $user['username'],
                "role" => $user['role']
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["message" => "Usuario o contraseña incorrectos."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["message" => "Faltan datos de inicio de sesión."]);
    }
} elseif ($path == '/users') {
    if ($currentUserRole !== 'admin') {
        http_response_code(403);
        echo json_encode(["message" => "No autorizado."]);
        exit;
    }
    
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, username, role FROM users");
        echo json_encode($stmt->fetchAll());
    } elseif ($method == 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->username) && !empty($data->password)) {
            $hashed = password_hash($data->password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            try {
                $stmt->execute([$data->username, $hashed, $data->role ?? 'user']);
                echo json_encode(["message" => "Usuario creado exitosamente."]);
            } catch (\PDOException $e) {
                http_response_code(400);
                echo json_encode(["message" => "El usuario ya existe."]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Datos incompletos."]);
        }
    }
} elseif (preg_match('/^\/users\/(\d+)$/', $path, $matches) && $method == 'DELETE') {
    if ($currentUserRole !== 'admin') {
        http_response_code(403);
        echo json_encode(["message" => "No autorizado."]);
        exit;
    }
    $userId = $matches[1];
    
    // Prevent deleting the main admin
    $stmtCheck = $pdo->prepare("SELECT username FROM users WHERE id = ?");
    $stmtCheck->execute([$userId]);
    $u = $stmtCheck->fetch();
    if ($u && $u['username'] === 'admin') {
        http_response_code(400);
        echo json_encode(["message" => "No se puede eliminar el usuario administrador principal."]);
        exit;
    }
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    
    // Clean up project relations
    $stmtClean = $pdo->prepare("DELETE FROM project_users WHERE user_id = ?");
    $stmtClean->execute([$userId]);
    
    echo json_encode(["message" => "Usuario eliminado."]);
} elseif ($path == '/projects') {
    if ($method == 'GET') {
        if ($currentUserRole === 'admin') {
            $stmt = $pdo->query("SELECT * FROM projects ORDER BY id DESC");
            echo json_encode($stmt->fetchAll());
        } else {
            $stmt = $pdo->prepare("SELECT p.* FROM projects p INNER JOIN project_users pu ON p.id = pu.project_id WHERE pu.user_id = ? ORDER BY p.id DESC");
            $stmt->execute([$currentUserId]);
            echo json_encode($stmt->fetchAll());
        }
    } elseif ($method == 'POST') {
        if ($currentUserRole !== 'admin') {
            http_response_code(403);
            echo json_encode(["message" => "No autorizado."]);
            exit;
        }
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->name)) {
            $stmt = $pdo->prepare("INSERT INTO projects (name, description) VALUES (?, ?)");
            $stmt->execute([$data->name, $data->description ?? '']);
            $id = $pdo->lastInsertId();
            echo json_encode(["message" => "Proyecto creado.", "id" => $id]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "El nombre es obligatorio."]);
        }
    }
} elseif (preg_match('/^\/projects\/(\d+)$/', $path, $matches) && $method == 'DELETE') {
    if ($currentUserRole !== 'admin') {
        http_response_code(403);
        echo json_encode(["message" => "No autorizado."]);
        exit;
    }
    $projectId = $matches[1];
    
    $stmt = $pdo->prepare("DELETE FROM projects WHERE id = ?");
    $stmt->execute([$projectId]);
    
    // Clean up relations and tasks
    $stmtClean1 = $pdo->prepare("DELETE FROM project_users WHERE project_id = ?");
    $stmtClean1->execute([$projectId]);
    
    $stmtClean2 = $pdo->prepare("DELETE FROM tasks WHERE project_id = ?");
    $stmtClean2->execute([$projectId]);
    
    echo json_encode(["message" => "Proyecto eliminado."]);
} elseif (preg_match('/^\/projects\/(\d+)\/users$/', $path, $matches)) {
    $projectId = $matches[1];
    
    if ($method == 'GET') {
        $stmt = $pdo->prepare("SELECT u.id, u.username, u.role FROM users u INNER JOIN project_users pu ON u.id = pu.user_id WHERE pu.project_id = ?");
        $stmt->execute([$projectId]);
        echo json_encode($stmt->fetchAll());
    } elseif ($method == 'POST') {
        if ($currentUserRole !== 'admin') {
            http_response_code(403);
            echo json_encode(["message" => "No autorizado."]);
            exit;
        }
        $data = json_decode(file_get_contents("php://input"));
        
        $stmtDel = $pdo->prepare("DELETE FROM project_users WHERE project_id = ?");
        $stmtDel->execute([$projectId]);
        
        if (!empty($data->userIds) && is_array($data->userIds)) {
            $stmtInsert = $pdo->prepare("INSERT INTO project_users (project_id, user_id) VALUES (?, ?)");
            foreach ($data->userIds as $uid) {
                $stmtInsert->execute([$projectId, $uid]);
            }
        }
        echo json_encode(["message" => "Asignación de usuarios actualizada."]);
    }
} elseif ($path == '/tasks') {
    // Standard access validation helper
    $validateAccess = function($projId) use ($currentUserId, $currentUserRole, $pdo) {
        if ($currentUserRole === 'admin') return true;
        if (!$currentUserId) return false;
        $stmt = $pdo->prepare("SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?");
        $stmt->execute([$projId, $currentUserId]);
        return (bool)$stmt->fetch();
    };

    if ($method == 'GET') {
        $projectId = isset($_GET['project_id']) ? intval($_GET['project_id']) : null;
        $archived = isset($_GET['archived']) && $_GET['archived'] == '1' ? 1 : 0;
        
        if (!$projectId) {
            http_response_code(400);
            echo json_encode(["message" => "Falta el id del proyecto."]);
            exit;
        }
        if (!$validateAccess($projectId)) {
            http_response_code(403);
            echo json_encode(["message" => "No tienes acceso a este proyecto."]);
            exit;
        }
        
        if ($archived) {
            $stmt = $pdo->prepare("SELECT * FROM tasks WHERE project_id = ? AND is_archived = 1 ORDER BY created_at DESC");
        } else {
            $stmt = $pdo->prepare("SELECT * FROM tasks WHERE project_id = ? AND (is_archived = 0 OR is_archived IS NULL) ORDER BY created_at DESC");
        }
        $stmt->execute([$projectId]);
        echo json_encode($stmt->fetchAll());
    } elseif ($method == 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->title) && !empty($data->project_id)) {
            if (!$validateAccess($data->project_id)) {
                http_response_code(403);
                echo json_encode(["message" => "No tienes acceso a este proyecto."]);
                exit;
            }
            $stmt = $pdo->prepare("INSERT INTO tasks (title, description, status, priority, assignee, labels, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $data->title,
                $data->description ?? '',
                $data->status ?? 'todo',
                $data->priority ?? 'Medium',
                $data->assignee ?? null,
                $data->labels ?? null,
                $data->project_id
            ]);
            $id = $pdo->lastInsertId();
            echo json_encode(["message" => "Tarea creada.", "id" => $id]);
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Título y ID de proyecto son requeridos."]);
        }
    }
} elseif (preg_match('/^\/tasks\/(\d+)$/', $path, $matches)) {
    $id = $matches[1];
    
    // Helper to validate access to a task
    $validateTaskAccess = function($taskId) use ($currentUserId, $currentUserRole, $pdo) {
        if ($currentUserRole === 'admin') return true;
        if (!$currentUserId) return false;
        $stmt = $pdo->prepare("SELECT project_id FROM tasks WHERE id = ?");
        $stmt->execute([$taskId]);
        $task = $stmt->fetch();
        if (!$task) return false;
        
        $stmtCheck = $pdo->prepare("SELECT 1 FROM project_users WHERE project_id = ? AND user_id = ?");
        $stmtCheck->execute([$task['project_id'], $currentUserId]);
        return (bool)$stmtCheck->fetch();
    };

    if (!$validateTaskAccess($id)) {
        http_response_code(403);
        echo json_encode(["message" => "No autorizado para modificar esta tarea."]);
        exit;
    }
    
    if ($method == 'PUT') {
        $data = json_decode(file_get_contents("php://input"));
        
        $updates = [];
        $params = [];
        $allowedFields = ['title', 'description', 'status', 'priority', 'assignee', 'labels', 'is_archived'];
        
        foreach ($allowedFields as $field) {
            if (isset($data->$field)) {
                $updates[] = "$field = ?";
                $params[] = $data->$field;
            }
        }
        
        if (!empty($updates)) {
            $params[] = $id;
            $sql = "UPDATE tasks SET " . implode(", ", $updates) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(["message" => "Tarea actualizada."]);
        } else {
            echo json_encode(["message" => "Sin datos para actualizar."]);
        }
    } elseif ($method == 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["message" => "Tarea eliminada."]);
    }
} else {
    http_response_code(404);
    echo json_encode(["message" => "Ruta no encontrada."]);
}
