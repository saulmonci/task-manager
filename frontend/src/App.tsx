import { useState } from 'react';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { KanbanBoard } from './components/KanbanBoard';
import { Login } from './components/Login';
import type { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <ConfigProvider locale={esES} theme={{ token: { colorPrimary: '#0052cc' } }}>
      {user ? (
        <KanbanBoard currentUser={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />
      )}
    </ConfigProvider>
  );
}

export default App;
