import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { Typography, Button, Modal, Form, Input, Select, message, Spin, Layout, Space, Avatar, Empty } from 'antd';
import { PlusOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { TaskCard } from './TaskCard';
import type { Task, BoardData, Project, User } from '../types';
import { getTasks, createTask, updateTask, getProjects, getProjectUsers } from '../api';
import { useEffect, useState } from 'react';
import { AdminPanel } from './AdminPanel';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

const initialData: BoardData = {
  tasks: {},
  columns: {
    'todo': { id: 'todo', title: 'POR HACER', taskIds: [] },
    'inprogress': { id: 'inprogress', title: 'EN PROGRESO', taskIds: [] },
    'review': { id: 'review', title: 'REVISIÓN', taskIds: [] },
    'done': { id: 'done', title: 'LISTO', taskIds: [] },
  },
  columnOrder: ['todo', 'inprogress', 'review', 'done'],
};

interface KanbanBoardProps {
  currentUser: User;
  onLogout: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ currentUser, onLogout }) => {
  const [boardData, setBoardData] = useState<BoardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Projects states
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectUsers, setProjectUsers] = useState<User[]>([]);
  
  // Admin Panel modal state
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  
  const [form] = Form.useForm();

  // Load projects assigned to user
  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) {
        // Keep selection if it's still in the list, otherwise select first
        if (selectedProjectId === null || !data.some((p) => p.id === selectedProjectId)) {
          setSelectedProjectId(data[0].id);
        }
      } else {
        setSelectedProjectId(null);
        setBoardData(initialData);
        setLoading(false);
      }
    } catch (e) {
      message.error('Error al cargar los proyectos.');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Load project users and tasks when selected project changes
  useEffect(() => {
    if (selectedProjectId !== null) {
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadProjectData = async (projId: number) => {
    try {
      setLoading(true);
      const [tasks, users] = await Promise.all([
        getTasks(projId),
        getProjectUsers(projId)
      ]);
      
      setProjectUsers(users);

      const newBoardData: BoardData = {
        ...initialData,
        tasks: {},
        columns: {
          'todo': { ...initialData.columns['todo'], taskIds: [] },
          'inprogress': { ...initialData.columns['inprogress'], taskIds: [] },
          'review': { ...initialData.columns['review'], taskIds: [] },
          'done': { ...initialData.columns['done'], taskIds: [] },
        }
      };

      tasks.forEach((task: Task) => {
        newBoardData.tasks[task.id] = task;
        const status = task.status || 'todo';
        if (newBoardData.columns[status]) {
          newBoardData.columns[status].taskIds.push(task.id);
        } else {
          newBoardData.columns['todo'].taskIds.push(task.id);
        }
      });

      setBoardData(newBoardData);
    } catch (error) {
      console.error('Error loading project tasks/users', error);
      message.error('Error al cargar datos del proyecto.');
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = boardData.columns[source.droppableId];
    const finishColumn = boardData.columns[destination.droppableId];

    // Moving within the same column
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, parseInt(draggableId));

      const newColumn = { ...startColumn, taskIds: newTaskIds };
      setBoardData({
        ...boardData,
        columns: { ...boardData.columns, [newColumn.id]: newColumn },
      });
      return;
    }

    // Moving from one column to another
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, parseInt(draggableId));
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    setBoardData({
      ...boardData,
      columns: {
        ...boardData.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    });

    try {
      await updateTask(parseInt(draggableId), { status: destination.droppableId });
      message.success('Estado de tarea actualizado');
    } catch (error) {
      message.error('Error al actualizar el estado en el servidor');
      if (selectedProjectId !== null) {
        loadProjectData(selectedProjectId); // Revert
      }
    }
  };

  const handleCreateOrUpdate = async (values: any) => {
    if (selectedProjectId === null) return;
    try {
      if (editingTask) {
        await updateTask(editingTask.id, values);
        message.success('Tarea actualizada.');
      } else {
        await createTask({ ...values, status: 'todo', project_id: selectedProjectId });
        message.success('Tarea creada.');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingTask(null);
      loadProjectData(selectedProjectId);
    } catch (error) {
      message.error('Error al guardar la tarea.');
    }
  };

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      form.setFieldsValue(task);
    } else {
      setEditingTask(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px #f0f1f2', zIndex: 1 }}>
        <Space size="large">
          <Title level={3} style={{ margin: 0, color: '#0052cc' }}>Task Manager</Title>
          {projects.length > 0 && (
            <Select
              style={{ width: 220 }}
              placeholder="Seleccionar Proyecto"
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
            >
              {projects.map((proj) => (
                <Select.Option key={proj.id} value={proj.id}>{proj.name}</Select.Option>
              ))}
            </Select>
          )}
        </Space>
        
        <Space size="middle">
          <Space>
            <Avatar style={{ backgroundColor: '#0052cc' }} icon={<UserOutlined />} />
            <Text strong>{currentUser.username}</Text>
          </Space>
          
          {currentUser.role === 'admin' && (
            <Button icon={<SettingOutlined />} onClick={() => setIsAdminPanelOpen(true)}>
              Administración
            </Button>
          )}
          
          {projects.length > 0 && selectedProjectId !== null && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ background: '#0052cc', border: 'none' }}>
              Nueva Tarea
            </Button>
          )}
          
          <Button icon={<LogoutOutlined />} onClick={onLogout} danger>
            Cerrar Sesión
          </Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '24px', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><Spin size="large" /></div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
            <Empty
              description={
                <span>
                  No tienes ningún proyecto asignado.<br />
                  {currentUser.role === 'admin' ? 'Usa el botón de Administración para crear uno.' : 'Pide a un administrador que te asigne uno.'}
                </span>
              }
            />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: 'flex', gap: '20px', minWidth: 'max-content', flexGrow: 1 }}>
              {boardData.columnOrder.map((columnId) => {
                const column = boardData.columns[columnId];
                const tasks = column.taskIds.map((taskId) => boardData.tasks[taskId]);

                return (
                  <div key={column.id} style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', background: '#ebecf0', borderRadius: '8px 8px 0 0' }}>
                      <Title level={5} style={{ margin: 0, fontSize: 14, color: '#5e6c84' }}>{column.title}</Title>
                    </div>
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            background: snapshot.isDraggingOver ? '#e4e5e9' : '#ebecf0',
                            padding: '8px',
                            minHeight: 250,
                            borderRadius: '0 0 8px 8px',
                            transition: 'background-color 0.2s ease',
                            flexGrow: 1
                          }}
                        >
                          {tasks.map((task, index) => (
                            task && <TaskCard key={task.id} task={task} index={index} onClick={openModal} />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </Content>

      <Modal
        title={editingTask ? "Editar Tarea" : "Nueva Tarea"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Por favor ingrese un título' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Descripción">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="priority" label="Prioridad" initialValue="Medium">
            <Select>
              <Select.Option value="High">Alta (High)</Select.Option>
              <Select.Option value="Medium">Media (Medium)</Select.Option>
              <Select.Option value="Low">Baja (Low)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="assignee" label="Asignado a">
            <Select placeholder="Seleccionar usuario" allowClear>
              {projectUsers.map((user) => (
                <Select.Option key={user.id} value={user.username}>{user.username}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="labels" label="Etiquetas">
            <Input placeholder="Ej. Frontend, Bug, Feature" />
          </Form.Item>
        </Form>
      </Modal>

      <AdminPanel
        open={isAdminPanelOpen}
        onCancel={() => setIsAdminPanelOpen(false)}
        onRefreshProjects={fetchProjects}
      />
    </Layout>
  );
};
