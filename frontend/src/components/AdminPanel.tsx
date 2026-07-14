import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Table, Button, Form, Input, Select, message, Space, Popconfirm, Checkbox, Row, Col, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { getUsers, createUser, deleteUser, getProjects, createProject, deleteProject, getProjectUsers, assignProjectUsers } from '../api';
import type { User, Project } from '../types';

interface AdminPanelProps {
  open: boolean;
  onCancel: () => void;
  onRefreshProjects: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ open, onCancel, onRefreshProjects }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Assign users modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>([]);

  const [userForm] = Form.useForm();
  const [projectForm] = Form.useForm();

  const loadData = async () => {
    try {
      const [usersData, projectsData] = await Promise.all([getUsers(), getProjects()]);
      setUsers(usersData);
      setProjects(projectsData);
    } catch (e) {
      message.error('Error al cargar datos del panel de administración.');
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // User CRUD handlers
  const handleCreateUser = async (values: any) => {
    try {
      await createUser(values);
      message.success('Usuario creado con éxito.');
      userForm.resetFields();
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Error al crear usuario.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      message.success('Usuario eliminado.');
      loadData();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Error al eliminar usuario.');
    }
  };

  // Project CRUD handlers
  const handleCreateProject = async (values: any) => {
    try {
      await createProject(values);
      message.success('Proyecto creado con éxito.');
      projectForm.resetFields();
      loadData();
      onRefreshProjects();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Error al crear proyecto.');
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await deleteProject(id);
      message.success('Proyecto eliminado.');
      loadData();
      onRefreshProjects();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Error al eliminar proyecto.');
    }
  };

  // Project User Assignment Handlers
  const handleOpenAssignModal = async (project: Project) => {
    setSelectedProject(project);
    try {
      const projectUsers = await getProjectUsers(project.id);
      setAssignedUserIds(projectUsers.map((u) => u.id));
      setAssignModalOpen(true);
    } catch (e) {
      message.error('Error al cargar usuarios asignados.');
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedProject) return;
    try {
      await assignProjectUsers(selectedProject.id, assignedUserIds);
      message.success(`Usuarios asignados a ${selectedProject.name}`);
      setAssignModalOpen(false);
      setSelectedProject(null);
    } catch (e) {
      message.error('Error al guardar asignaciones de usuarios.');
    }
  };

  // Tables Columns Definition
  const userColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Usuario', dataIndex: 'username', key: 'username' },
    { title: 'Rol', dataIndex: 'role', key: 'role' },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: User) => (
        <Popconfirm
          title="¿Eliminar este usuario?"
          description="Se desvinculará de todos los proyectos."
          onConfirm={() => handleDeleteUser(record.id)}
          disabled={record.username === 'admin'}
          okText="Sí"
          cancelText="No"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.username === 'admin'}
          />
        </Popconfirm>
      ),
    },
  ];

  const projectColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Nombre', dataIndex: 'name', key: 'name' },
    { title: 'Descripción', dataIndex: 'description', key: 'description' },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: Project) => (
        <Space size="middle">
          <Button
            type="dashed"
            icon={<UsergroupAddOutlined />}
            onClick={() => handleOpenAssignModal(record)}
          >
            Usuarios
          </Button>
          <Popconfirm
            title="¿Eliminar este proyecto?"
            description="Se eliminarán todas las tareas vinculadas a este proyecto."
            onConfirm={() => handleDeleteProject(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Panel de Administración"
        open={open}
        onCancel={onCancel}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Tabs defaultActiveKey="projects">
          <Tabs.TabPane tab="Proyectos" key="projects">
            <Row gutter={16}>
              <Col span={16}>
                <Table
                  dataSource={projects}
                  columns={projectColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              </Col>
              <Col span={8}>
                <CardTitle title="Nuevo Proyecto" />
                <Form form={projectForm} layout="vertical" onFinish={handleCreateProject}>
                  <Form.Item
                    name="name"
                    label="Nombre"
                    rules={[{ required: true, message: 'Ingresa un nombre.' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item name="description" label="Descripción">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                      Crear Proyecto
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Tabs.TabPane>
          
          <Tabs.TabPane tab="Usuarios" key="users">
            <Row gutter={16}>
              <Col span={16}>
                <Table
                  dataSource={users}
                  columns={userColumns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              </Col>
              <Col span={8}>
                <CardTitle title="Nuevo Usuario" />
                <Form form={userForm} layout="vertical" onFinish={handleCreateUser}>
                  <Form.Item
                    name="username"
                    label="Usuario"
                    rules={[{ required: true, message: 'Ingresa un usuario.' }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    label="Contraseña"
                    rules={[{ required: true, message: 'Ingresa una contraseña.' }]}
                  >
                    <Input.Password />
                  </Form.Item>
                  <Form.Item name="role" label="Rol" initialValue="user">
                    <Select>
                      <Select.Option value="user">Usuario (User)</Select.Option>
                      <Select.Option value="admin">Administrador (Admin)</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                      Crear Usuario
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Tabs.TabPane>
        </Tabs>
      </Modal>


      {/* Sync Users for Project Modal */}
      <Modal
        title={`Asignar Usuarios a: ${selectedProject?.name}`}
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleSaveAssignments}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <p>Selecciona los usuarios que podrán ver y gestionar tareas de este proyecto:</p>
        <Divider />
        <Checkbox.Group
          value={assignedUserIds}
          onChange={(checkedValues) => setAssignedUserIds(checkedValues as number[])}
          style={{ width: '100%' }}
        >
          <Row gutter={[16, 8]}>
            {users.map((user) => (
              <Col span={12} key={user.id}>
                <Checkbox value={user.id}>
                  {user.username} {user.role === 'admin' && '(Admin)'}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Modal>
    </>
  );
};

const CardTitle: React.FC<{ title: string }> = ({ title }) => (
  <h4 style={{ margin: '0 0 16px 0', fontSize: 14, color: '#5e6c84', fontWeight: 600 }}>{title}</h4>
);
