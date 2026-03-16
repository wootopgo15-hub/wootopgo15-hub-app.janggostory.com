import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="h-[100dvh] w-full flex flex-col md:flex-row bg-[#f8fafc] font-sans overflow-hidden">
      
      {/* 강사 모드 (강사 · 관리자용) - 활성화 */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100 border-b md:border-b-0 md:border-r border-blue-200/50 overflow-hidden group cursor-pointer" onClick={() => navigate('/login')}>
        {/* 장식용 배경 원 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-200/40 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto transition-transform duration-300 group-hover:-translate-y-2">
          <div className="size-20 md:size-32 bg-white shadow-xl shadow-blue-500/10 rounded-[2rem] flex items-center justify-center mb-3 md:mb-6 text-blue-600 border border-blue-100 group-hover:shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-300">
            <span className="material-symbols-outlined text-5xl md:text-7xl">school</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-[#0a1931] mb-1 md:mb-3 tracking-tight">
            강사 모드
          </h2>
          <p className="text-base md:text-xl font-bold text-blue-600 mb-4 md:mb-8">
            강사 · 관리자용
          </p>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate('/login');
            }}
            className="w-full py-3 md:py-5 px-4 md:px-8 bg-blue-600 hover:bg-blue-700 text-white text-base md:text-[20px] font-black rounded-2xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3"
          >
            <span className="material-symbols-outlined text-xl md:text-2xl">login</span>
            로그인하여 시작하기
          </button>
          
          <div className="mt-3 md:mt-6 flex flex-col gap-1 md:gap-2 text-xs md:text-sm font-bold text-blue-800/60">
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="material-symbols-outlined text-sm md:text-base">check_circle</span>
              실무 처리 및 관리 시스템
            </div>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="material-symbols-outlined text-sm md:text-base">check_circle</span>
              기존 사용 중인 모든 기능 포함
            </div>
          </div>
        </div>
      </div>

      {/* 일반 모드 (어르신 · 센터용) - 활성화 */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-amber-50 to-orange-100 overflow-hidden group cursor-pointer" onClick={() => window.location.href = 'https://brain-games-for-dementia-prevention.vercel.janggostory.com/'}>
        {/* 장식용 배경 원 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
          <div className="absolute bottom-10 -right-10 w-48 h-48 bg-amber-200/40 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-110"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto transition-transform duration-300 group-hover:-translate-y-2">
          <div className="size-20 md:size-32 bg-white shadow-xl shadow-orange-500/10 rounded-[2rem] flex items-center justify-center mb-3 md:mb-6 text-orange-500 border border-orange-100 group-hover:shadow-2xl group-hover:shadow-orange-500/20 transition-all duration-300">
            <span className="material-symbols-outlined text-5xl md:text-7xl">volunteer_activism</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-[#6b4226] mb-1 md:mb-3 tracking-tight">
            일반 모드
          </h2>
          <p className="text-base md:text-xl font-bold text-orange-600 mb-4 md:mb-8">
            어르신 · 센터용
          </p>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = 'https://brain-games-for-dementia-prevention.vercel.janggostory.com/';
            }}
            className="w-full py-3 md:py-5 px-4 md:px-8 bg-orange-500 hover:bg-orange-600 text-white text-base md:text-[20px] font-black rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3"
          >
            <span className="material-symbols-outlined text-xl md:text-2xl">psychology</span>
            두뇌 게임 시작하기
          </button>

          <div className="mt-3 md:mt-6 flex flex-col gap-1 md:gap-2 text-xs md:text-sm font-bold text-orange-800/60">
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="material-symbols-outlined text-sm md:text-base">check_circle</span>
              치매 예방 인지 훈련
            </div>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="material-symbols-outlined text-sm md:text-base">check_circle</span>
              어르신 맞춤형 두뇌 게임
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default RoleSelectionPage;
