
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelectionPage from './pages/RoleSelectionPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import AdminDashboard from './pages/AdminDashboard';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
import NoticePage from './pages/NoticePage';
import ResourcePage from './pages/ResourcePage';
import ForumPage from './pages/ForumPage';
import StatsPage from './pages/StatsPage';
import PropsOffPage from './pages/PropsOffPage';
import PropsReminder from './components/PropsReminder';

const App: React.FC = () => {
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

      ws.onopen = () => {
        console.log('WebSocket Connected');
        const userData = localStorage.getItem('userData');
        if (userData) {
          const { name, email, branch, department } = JSON.parse(userData);
          ws.send(JSON.stringify({ type: 'LOGIN', name, email, branch, department }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'USER_LIST') {
            window.dispatchEvent(new CustomEvent('userlist_update', { detail: data.users || [] }));
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected. Reconnecting...');
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        ws.close();
      };

      return ws;
    }

    const ws = connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <HashRouter>
      <div className="min-h-screen w-full font-sans bg-[#f8fafc]">
        <PropsReminder />
        <Routes>
          <Route path="/" element={<RoleSelectionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/report" element={<ReportPage title="보고방" type="CENTER_LIST" icon="description" color="orange-500" />} />
          <Route path="/resource" element={<ResourcePage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/props-off" element={<PropsOffPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
