export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  labels: string;
  created_at: string;
  project_id: number;
}

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
}

export interface ColumnData {
  id: string;
  title: string;
  taskIds: number[];
}

export interface BoardData {
  tasks: Record<number, Task>;
  columns: Record<string, ColumnData>;
  columnOrder: string[];
}
