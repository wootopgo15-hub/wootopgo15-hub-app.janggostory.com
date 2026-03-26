
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitToGoogleSheets, fetchSheetData, getCachedSheetData } from '../services/googleSheets';
import { Play } from 'lucide-react';

interface Props {
  title?: string;
  type?: string;
  icon?: string;
  color?: string;
}

const ResourcePage: React.FC<Props> = ({ title = "자료방", type = "RESOURCE", icon = "folder_open", color = "amber-500" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Resource specific fields
  const [formSubject, setFormSubject] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formLinkMusic, setFormLinkMusic] = useState('');
  const [formLinkFolklore, setFormLinkFolklore] = useState('');
  const [formLinkGymnastics, setFormLinkGymnastics] = useState('');
  const [formLinkAids, setFormLinkAids] = useState('');
  const [formLinkSong, setFormLinkSong] = useState('');
  const [formStatus, setFormStatus] = useState('대기');
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setUserData(parsed);
      setFormBranch(parsed.branch || '전체');
    }
    
    const cached = getCachedSheetData(type);
    if (cached.length > 0) {
      setDataList(cached);
    }
    
    loadData();
  }, [type]);

  const loadData = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const data = await fetchSheetData(type, force);
      setDataList(data);
    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredList = useMemo(() => {
    if (!userData) return [];
    
    return dataList.filter(item => {
      const userRole = String(userData.role).trim();
      const userBranch = String(userData.branch).trim();
      const userEmail = String(userData.email).trim();
      
      if (userRole === '관리자') return true;
      
      const itemBranch = String(item['지사'] || '전체').trim();
      const itemEmail = String(item['이메일'] || '').trim();

      if (itemBranch === '전체' || itemBranch === '본사') return true;
      if (userRole === '부관리자') return itemBranch === userBranch;
      if (userRole === '강사') return itemEmail === userEmail;
      
      return false;
    });
  }, [dataList, userData]);

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setLoading(true);

    const now = new Date();
    
    const payload: any = {
      type: type,
      mode: editItem ? 'UPDATE' : 'APPEND',
      이름: userData.name,
      과목: formSubject,
      지사: formBranch,
      이메일: userData.email,
      승인: formStatus,
      음악: formLinkMusic,
      전래: formLinkFolklore,
      체조: formLinkGymnastics,
      교구: formLinkAids,
      노래: formLinkSong,
      타임스탬프: editItem ? editItem['타임스탬프'] : now.toISOString(),
    };

    try {
      if (await submitToGoogleSheets(payload)) {
        setIsModalOpen(false);
        setEditItem(null);
        setFormSubject('');
        setFormLinkMusic('');
        setFormLinkFolklore('');
        setFormLinkGymnastics('');
        setFormLinkAids('');
        setFormLinkSong('');
        setFormStatus('대기');
        loadData();
      }
    } catch (err) {
      console.error('Submit Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    if (userData.role !== '관리자' && item['이메일'] !== userData.email) {
      return;
    }
    setEditItem(item);
    setFormSubject(item['과목'] || '');
    setFormBranch(item['지사'] || '전체');
    setFormLinkMusic(item['음악'] || '');
    setFormLinkFolklore(item['전래'] || '');
    setFormLinkGymnastics(item['체조'] || '');
    setFormLinkAids(item['교구'] || '');
    setFormLinkSong(item['노래'] || '');
    setFormStatus(item['승인'] || '대기');
    setIsModalOpen(true);
  };



  const handleLinkClick = (url: string | undefined, status: string) => {
    if (status !== '승인' && userData?.role !== '관리자') {
      // 승인되지 않은 자료는 관리자만 접근 가능
      return;
    }

    if (!url) {
      setModalMessage("등록된 링크가 없습니다.");
      return;
    }
    url = url.trim();
    if (!url.startsWith('http')) {
      setModalMessage("올바른 URL 형식이 아닙니다.");
      return;
    }

    // 구글 슬라이드 앱(또는 새 창)으로 바로 연결
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-44 font-sans">
      <header className="px-4 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="size-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">{title}</h1>
            <p className="text-[8px] text-amber-500 font-black uppercase tracking-[0.2em] mt-1">Resource Hub</p>
          </div>
        </div>
        <button onClick={() => loadData(true)} disabled={isRefreshing} className={`size-8 rounded-full flex items-center justify-center bg-amber-500 text-white shadow-sm transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-95'}`}>
          <span className="material-symbols-outlined text-base">refresh</span>
        </button>
      </header>

      <main className="px-6 py-8 space-y-6">
        {filteredList.length > 0 ? (
          <div className="space-y-0 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            {filteredList.map((item, idx) => (
              <div 
                key={idx} 
                className="p-4 flex items-center gap-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-all group relative"
              >
                {/* Thumbnail */}
                <div className="size-14 rounded-full overflow-hidden bg-amber-100 shrink-0 border border-amber-200/20 flex items-center justify-center">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item['과목'] || '자료')}&background=fef3c7&color=d97706&size=200`} 
                    alt="Thumbnail" 
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                      item['승인'] === '승인' ? 'bg-emerald-50 text-emerald-500' : 'bg-orange-50 text-orange-500'
                    }`}>
                      {item['승인'] || '대기'}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold">{item['지사'] || '전체'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#0a1931] truncate leading-tight">{item['과목']}</h3>
                  </div>
                  
                  <p className="text-[10px] text-gray-500 font-bold mt-0.5 mb-2">
                    {item['이름']} · <span className="font-medium">{item['이메일']}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item['음악'] && (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkClick(item['음악'], item['승인']); }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors">
                        <Play className="w-3 h-3 fill-current" /> 음악 수업 시작
                      </button>
                    )}
                    {item['전래'] && (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkClick(item['전래'], item['승인']); }} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-xs font-black hover:bg-purple-100 transition-colors">
                        <Play className="w-3 h-3 fill-current" /> 전래 수업 시작
                      </button>
                    )}
                    {item['체조'] && (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkClick(item['체조'], item['승인']); }} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-xl text-xs font-black hover:bg-green-100 transition-colors">
                        <Play className="w-3 h-3 fill-current" /> 체조 수업 시작
                      </button>
                    )}
                    {item['교구'] && (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkClick(item['교구'], item['승인']); }} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-xs font-black hover:bg-amber-100 transition-colors">
                        <Play className="w-3 h-3 fill-current" /> 교구 수업 시작
                      </button>
                    )}
                    {item['노래'] && (
                      <button onClick={(e) => { e.stopPropagation(); handleLinkClick(item['노래'], item['승인']); }} className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black hover:bg-rose-100 transition-colors">
                        <Play className="w-3 h-3 fill-current" /> 노래 수업 시작
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                {(userData?.role === '관리자' || item['이메일'] === userData?.email) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(item);
                    }} 
                    className="size-8 rounded-full flex items-center justify-center text-gray-200 hover:bg-gray-100 hover:text-amber-500 transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-6xl text-gray-100 mb-4">folder_open</span>
            <p className="text-gray-300 font-bold">등록된 자료가 없습니다.</p>
          </div>
        )}
      </main>

      {userData?.role === '관리자' && (
        <button 
          onClick={() => {
            setEditItem(null);
            setFormSubject('');
            setFormLinkMusic('');
            setFormLinkFolklore('');
            setFormLinkGymnastics('');
            setFormLinkAids('');
            setFormLinkSong('');
            setFormStatus('대기');
            setFormBranch(userData.branch || '전체');
            setIsModalOpen(true);
          }} 
          className="fixed bottom-28 right-6 size-14 bg-amber-500 text-white rounded-full shadow-2xl shadow-amber-500/40 flex items-center justify-center active:scale-90 z-40 transition-all safe-mb"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2rem] p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">{editItem ? '자료 수정' : '자료 등록'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-xl bg-gray-50 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAddData} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">과목명 <span className="text-rose-500">*</span></label>
                  <input 
                    value={formSubject} 
                    onChange={(e) => setFormSubject(e.target.value)} 
                    placeholder="과목 이름" 
                    className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">대상 지사</label>
                  <select 
                    value={formBranch} 
                    onChange={(e) => setFormBranch(e.target.value)} 
                    className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all appearance-none"
                  >
                    <option value="전체">전체</option>
                    <option value="본사">본사</option>
                    <option value="천안">천안</option>
                    <option value="세종">세종</option>
                    <option value="평택">평택</option>
                    <option value="서울">서울</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0a1931] ml-2">승인 상태</label>
                <select 
                  value={formStatus} 
                  onChange={(e) => setFormStatus(e.target.value)} 
                  className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all appearance-none"
                >
                  <option value="대기">대기</option>
                  <option value="승인">승인</option>
                  <option value="거절">거절</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">음악 링크</label>
                  <input 
                    value={formLinkMusic} 
                    onChange={(e) => setFormLinkMusic(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full h-12 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">전래 링크</label>
                  <input 
                    value={formLinkFolklore} 
                    onChange={(e) => setFormLinkFolklore(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full h-12 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">체조 링크</label>
                  <input 
                    value={formLinkGymnastics} 
                    onChange={(e) => setFormLinkGymnastics(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full h-12 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">교구 링크</label>
                  <input 
                    value={formLinkAids} 
                    onChange={(e) => setFormLinkAids(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full h-12 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">노래 링크</label>
                  <input 
                    value={formLinkSong} 
                    onChange={(e) => setFormLinkSong(e.target.value)} 
                    placeholder="https://..." 
                    className="w-full h-12 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" 
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full h-16 bg-amber-500 text-white font-black rounded-2xl shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all mt-6">
                {loading ? "전송 중..." : editItem ? "자료 수정하기" : "자료 등록하기"}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur-xl safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-6 items-center h-20">
          <button onClick={() => navigate('/home')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">home</span>
            <span className="text-[10px] font-bold">홈</span>
          </button>
          <button onClick={() => navigate('/notice')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">campaign</span>
            <span className="text-[10px] font-bold">공지방</span>
          </button>
          <button onClick={() => navigate('/report')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">description</span>
            <span className="text-[10px] font-bold">보고방</span>
          </button>
          <button onClick={() => navigate('/resource')} className="flex flex-col items-center justify-center gap-1.5 text-amber-500">
            <span className="material-symbols-outlined text-[26px] fill-1">folder_open</span>
            <span className="text-[10px] font-black">자료방</span>
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

      {/* 커스텀 모달 */}
      {modalMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-500">
              <span className="material-symbols-outlined text-3xl">error</span>
              <h3 className="text-lg font-black text-[#111318]">알림</h3>
            </div>
            <p className="text-[#4a5568] font-medium leading-relaxed mb-6">
              {modalMessage}
            </p>
            <button 
              onClick={() => setModalMessage(null)}
              className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-[#111318] font-black rounded-2xl transition-colors active:scale-[0.98]"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcePage;
