
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
import ClassMaterialsPage from './pages/ClassMaterialsPage';
import ForumPage from './pages/ForumPage';
import StatsPage from './pages/StatsPage';
import PropsOffPage from './pages/PropsOffPage';
import SalaryPage from './pages/SalaryPage';
import PropsReminder from './components/PropsReminder';

const App: React.FC = () => {
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

      const sendLogin = async () => {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const { name, email, branch, department } = JSON.parse(userData);
          let location = branch;
          
          try {
            let cachedLoc = sessionStorage.getItem('userLocationV3');
            
            const translateToKorean = (name: string): string => {
              if (!name) return '';
              const cleanName = name.replace(/-si|-do|-gun|-gu|시$|도$|군$|구$/gi, '').trim();
              const map: Record<string, string> = {
                'Seoul': '서울', 'Busan': '부산', 'Incheon': '인천', 'Daegu': '대구',
                'Daejeon': '대전', 'Gwangju': '광주', 'Ulsan': '울산', 'Sejong': '세종',
                'Gyeonggi': '경기', 'Gangwon': '강원', 'Chungcheongbuk': '충북', 'Chungbuk': '충북',
                'Chungcheongnam': '충남', 'Chungnam': '충남', 'Jeollabuk': '전북', 'Jeonbuk': '전북',
                'Jeollanam': '전남', 'Jeonnam': '전남', 'Gyeongsangbuk': '경북', 'Gyeongbuk': '경북',
                'Gyeongsangnam': '경남', 'Gyeongnam': '경남', 'Jeju': '제주',
                'Suwon': '수원', 'Seongnam': '성남', 'Goyang': '고양', 'Yongin': '용인',
                'Bucheon': '부천', 'Ansan': '안산', 'Anyang': '안양', 'Namyangju': '남양주',
                'Hwaseong': '화성', 'Pyeongtaek': '평택', 'Uijeongbu': '의정부', 'Siheung': '시흥',
                'Paju': '파주', 'Gimpo': '김포', 'Gwangmyeong': '광명', 'Gunpo': '군포',
                'Icheon': '이천', 'Osan': '오산', 'Hanam': '하남', 'Yangju': '양주',
                'Guri': '구리', 'Anseong': '안성', 'Pocheon': '포천', 'Uiwang': '의왕',
                'Yeoju': '여주', 'Dongducheon': '동두천', 'Gwacheon': '과천',
                'Cheongju': '청주', 'Chungju': '충주', 'Jecheon': '제천', 'Cheonan': '천안',
                'Gongju': '공주', 'Boryeong': '보령', 'Asan': '아산', 'Seosan': '서산',
                'Nonsan': '논산', 'Gyeryong': '계룡', 'Dangjin': '당진',
                'Jeonju': '전주', 'Gunsan': '군산', 'Iksan': '익산', 'Jeongeup': '정읍',
                'Namwon': '남원', 'Gimje': '김제', 'Mokpo': '목포', 'Yeosu': '여수',
                'Suncheon': '순천', 'Naju': '나주', 'Gwangyang': '광양',
                'Pohang': '포항', 'Gyeongju': '경주', 'Gimcheon': '김천', 'Andong': '안동',
                'Gumi': '구미', 'Yeongju': '영주', 'Yeongcheon': '영천', 'Sangju': '상주',
                'Mungyeong': '문경', 'Gyeongsan': '경산', 'Changwon': '창원', 'Jinju': '진주',
                'Tongyeong': '통영', 'Sacheon': '사천', 'Gimhae': '김해', 'Miryang': '밀양',
                'Geoje': '거제', 'Yangsan': '양산', 'Chuncheon': '춘천', 'Wonju': '원주',
                'Gangneung': '강릉', 'Donghae': '동해', 'Taebaek': '태백', 'Sokcho': '속초',
                'Samcheok': '삼척'
              };
              
              if (map[cleanName]) return map[cleanName];
              if (map[name]) return map[name];
              
              for (const [eng, kor] of Object.entries(map)) {
                if (name.toLowerCase().includes(eng.toLowerCase())) {
                  return kor;
                }
              }
              return name;
            };

            if (!cachedLoc) {
              // 권한 묻지 않고 IP 기반으로만 처리
              const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
              const geo = await res.json();
              const engCity = geo.city || geo.region;
              const ipAddress = geo.ip || '';
              
              let cityName = '';
              if (engCity) {
                cityName = translateToKorean(engCity);
              }

              // IP와 도시명 조합
              if (ipAddress && cityName) {
                cachedLoc = `${ipAddress}, ${cityName}`;
              } else if (ipAddress) {
                cachedLoc = ipAddress;
              } else if (cityName) {
                cachedLoc = cityName;
              }

              if (cachedLoc) {
                sessionStorage.setItem('userLocationV3', cachedLoc);
              }
            }
            if (cachedLoc) location = cachedLoc;
          } catch (e) {
            console.error('Location fetch failed:', e);
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'LOGIN', name, email, branch, department, location }));
          }
        }
      };

      ws.onopen = () => {
        console.log('WebSocket Connected');
        sendLogin();
      };

      const handleLoginSuccess = () => {
        sendLogin();
      };
      window.addEventListener('login_success', handleLoginSuccess);

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
        window.removeEventListener('login_success', handleLoginSuccess);
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
          <Route path="/class-materials" element={<ClassMaterialsPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/props-off" element={<PropsOffPage />} />
          <Route path="/salary" element={<SalaryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
