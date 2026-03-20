
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitToGoogleSheets, fetchSheetData, getCachedSheetData } from '../services/googleSheets';

interface Props {
  title?: string;
  type?: string;
  icon?: string;
  color?: string;
}

const NoticePage: React.FC<Props> = ({ title = "공지방", type = "NOTICE", icon = "campaign", color = "primary" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  // Notice specific fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImportance, setFormImportance] = useState('보통');
  const [formBranch, setFormBranch] = useState('');

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setUserData(parsed);
      setFormBranch(parsed.branch || '전체');
    }
    
    // 1. 캐시 데이터 즉시 로드
    const cached = getCachedSheetData(type);
    if (cached.length > 0) {
      setDataList(cached);
    }
    
    // 2. 최신 데이터 백그라운드 로드
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

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const filteredList = useMemo(() => {
    if (!userData) return [];
    
    // 권한에 따른 데이터 필터링
    return dataList.filter(item => {
      const userRole = String(userData.role).trim();
      const userBranch = String(userData.branch).trim();
      
      if (userRole === '관리자') return true;
      
      // 공지사항은 '전체', '본사'이거나 본인 지사인 경우 보임
      const itemBranch = String(item['지사'] || '전체').trim();
      return itemBranch === '전체' || itemBranch === '본사' || itemBranch === userBranch;
    }).sort((a, b) => {
      // 최신순 (맨 위부터 볼 수 있게)
      const timeA = new Date(a['타임스탬프'] || a['작성일'] || 0).getTime();
      const timeB = new Date(b['타임스탬프'] || b['작성일'] || 0).getTime();
      
      // 중요도가 '긴급'인 경우 최상단 유지 (선택사항이나 보통 권장됨)
      // 만약 순수하게 시간순만 원한다면 아래 if문을 제거하세요.
      const priority: any = { '긴급': 1, '중요': 0, '보통': 0 };
      const pA = priority[a['중요도']] || 0;
      const pB = priority[b['중요도']] || 0;
      if (pA !== pB) return pB - pA;

      return timeB - timeA;
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
      제목: formTitle, // 제목
      내용: formContent, // 내용
      작성일: formatDate(now), // 작성일
      중요도: formImportance, // 중요도
      지사: formBranch, // 지사
      이메일: userData.email,
      타임스탬프: editItem ? editItem['타임스탬프'] : now.toISOString(),
    };

    try {
      if (await submitToGoogleSheets(payload)) {
        setIsModalOpen(false);
        setEditItem(null);
        setFormTitle('');
        setFormContent('');
        setFormImportance('보통');
        loadData();
      }
    } catch (err) {
      console.error('Submit Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    // 관리자만 수정 가능하도록 제한 (원하는 경우)
    if (userData.role !== '관리자' && item['이메일'] !== userData.email) {
      return;
    }
    setEditItem(item);
    setFormTitle(item['제목'] || '');
    setFormContent(item['내용'] || '');
    setFormImportance(item['중요도'] || '보통');
    setFormBranch(item['지사'] || '전체');
    setIsModalOpen(true);
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
            <p className="text-[8px] text-primary font-black uppercase tracking-[0.2em] mt-1">Notice Hub</p>
          </div>
        </div>
        <button onClick={() => loadData(true)} disabled={isRefreshing} className={`size-8 rounded-full flex items-center justify-center bg-primary text-white shadow-sm transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-95'}`}>
          <span className="material-symbols-outlined text-base">refresh</span>
        </button>
      </header>

      <main className="px-6 py-8 space-y-6">
        {filteredList.length > 0 ? (
          <div className="space-y-4">
            {filteredList.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => handleEditClick(item)}
                className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
              >
                {item['중요도'] === '긴급' && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-2xl"></div>
                )}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      item['중요도'] === '긴급' ? 'bg-rose-100 text-rose-600' : 
                      item['중요도'] === '중요' ? 'bg-orange-100 text-orange-600' : 
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {item['중요도'] || '보통'}
                    </span>
                    <span className="text-[9px] text-gray-400 font-bold">{item['지사'] || '전체'}</span>
                  </div>
                  <span className="text-[9px] text-gray-300 font-bold">
                    {item['작성일'] ? String(item['작성일']).substring(0, 10) : ''}
                  </span>
                </div>
                <h3 className="text-sm font-black text-[#0a1931] mb-1 group-hover:text-primary transition-colors truncate">{item['제목']}</h3>
                <div className="text-[11px] text-gray-500 leading-snug whitespace-pre-wrap break-words line-clamp-2">
                  {item['내용']}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-6xl text-gray-100 mb-4">campaign</span>
            <p className="text-gray-300 font-bold">등록된 공지사항이 없습니다.</p>
          </div>
        )}
      </main>

      {/* 관리자만 등록 버튼 노출 (원하는 경우) */}
      {userData?.role === '관리자' && (
        <button 
          onClick={() => {
            setEditItem(null);
            setFormTitle('');
            setFormContent('');
            setFormImportance('보통');
            setFormBranch(userData.branch || '전체');
            setIsModalOpen(true);
          }} 
          className="fixed bottom-28 right-6 size-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 z-40 border-4 border-white safe-mb"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-10 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-10 animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">{editItem ? '공지 수정' : '공지 작성'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-xl bg-gray-50 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAddData} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0a1931] ml-2">제목 <span className="text-rose-500">*</span></label>
                <input 
                  value={formTitle} 
                  onChange={(e) => setFormTitle(e.target.value)} 
                  placeholder="공지 제목을 입력하세요" 
                  className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">중요도</label>
                  <select 
                    value={formImportance} 
                    onChange={(e) => setFormImportance(e.target.value)} 
                    className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all appearance-none"
                  >
                    <option value="보통">보통</option>
                    <option value="중요">중요</option>
                    <option value="긴급">긴급</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">대상 지사</label>
                  <select 
                    value={formBranch} 
                    onChange={(e) => setFormBranch(e.target.value)} 
                    className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all appearance-none"
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
                <label className="text-xs font-bold text-[#0a1931] ml-2">내용 <span className="text-rose-500">*</span></label>
                <textarea 
                  value={formContent} 
                  onChange={(e) => setFormContent(e.target.value)} 
                  placeholder="공지 내용을 상세히 입력하세요" 
                  className="w-full h-48 p-6 rounded-3xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all resize-none" 
                  required 
                />
              </div>

              <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all">
                {loading ? "전송 중..." : editItem ? "공지 수정하기" : "공지 등록하기"}
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
          <button onClick={() => navigate('/notice')} className="flex flex-col items-center justify-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[26px] fill-1">campaign</span>
            <span className="text-[10px] font-black">공지방</span>
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

export default NoticePage;
