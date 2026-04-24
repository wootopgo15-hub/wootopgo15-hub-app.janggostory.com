import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createServer() {
  const app = express();
  const server = http.createServer(app);

  // 1. WebSocket 서버 설정 (Vite보다 먼저 등록해야 Vite가 소켓을 끊지 않음)
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map();

  server.on('upgrade', (request, socket, head) => {
    console.log('Upgrade request received for URL:', request.url);
    if (request.url?.startsWith('/api/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'LOGIN' || data.type === 'FORCE_LOGIN') {
          let kickoutOccurred = false;
          // 기존 접속자 찾아서 강제 종료 신호 전송
          for (let [clientWs, clientData] of clients.entries()) {
            if (clientData.email === data.email && clientWs !== ws) {
              // 같은 기기/브라우저(deviceId가 같음)인 경우 튕기지 않게 허용 (다중 탭 지원)
              if (!clientData.deviceId || !data.deviceId || clientData.deviceId !== data.deviceId) {
                if (clientWs.readyState === 1) { // 1 = OPEN
                  clientWs.send(JSON.stringify({ type: 'KICKOUT' }));
                  kickoutOccurred = true;
                }
                clients.delete(clientWs);
              }
            }
          }
          
          if (kickoutOccurred) {
            ws.send(JSON.stringify({ type: 'OTHER_LOGGED_OUT_INFO' }));
          }

          // 새로운 기기 로그인 처리
          clients.set(ws, { 
            name: data.name, 
            email: data.email, 
            branch: data.branch, 
            department: data.department,
            location: data.location,
            deviceId: data.deviceId
          });
          broadcastUserList();
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
      broadcastUserList();
    });

    ws.on('error', (error) => {
      console.error('WebSocket Error:', error);
      clients.delete(ws);
      broadcastUserList();
    });
  });

  function broadcastUserList() {
    const userList = Array.from(clients.values());
    
    // 중복 접속자 필터링 (이메일 또는 이름 기준)
    const uniqueUsersMap = new Map();
    userList.forEach(user => {
      const key = user.email || user.name;
      if (key && !uniqueUsersMap.has(key)) {
        uniqueUsersMap.set(key, user);
      }
    });
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    const message = JSON.stringify({ type: 'USER_LIST', users: uniqueUsers });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    });
    console.log('Broadcasted user list:', uniqueUsers.length, 'users');
  }

  // 2. Vite 미들웨어 설정 (개발 환경)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // 프로덕션 환경에서는 빌드된 파일 제공
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  // 3. 서버 시작
  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
  });
}

createServer();
