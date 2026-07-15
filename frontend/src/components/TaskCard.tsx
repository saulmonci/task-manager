import React from 'react';
import { Card, Typography, Tag, Avatar, Space, Popconfirm, Button } from 'antd';
import { UserOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Draggable } from '@hello-pangea/dnd';
import type { Task } from '../types';

const { Text, Paragraph } = Typography;

interface TaskCardProps {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
  onDelete?: (taskId: number) => void;
}

const getPriorityIcon = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return <ArrowUpOutlined style={{ color: '#cf1322' }} />;
    case 'medium':
      return <MinusOutlined style={{ color: '#d48806' }} />;
    case 'low':
      return <ArrowDownOutlined style={{ color: '#389e0d' }} />;
    default:
      return null;
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick, onDelete }) => {
  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            marginBottom: 8,
            ...provided.draggableProps.style,
          }}
          onClick={() => onClick(task)}
        >
          <Card
            size="small"
            style={{
              borderRadius: 8,
              boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
              border: snapshot.isDragging ? '1px solid #1890ff' : '1px solid #f0f0f0',
              cursor: 'grab',
            }}
            hoverable
          >
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text strong>{task.title}</Text>
                {onDelete && (
                  <Popconfirm
                    title="¿Eliminar esta tarea?"
                    onConfirm={(e) => { e?.stopPropagation(); onDelete(task.id); }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={(e) => e.stopPropagation()} style={{ padding: 0, height: 'auto' }} />
                  </Popconfirm>
                )}
              </div>

              {task.description && (
                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }} ellipsis={{ rows: 3, tooltip: task.description }}>
                  {task.description}
                </Paragraph>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Space size={4}>
                  {getPriorityIcon(task.priority)}
                  <Text type="secondary" style={{ fontSize: 12 }}>{task.priority}</Text>
                </Space>

                {task.labels && (
                  <Tag color="blue" style={{ border: 'none', borderRadius: 4 }}>{task.labels}</Tag>
                )}

                <Avatar size="small" icon={<UserOutlined />} src={task.assignee ? `https://ui-avatars.com/api/?name=${task.assignee}` : undefined} />
              </div>
            </Space>
          </Card>
        </div>
      )}
    </Draggable>
  );
};
