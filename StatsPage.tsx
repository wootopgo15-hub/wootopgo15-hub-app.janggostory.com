import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row font-sans overflow-hidden bg-gray-50">
      {/* 1. 일반 모드 (어르신 · 센터용) - 비활성화 */}
      <div className="flex-1 relative flex flex-col justify-center p-8 md:p-16 bg-[#FFF8F0] border-b md:border-b-0 md:border-r border-orange-100 group">
        {/* 비활성화 오버레이 */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center cursor-not-allowed">
          <div className="bg-black/70 text-white px-6 py-3 rounded-full font-bold text-lg shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="material-symbols-outlined">construction</span>
            준비 중인 서비스입니다
          </div>
        </div>

        <div className="max-w-md mx-auto w-full opacity-60 transition-opacity duration-500">
          <div className="size-24 bg-orange-500 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-lg shadow-orange-500/20 transform -rotate-3">
            <span className="material-symbols-outlined text-5xl">volunteer_activism</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-[#2D1A11] mb-4 tracking-tight leading-tight">
            일반 모드
          </h1>
          <p className="text-xl text-orange-800/80 font-bold mb-12">
            어르신 · 센터 관리자용 포털
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50 flex flex-col gap-3">
              <span className="material-symbols-outlined text-4xl text-orange-400">edit_document</span>
              <span className="text-xl font-black text-[#2D1A11]">프로그램 신청</span>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50 flex flex-col gap-3">
              <span className="material-symbols-outlined text-4xl text-orange-400">photo_library</span>
              <span className="text-xl font-black text-[#2D1A11]">활동 갤러리</span>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50 flex flex-col gap-3">
              <span className="material-symbols-outlined text-4xl text-orange-400">campaign</span>
              <span className="text-xl font-black text-[#2D1A11]">센터 소식</span>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-50 flex flex-col gap-3">
              <span className="material-symbols-outlined text-4xl text-orange-400">calendar_month</span>
              <span className="text-xl font-black text-[#2D1A11]">교육 일정</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 강사 모드 (강사 · 관리자용) - 활성화 */}
      <div 
        onClick={() => navigate('/login')}
        className="flex-1 relative flex flex-col justify-center p-8 md:p-16 bg-[#F0F4FF] cursor-pointer hover:bg-[#E5EDFF] transition-colors duration-500 group"
      >
        <div className="max-w-md mx-auto w-full transform group-hover:scale-[1.02] transition-transform duration-500">
          <div className="size-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-lg shadow-blue-600/20 transform rotate-3 group-hover:rotate-6 transition-transform">
            <span className="material-symbols-outlined text-5xl">school</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-[#0A1931] mb-4 tracking-tight leading-tight">
            강사 모드
          </h1>
          <p className="text-xl text-blue-800/80 font-bold mb-12">
            강사 · 원내 관리자 실무 포털
          </p>

          <div className="flex flex-col gap-3">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50 flex items-center gap-4 group-hover:shadow-md transition-shadow">
              <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">how_to_reg</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A1931]">출석 관리</h3>
                <p className="text-sm text-gray-500 font-medium">실시간 출결 체크 및 관리</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50 flex items-center gap-4 group-hover:shadow-md transition-shadow">
              <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">assignment</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A1931]">활동 로그 작성</h3>
                <p className="text-sm text-gray-500 font-medium">수업 일지 및 사진 업로드</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50 flex items-center gap-4 group-hover:shadow-md transition-shadow">
              <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">forum</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A1931]">강사 커뮤니티</h3>
                <p className="text-sm text-gray-500 font-medium">자료 공유 및 소통방</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-50 flex items-center gap-4 group-hover:shadow-md transition-shadow">
              <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0A1931]">정산 관리</h3>
                <p className="text-sm text-gray-500 font-medium">수업료 및 활동비 정산 내역</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center gap-2 text-blue-600 font-black text-lg group-hover:translate-x-2 transition-transform">
            시작하기 <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
