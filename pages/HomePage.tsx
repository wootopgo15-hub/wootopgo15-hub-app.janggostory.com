
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdBanner from '../components/AdBanner';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    const name = localStorage.getItem('userName') || '사용자';
    const role = localStorage.getItem('userRole') || '강사';
    setUserName(name);
    setUserRole(role);

    const handleUserListUpdate = (event: any) => {
      setActiveUsers(event.detail);
    };

    window.addEventListener('userlist_update', handleUserListUpdate);

    return () => {
      window.removeEventListener('userlist_update', handleUserListUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const mainServices = [
    { id: 'notice', path: '/notice', name: '공지방', sub: 'Notice Room', icon: 'campaign', bg: 'bg-blue-50', text: 'text-primary' },
    { id: 'report', path: '/report', name: '보고방', sub: 'Report Room', icon: 'description', bg: 'bg-orange-50', text: 'text-orange-500' },
    { id: 'resource', path: '/resource', name: '자료방', sub: 'Resources Room', icon: 'folder_open', bg: 'bg-purple-50', text: 'text-purple-500' },
    { id: 'forum', path: '/forum', name: '소통방', sub: 'Comm. Room', icon: 'forum', bg: 'bg-emerald-50', text: 'text-emerald-500' },
  ];

  const recentUpdates = [
    { id: 1, title: '2026 연간 교육 일정 안내', room: '공지방', time: '2시간 전', dot: 'bg-primary' },
    { id: 2, title: '1분기 역량 진단 보고서 작성', room: '보고방', time: '어제', dot: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0a1931] pb-44 font-sans">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full overflow-hidden bg-gray-200 border-2 border-primary/10">
            <img 
              alt="Profile" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkgIZ5cpb0buPoihNcqiBJHjMiLIOX68Ql8ee7c0XxCyZfncjuzGoqjbUmfuwry0Nd8cslaB3CpulK7-9ugeWTPyuRW1bqg6KFHN1rJcTlZ9JTQleuEACljZLggYrN8jLWayV_EXl2C8SV6ABNBi0o0x9Gg-zoZaslBiMwnDn6MX63Wnv_nRJk_lm0MCVG-XKAnonbL4Qmk36Q6_FnqZExCDhz_vXiJYMNecrPlUeK0HsVvPPN0WprhKDIwOYGgOzRM-e7AWCkKyY" 
            />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 font-medium">{userRole} · Welcome back,</p>
            <h2 className="text-lg font-bold text-[#0a1931]">{userName} 강사님</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="size-10 rounded-full flex items-center justify-center bg-gray-50 text-[#0a1931] relative">
            <span className="material-symbols-outlined text-[26px]">notifications</span>
            <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="size-10 rounded-full flex items-center justify-center bg-gray-50 text-[#0a1931]">
            <span className="material-symbols-outlined text-[26px]">search</span>
          </button>
          <button 
            onClick={handleLogout}
            className="size-10 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            title="로그아웃"
          >
            <span className="material-symbols-outlined text-[24px]">logout</span>
          </button>
        </div>
      </header>

      <main>
        {/* Services Grid */}
        <section className="px-6 py-4">
          <h4 className="text-[#0a1931] font-bold mb-4 flex items-center gap-2">
            <span className="size-1.5 bg-primary rounded-full"></span>
            주요 서비스
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {mainServices.map(s => (
              <button 
                key={s.id} 
                onClick={() => navigate(s.path)}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex flex-col items-start gap-4 active:scale-95 transition-all group"
              >
                <div className={`size-12 rounded-2xl ${s.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <span className={`material-symbols-outlined ${s.text} text-3xl`}>{s.icon}</span>
                </div>
                <div>
                  <span className="block text-[#0a1931] font-bold text-lg leading-none">{s.name}</span>
                  <span className="text-[10px] text-gray-400 mt-1 font-medium italic">{s.sub}</span>
                </div>
              </button>
            ))}
            
            {/* Statistics Wide Card */}
            <button 
              onClick={() => navigate('/stats')}
              className="col-span-2 bg-[#0a1931] p-6 rounded-[2.5rem] shadow-xl flex items-center justify-between active:scale-[0.98] transition-transform group"
            >
              <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl">leaderboard</span>
                </div>
                <div className="text-left">
                  <span className="block text-white font-bold text-xl leading-none">통계방</span>
                  <span className="text-[10px] text-white/50 mt-1.5 font-medium italic tracking-wide">Statistics & Analytics Room</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-white/30 text-3xl group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Ad Banner */}
        <section className="px-6">
          <AdBanner slot="1234567890" />
        </section>

        {/* Recent Updates */}
        <section className="px-6 py-6">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-[#0a1931] font-bold flex items-center gap-2">
              <span className="size-1.5 bg-gray-400 rounded-full"></span>
              최근 업데이트
            </h4>
            <button className="text-[11px] font-bold text-primary">전체보기</button>
          </div>
          <div className="space-y-3">
            {recentUpdates.map(update => (
              <div key={update.id} className="bg-white p-5 rounded-2xl border border-gray-50 flex items-center gap-4 shadow-sm">
                <div className={`size-2.5 ${update.dot} rounded-full shrink-0`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#0a1931] truncate">{update.title}</p>
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">{update.room} · {update.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active Users Section */}
        <section className="px-6 py-6">
            <h4 className="text-[#0a1931] font-bold mb-4 flex items-center gap-2">
                <span className="size-1.5 bg-emerald-500 rounded-full"></span>
                현재 접속자 ({activeUsers.length}명)
            </h4>
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-50 h-48 overflow-y-auto custom-scrollbar">
                {activeUsers.length > 0 ? (
                    <ul className="space-y-3">
                        {activeUsers.map((user: any, index) => (
                            <li key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                <div className="size-9 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[#0a1931]">{user.name}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p className="text-sm font-medium">접속 중인 사용자가 없습니다.</p>
                    </div>
                )}
            </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur-xl safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-6 items-center h-20">
          <button onClick={() => navigate('/home')} className="flex flex-col items-center justify-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[26px] fill-1">home</span>
            <span className="text-[10px] font-black">홈</span>
          </button>
          <button onClick={() => navigate('/notice')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">campaign</span>
            <span className="text-[10px] font-bold">공지방</span>
          </button>
          <button onClick={() => navigate('/report')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">description</span>
            <span className="text-[10px] font-bold">보고방</span>
          </button>
          <button onClick={() => navigate('/resource')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">folder_open</span>
            <span className="text-[10px] font-bold">자료방</span>
          </button>
          <button onClick={() => navigate('/forum')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">forum</span>
            <span className="text-[10px] font-bold">소통방</span>
          </button>
          <button onClick={() => navigate('/stats')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">leaderboard</span>
            <span className="text-[10px] font-bold">통계방</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default HomePage;
