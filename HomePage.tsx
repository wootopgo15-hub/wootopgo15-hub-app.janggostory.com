
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, submitToGoogleSheets, WEB_APP_URL, getCachedSheetData } from '../services/googleSheets';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  // User Management State
  const [userList, setUserList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  
  // Center Management State
  const [centerList, setCenterList] = useState<any[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(true);
  const [isCenterModalOpen, setIsCenterModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any | null>(null);
  const [centerName, setCenterName] = useState('');
  const [updatingCenter, setUpdatingCenter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

  const bgUrl = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1920';

  const loadUsers = async (force: boolean = false) => {
    setLoadingUsers(true);
    setError(null);
    try {
      const result = await fetchSheetData('USER', force);
      setUserList(result);
    } catch (err: any) {
      console.error("Dashboard Load Error:", err);
      setError(err.message || '사용자 목록을 가져오지 못했습니다.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCenters = async (force: boolean = false) => {
    setLoadingCenters(true);
    try {
      const result = await fetchSheetData('CENTER', force);
      setCenterList(result);
    } catch (err: any) {
      console.error("Center Load Error:", err);
      setError(err.message || '지사 목록을 가져오지 못했습니다.');
    } finally {
      setLoadingCenters(false);
    }
  };

  const handleUserApprove = async (email: string) => {
    setUpdatingUser(email);
    try {
      // Apps Script에 업데이트 명령 전송
      // { type: 'UPDATE_USER', email: '...', status: '승인' } 형태의 약속된 프로토콜 사용
      const success = await submitToGoogleSheets({
        type: 'UPDATE_USER',
        email: email,
        status: '승인',
        sendNotification: true // 알림 발송 요청 추가
      });

      if (success) {
        setTimeout(() => loadUsers(true), 1500);
      } else {
        // Silent failure
      }
    } catch (err) {
      console.error('Approve Error:', err);
    } finally {
      setUpdatingUser(null);
    }
  };

  useEffect(() => {
    // Load users
    const cachedUsers = getCachedSheetData('USER');
    if (cachedUsers.length > 0) {
      setUserList(cachedUsers);
      setLoadingUsers(false);
    }
    loadUsers();

    // Load centers
    const cachedCenters = getCachedSheetData('CENTER');
    if (cachedCenters.length > 0) {
      setCenterList(cachedCenters);
      setLoadingCenters(false);
    }
    loadCenters();
  }, []);

  const handleOpenCenterModal = (center: any | null = null) => {
    if (center) {
      setEditingCenter(center);
      setCenterName(center['지사명']);
    } else {
      setEditingCenter(null);
      setCenterName('');
    }
    setIsCenterModalOpen(true);
  };

  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerName.trim()) return;

    const payload = {
      type: 'CENTER',
      mode: editingCenter ? 'UPDATE' : 'APPEND',
      oldName: editingCenter ? editingCenter['지사명'] : undefined,
      '지사명': centerName.trim(),
    };

    setUpdatingCenter('center_form');
    try {
      const success = await submitToGoogleSheets(payload);
      if (success) {
        setIsCenterModalOpen(false);
        setTimeout(() => loadCenters(true), 1500);
      }
    } catch (err) {
      console.error('Center Submit Error:', err);
    } finally {
      setUpdatingCenter(null);
    }
  };

  const handleDeleteCenter = async (centerName: string) => {
    setConfirmModal({
      isOpen: true,
      message: `'${centerName}' 지사를 정말 삭제하시겠습니까?`,
      onConfirm: async () => {
        setConfirmModal(null);
        const payload = {
          type: 'CENTER',
          mode: 'DELETE',
          '지사명': centerName,
        };

        setUpdatingCenter(centerName);
        try {
          const success = await submitToGoogleSheets(payload);
          if (success) {
            setTimeout(() => loadCenters(true), 1500);
          }
        } catch (err) {
          console.error('Center Delete Error:', err);
        } finally {
          setUpdatingCenter(null);
        }
      }
    });
  };

  return (
    <div className="min-h-screen w-full p-4 sm:p-10 bg-cover bg-center flex flex-col items-center overflow-y-auto font-sans safe-top safe-bottom" style={{ backgroundImage: `url('${bgUrl}')` }}>
      <div className="fixed inset-0 bg-white/60 z-0" />
      
      <div className="relative z-10 w-full max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 bg-white/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/40 gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="size-12 bg-primary rounded-xl flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span></div>
            <div>
              <h1 className="text-[#111318] text-2xl font-black">관리자 승인 센터</h1>
              <p className="text-[#4a5568] text-xs font-bold uppercase tracking-wider">User Approval Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { loadUsers(true); loadCenters(true); }} disabled={loadingUsers || loadingCenters} className="px-4 h-12 bg-white/50 hover:bg-white/70 text-[#111318] rounded-full font-bold transition-all flex items-center gap-2 backdrop-blur-md disabled:opacity-50 border border-white/30"><span className={`material-symbols-outlined ${(loadingUsers || loadingCenters) && 'animate-spin'}`}>refresh</span>새로고침</button>
            <button onClick={() => navigate('/login')} className="px-6 h-12 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20">로그아웃</button>
          </div>
        </div>

        {/* Center Management Section */}
        <div className="glass-effect rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/30 min-h-[300px] mb-8">
          <div className="p-8 border-b border-white/20 flex justify-between items-center bg-white/10">
            <h2 className="text-[#111318] text-xl font-black flex items-center gap-2"><span className="material-symbols-outlined text-primary">corporate_fare</span>지사(센터) 관리</h2>
            <button onClick={() => handleOpenCenterModal()} className="h-10 px-5 bg-primary text-white rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined">add_business</span>
              <span>지사 추가</span>
            </button>
          </div>
          {loadingCenters ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-[#111318] font-black">지사 목록 불러오는 중...</p>
            </div>
          ) : centerList.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/30 border-b border-white/20 text-xs font-black uppercase tracking-widest text-[#111318]">
                    <th className="p-5">지사명</th>
                    <th className="p-5 text-center">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {centerList.map((center, i) => (
                    <tr key={i} className="border-b border-white/10 hover:bg-white/20 transition-colors">
                      <td className="p-5 text-sm font-bold text-[#111318]">{center['지사명']}</td>
                      <td className="p-5 text-center space-x-2">
                        <button onClick={() => handleOpenCenterModal(center)} disabled={updatingCenter === center['지사명']} className="h-9 w-20 bg-white/50 text-[#111318] rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50">수정</button>
                        <button onClick={() => handleDeleteCenter(center['지사명'])} disabled={updatingCenter === center['지사명']} className="h-9 w-20 bg-rose-500/50 text-white rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                          {updatingCenter === center['지사명'] ? '삭제중...' : '삭제'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-20 text-center opacity-60">
              <span className="material-symbols-outlined text-8xl mb-4">add_business</span>
              <p className="text-xl font-black">등록된 지사가 없습니다.</p>
            </div>
          )}
        </div>

        {/* User Approval Section */}
        <div className="glass-effect rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/30 min-h-[500px]">
          {loadingUsers ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-[#111318] font-black">사용자 명단 불러오는 중...</p>
            </div>
          ) : userList.length > 0 ? (
            <div className="flex flex-col">
              <div className="p-8 border-b border-white/20 flex justify-between items-center bg-white/10">
                <h2 className="text-[#111318] text-xl font-black flex items-center gap-2"><span className="material-symbols-outlined text-primary">manage_accounts</span>신청 현황</h2>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-white/30 border-b border-white/20 text-xs font-black uppercase tracking-widest text-[#111318]">
                      <th className="p-5">이름</th>
                      <th className="p-5">이메일</th>
                      <th className="p-5">부서</th>
                      <th className="p-5">지사</th>
                      <th className="p-5 text-center">상태</th>
                      <th className="p-5 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((user, i) => {
                      const status = user['상태'] || user['status'] || '대기';
                      const isApproved = status === '승인';
                      return (
                        <tr key={i} className="border-b border-white/10 hover:bg-white/20 transition-colors">
                          <td className="p-5 text-sm font-bold text-[#111318]">{user['이름']}</td>
                          <td className="p-5 text-sm font-bold text-[#4a5568]">{user['이메일']}</td>
                          <td className="p-5 text-sm font-bold text-[#4a5568]">{user['부서']}</td>
                          <td className="p-5 text-sm font-bold text-[#4a5568]">{user['지사']}</td>
                          <td className="p-5 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                              {status}
                            </span>
                          </td>
                          <td className="p-5 text-center">
                            {!isApproved && (
                              <button 
                                onClick={() => handleUserApprove(user['이메일'])}
                                disabled={updatingUser === user['이메일']}
                                className="h-9 px-4 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {updatingUser === user['이메일'] ? '처리중...' : '승인'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-20 text-center opacity-60">
              <span className="material-symbols-outlined text-8xl mb-4">person_search</span>
              <p className="text-xl font-black">가입 신청자가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Center Modal */}
      {isCenterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg">
          <div className="relative bg-white/80 rounded-[2rem] shadow-2xl p-8 w-full max-w-md m-4">
            <button onClick={() => setIsCenterModalOpen(false)} className="absolute top-4 right-4 size-10 bg-white/50 rounded-full flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            <h2 className="text-2xl font-black text-[#111318] mb-6">{editingCenter ? '지사 수정' : '새 지사 추가'}</h2>
            <form onSubmit={handleCenterSubmit}>
              <input 
                type="text"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                placeholder="지사 이름을 입력하세요"
                className="w-full h-14 px-5 rounded-2xl bg-white border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
              <button type="submit" disabled={updatingCenter === 'center_form'} className="w-full h-14 mt-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-98 transition-all disabled:opacity-50">
                {updatingCenter === 'center_form' ? '처리중...' : (editingCenter ? '수정하기' : '추가하기')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-black text-[#111318]">확인</h3>
            </div>
            <p className="text-[#4a5568] font-medium leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-[#111318] font-black rounded-2xl transition-colors active:scale-[0.98]"
              >
                취소
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-colors active:scale-[0.98] shadow-lg shadow-rose-500/30"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
