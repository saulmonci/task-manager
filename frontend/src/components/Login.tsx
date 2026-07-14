import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Layout } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { loginUser } from '../api';
import type { User } from '../types';

const { Title, Text } = Typography;
const { Content } = Layout;

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const user = await loginUser(values.username, values.password);
      localStorage.setItem('user', JSON.stringify(user));
      message.success(`Bienvenido, ${user.username}`);
      onLoginSuccess(user);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Error al iniciar sesión.';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '20px' }}>
        <Card style={{ width: 400, borderRadius: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0, color: '#0052cc' }}>Task Manager</Title>
            <Text type="secondary">Inicia sesión para gestionar tus tareas</Text>
          </div>
          
          <Form
            name="login_form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Por favor ingresa tu usuario' }]}
            >
              <Input prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Usuario" />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
                placeholder="Contraseña"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} style={{ background: '#0052cc', border: 'none', height: 45, borderRadius: 6 }}>
                Iniciar Sesión
              </Button>
            </Form.Item>
          </Form>
        </Card>

      </Content>
    </Layout>
  );
};
