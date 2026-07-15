import axios from 'axios';
import type { Task, User, Project } from './types';

const BASE_URL = '/api';

// Interceptor to automatically add X-User-Id header to requests
axios.interceptors.request.use((config) => {
  const userJson = localStorage.getItem('user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      config.headers['X-User-Id'] = user.id;
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
    }
  }
  return config;
});

// Auth API
export const loginUser = async (username: string, password: string): Promise<User> => {
  const response = await axios.post(`${BASE_URL}/login`, { username, password });
  return response.data;
};

// Users API (Admin only)
export const getUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${BASE_URL}/users`);
  return response.data;
};

export const createUser = async (user: Partial<User> & { password?: string }): Promise<any> => {
  const response = await axios.post(`${BASE_URL}/users`, user);
  return response.data;
};

export const deleteUser = async (id: number): Promise<any> => {
  const response = await axios.delete(`${BASE_URL}/users/${id}`);
  return response.data;
};

// Projects API
export const getProjects = async (): Promise<Project[]> => {
  const response = await axios.get(`${BASE_URL}/projects`);
  return response.data;
};

export const createProject = async (project: Partial<Project>): Promise<Project> => {
  const response = await axios.post(`${BASE_URL}/projects`, project);
  return response.data;
};

export const deleteProject = async (id: number): Promise<any> => {
  const response = await axios.delete(`${BASE_URL}/projects/${id}`);
  return response.data;
};

export const getProjectUsers = async (projectId: number): Promise<User[]> => {
  const response = await axios.get(`${BASE_URL}/projects/${projectId}/users`);
  return response.data;
};

export const assignProjectUsers = async (projectId: number, userIds: number[]): Promise<any> => {
  const response = await axios.post(`${BASE_URL}/projects/${projectId}/users`, { userIds });
  return response.data;
};

// Tasks API (Requires project_id filtering)
export const getTasks = async (projectId: number, archived: boolean = false): Promise<Task[]> => {
  const response = await axios.get(`${BASE_URL}/tasks`, { params: { project_id: projectId, archived: archived ? 1 : 0 } });
  return response.data;
};

export const createTask = async (task: Partial<Task>): Promise<any> => {
  const response = await axios.post(`${BASE_URL}/tasks`, task);
  return response.data;
};

export const updateTask = async (id: number, task: Partial<Task>): Promise<any> => {
  const response = await axios.put(`${BASE_URL}/tasks/${id}`, task);
  return response.data;
};

export const deleteTask = async (id: number): Promise<any> => {
  const response = await axios.delete(`${BASE_URL}/tasks/${id}`);
  return response.data;
};
