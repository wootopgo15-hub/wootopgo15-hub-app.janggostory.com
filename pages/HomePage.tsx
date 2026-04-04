
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData } from '../services/googleSheets';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [latestNotices, setLatestNotices] = useState<any[]>([]);

  useEffect(() => {
    const name = localStorage.getItem('userName') || '사용자';
    const role = localStorage.getItem('userRole') || '강사';
    setUserName(name);
    setUserRole(role);

    const checkNoticePopup = async () => {
      const hasShown = sessionStorage.getItem('noticePopupShown');
      if (!hasShown) {
        try {
          const notices = await fetchSheetData('NOTICE');
          if (notices && notices.length > 0) {
            const sortedNotices = notices.sort((a: any, b: any) => {
              const timeA = new Date(a['타임스탬프'] || a['작성일'] || 0).getTime();
              const timeB = new Date(b['타임스탬프'] || b['작성일'] || 0).getTime();
              
              const priority: any = { '긴급': 1, '중요': 0, '보통': 0 };
              const pA = priority[a['중요도']] || 0;
              const pB = priority[b['중요도']] || 0;
              if (pA !== pB) return pB - pA;

              return timeB - timeA;
            });
            setLatestNotices(sortedNotices.slice(0, 3));
            setShowNoticePopup(true);
            sessionStorage.setItem('noticePopupShown', 'true');
          }
        } catch (error) {
          console.error('Failed to fetch notices for popup:', error);
        }
      }
    };

    checkNoticePopup();

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
    { id: 'stats', path: '/stats', name: '통계방', sub: 'Analytics Room', icon: 'leaderboard', bg: 'bg-blue-50', text: 'text-blue-500' },
    { id: 'props_off', path: '/props-off', name: '교구&오프', sub: 'Props & Time-off', icon: 'inventory_2', bg: 'bg-rose-50', text: 'text-rose-500' },
    ...(userRole === '관리자' || userRole === '부관리자' ? [{ id: 'salary', path: '/salary', name: '급여관리(지사장만보임)', sub: 'Salary Mgmt', icon: 'payments', bg: 'bg-teal-50', text: 'text-teal-500' }] : []),
  ];

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f8fafc] text-[#0a1931] font-sans overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-sm border-b border-gray-100 safe-top">
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

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-20">
        {/* Services Grid */}
        <section className="px-6 py-3 shrink-0">
          <h4 className="text-[#0a1931] font-bold mb-3 flex items-center gap-2 text-sm">
            <span className="size-1.5 bg-primary rounded-full"></span>
            주요 서비스
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {mainServices.map(s => (
              <button 
                key={s.id} 
                onClick={() => navigate(s.path)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all group"
              >
                <div className={`size-10 rounded-xl ${s.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <span className={`material-symbols-outlined ${s.text} text-2xl`}>{s.icon}</span>
                </div>
                <div className="text-center w-full px-1">
                  <span className="block text-[#0a1931] font-bold text-xs leading-tight truncate">{s.name}</span>
                  <span className="text-[8px] text-gray-400 mt-0.5 font-medium italic block truncate tracking-tighter">{s.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Active Users Section */}
        <section className="px-6 py-2 flex-1 flex flex-col min-h-0 mb-4">
            <h4 className="text-[#0a1931] font-bold mb-2 flex items-center gap-2 shrink-0 text-sm">
                <span className="size-1.5 bg-emerald-500 rounded-full"></span>
                현재 접속자 ({activeUsers.length}명)
            </h4>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 flex-1 overflow-y-auto custom-scrollbar">
                {activeUsers.length > 0 ? (
                    <ul className="space-y-3">
                        {activeUsers.map((user: any, index) => (
                            <li key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                                <div className="size-9 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[#0a1931]">
                                        {user.name} <span className="text-xs font-medium text-gray-500 ml-1">({user.department || '과목없음'} / {user.branch || '지사없음'})</span>
                                    </p>
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

      {/* Notice Popup Modal */}
      {showNoticePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="bg-primary p-5 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined">campaign</span>
                최근 공지사항
              </h3>
              <button 
                onClick={() => setShowNoticePopup(false)}
                className="text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {latestNotices.map((notice, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        notice['중요도'] === '긴급' ? 'bg-red-100 text-red-600' :
                        notice['중요도'] === '중요' ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {notice['중요도'] || '보통'}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {notice['작성일'] || notice['타임스탬프']?.split('T')[0]}
                      </span>
                    </div>
                    <h4 className="font-bold text-[#0a1931] mb-2">{notice['제목']}</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {notice['내용']}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowNoticePopup(false)}
                className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
