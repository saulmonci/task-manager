import React, { useEffect, useState } from 'react';
import { Modal, List, Button, Typography, Space, message, Tag } from 'antd';
import { InboxOutlined, RedoOutlined, DeleteOutlined } from '@ant-design/icons';
import { getTasks, updateTask, deleteTask } from '../api';
import type { Task } from '../types';

const { Text } = Typography;

interface ArchivePanelProps {
  open: boolean;
  onCancel: () => void;
  projectId: number | null;
  onRestore: () => void;
}

export const ArchivePanel: React.FC<ArchivePanelProps> = ({ open, onCancel, projectId, onRestore }) => {
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArchived = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await getTasks(projectId, true);
      setArchivedTasks(data);
    } catch (e) {
      message.error('Error al cargar tareas archivadas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchArchived();
    }
  }, [open, projectId]);

  const handleRestore = async (taskId: number) => {
    try {
      await updateTask(taskId, { is_archived: 0 });
      message.success('Tarea restaurada.');
      fetchArchived();
      onRestore();
    } catch (e) {
      message.error('Error al restaurar la tarea.');
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await deleteTask(taskId);
      message.success('Tarea eliminada definitivamente.');
      fetchArchived();
    } catch (e) {
      message.error('Error al eliminar la tarea.');
    }
  };

  return (
    <Modal
      title={<span><InboxOutlined /> Tareas Archivadas</span>}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <List
        loading={loading}
        dataSource={archivedTasks}
        locale={{ emptyText: 'No hay tareas archivadas.' }}
        renderItem={(task) => (
          <List.Item
            actions={[
              <Button key="restore" type="link" icon={<RedoOutlined />} onClick={() => handleRestore(task.id)}>Restaurar</Button>,
              <Button key="delete" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(task.id)}>Eliminar</Button>
            ]}
          >
            <List.Item.Meta
              title={<Text delete>{task.title}</Text>}
              description={
                <Space size={8} style={{ marginTop: 4 }}>
                  {task.priority && <Tag>{task.priority}</Tag>}
                  {task.assignee && <Text type="secondary" style={{ fontSize: 12 }}>Asignado: {task.assignee}</Text>}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
};
