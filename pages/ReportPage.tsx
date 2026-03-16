
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitToGoogleSheets, fetchSheetData, getCachedSheetData } from '../services/googleSheets';
import AdBanner from '../components/AdBanner';

interface Props {
  title?: string;
  type?: string;
  icon?: string;
  color?: string;
}

const ReportPage: React.FC<Props> = ({ title = "보고방", type = "REPORT", icon = "description", color = "primary" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [centerList, setCenterList] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const [formCenter, setFormCenter] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTime, setFormTime] = useState('');
  const [showCenterSuggestions, setShowCenterSuggestions] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const filteredCenters = useMemo(() => {
    const trimmedInput = formCenter.trim();
    const excludedWords = ['요양원', '센터', '요양', '주간', '보호'];
    
    // 2글자 미만이거나, 제외 단어만 정확히 입력한 경우 미리보기 숨김
    if (trimmedInput.length < 2 || excludedWords.includes(trimmedInput) || !userData) return [];
    
    const userRole = String(userData.role).trim();
    const userBranch = String(userData.branch).trim();

    return centerList.filter(item => {
      const centerName = String(item['센터명'] || Object.values(item)[0] || '').trim();
      const centerBranch = String(item['지사'] || Object.values(item)[1] || '').trim();
      
      // 검색어 포함 여부
      const matchesSearch = centerName.toLowerCase().includes(trimmedInput.toLowerCase());
      if (!matchesSearch) return false;

      // 관리자는 전체, 그 외는 본인 지사만
      if (userRole === '관리자') return true;
      return centerBranch === userBranch;
    }).map(item => String(item['센터명'] || Object.values(item)[0] || '').trim());
  }, [centerList, formCenter, userData]);

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setUserData(parsed);
      // 기본값 설정
      setFormCenter('');
      setFormSubject('');
      setFormTime(''); // 초기값을 비워서 --:-- 로 표시되게 함
    }
    
    // 1. 캐시 데이터 즉시 로드
    const cached = getCachedSheetData(type);
    if (cached.length > 0) {
      setDataList(cached);
    }
    
    const cachedCenters = getCachedSheetData('CENTER_LIST');
    if (cachedCenters.length > 0) {
      setCenterList(cachedCenters);
    }
    
    // 2. 최신 데이터 백그라운드 로드
    loadData();
    loadCenterList();
  }, [type]);

  const loadData = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const data = await fetchSheetData(type, force);
      setDataList(data);
    } catch (error: any) {
      console.error(`Failed to load ${type}:`, error);
      if (type === 'STATS' || type === 'STATISTICS') {
        setModalMessage(`통계 데이터를 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`);
      } else {
        setModalMessage(`데이터를 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadCenterList = async (force: boolean = false) => {
    try {
      const centers = await fetchSheetData('CENTER_LIST', force);
      setCenterList(centers);
    } catch (error) {
      console.error("Failed to load center list:", error);
    }
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const groupedData = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!userData) return map;

    // 권한에 따른 데이터 필터링
    const filteredByRole = dataList.filter(item => {
      const userRole = String(userData.role).trim();
      const userBranch = String(userData.branch).trim();
      const userEmail = String(userData.email).trim();
      
      if (userRole === '관리자') return true;
      
      if (userRole === '부관리자') {
        const itemBranch = String(item['지사'] || '').trim();
        return itemBranch === userBranch;
      }
      
      if (userRole === '강사') {
        const itemEmail = String(item['이메일'] || '').trim();
        return itemEmail === userEmail;
      }
      
      return false;
    });

    filteredByRole.forEach(item => {
      let dateVal = item['날짜'] || item['기준일'] || item['타임스탬프'];
      if (!dateVal) return;

      let dStr = '';
      try {
        const dateObj = new Date(dateVal);
        if (!isNaN(dateObj.getTime())) {
          dStr = formatDate(dateObj);
        } else {
          // 날짜 객체로 변환 실패 시 문자열 정규화 시도 (예: 2026. 2. 19. -> 2026-02-19)
          const match = String(dateVal).match(/(\d{4})[.-]\s?(\d{1,2})[.-]\s?(\d{1,2})/);
          if (match) {
            dStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
          } else {
            dStr = String(dateVal).substring(0, 10);
          }
        }
      } catch (e) {
        dStr = String(dateVal).substring(0, 10);
      }

      if (dStr) {
        if (!map.has(dStr)) map.set(dStr, []);
        map.get(dStr)?.push(item);
      }
    });
    return map;
  }, [dataList, userData]);

  const filteredList = useMemo(() => {
    const dateStr = formatDate(selectedDate);
    return groupedData.get(dateStr) || [];
  }, [groupedData, selectedDate]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentDate]);

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    // 센터 유효성 검사
    const trimmedCenter = formCenter.trim();
    const allCenterNames = centerList.map(c => String(Object.values(c)[0] || '').trim());
    if (centerList.length > 0 && !allCenterNames.includes(trimmedCenter)) {
      setModalMessage("등록되지 않은 센터명입니다. 목록에서 선택하거나 정확히 입력해주세요.");
      return;
    }

    setLoading(true);

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const now = new Date();
    
    const payload: any = {
      type: type,
      mode: editItem ? 'UPDATE' : 'APPEND',
      userName: userData.name, // 이름(자동)
      date: formatDate(selectedDate), // 날짜
      time: formTime, // 시간(입력)
      dayOfWeek: days[selectedDate.getDay()],
      center: formCenter, // 센터(입력)
      subject: formSubject, // 과목(입력)
      branch: userData.branch, // 지사(자동)
      email: userData.email, // 이메일(자동)
      department: userData.department,
      timestamp: editItem ? editItem['타임스탬프'] : now.toISOString(),
    };

    try {
      // 1. 낙관적 업데이트 (화면에 즉시 반영)
      const newItem = {
        '이름': payload.userName,
        '날짜': payload.date,
        '시간': payload.time,
        '요일': payload.dayOfWeek,
        '센터': payload.center,
        '과목': payload.subject,
        '지사': payload.branch,
        '이메일': payload.email,
        '부서': payload.department,
        '타임스탬프': payload.timestamp
      };

      if (editItem) {
        setDataList(prev => prev.map(item => item['타임스탬프'] === payload.timestamp ? { ...item, ...newItem } : item));
      } else {
        setDataList(prev => [...prev, newItem]);
      }

      // 모달 닫기 및 폼 초기화
      setIsModalOpen(false);
      setEditItem(null);
      setFormCenter('');
      setFormSubject('');
      setFormTime('');

      // 2. 백그라운드에서 구글 시트에 전송 및 동기화
      await submitToGoogleSheets(payload);
      loadData(true); // 강제 새로고침으로 캐시 업데이트 및 완벽한 동기화
    } catch (err) {
      console.error('Submit Error:', err);
      loadData(true); // 에러 발생 시 서버 데이터로 원상복구
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: any) => {
    setEditItem(item);
    setFormCenter(item['센터'] || '');
    setFormSubject(item['과목'] || '');
    setFormTime(item['시간'] || '');
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-44 font-sans">
      <header className="px-6 pt-12 pb-6 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm safe-top">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="size-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">{title}</h1>
            <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-1">Management Hub</p>
          </div>
        </div>
        <button onClick={() => { loadData(true); loadCenterList(true); }} disabled={isRefreshing} className={`size-10 rounded-full flex items-center justify-center bg-primary text-white shadow-lg transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-95'}`}>
          <span className="material-symbols-outlined text-xl">refresh</span>
        </button>
      </header>

      <section className="px-4 py-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-6">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="size-10 flex items-center justify-center hover:bg-gray-50 rounded-xl"><span className="material-symbols-outlined">chevron_left</span></button>
            <h2 className="text-lg font-black">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="size-10 flex items-center justify-center hover:bg-gray-50 rounded-xl"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div className="px-3 pb-6 text-center">
            <div className="grid grid-cols-7 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                <div key={day} className={`text-[10px] font-bold uppercase ${i === 0 ? 'text-rose-400' : 'text-gray-300'}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="aspect-square"></div>;
                const dateStr = formatDate(date);
                const isSelected = dateStr === formatDate(selectedDate);
                const dayData = groupedData.get(dateStr) || [];
                
                // 센터별 색상 매핑 (무지개 색상 계열)
                const rainbowColors = [
                  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 
                  'bg-emerald-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'
                ];
                
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedDate(date)} 
                    className={`relative aspect-square flex flex-col items-center pt-1 rounded-xl border transition-all ${isSelected ? 'bg-white border-primary ring-2 ring-primary/20 shadow-sm z-10' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                    <span className={`text-[10px] font-black mb-1 ${isSelected ? 'text-primary' : 'text-gray-400'}`}>{date.getDate()}</span>
                    
                    <div className="w-full px-0.5 space-y-0.5 overflow-hidden">
                      {dayData.slice(0, 4).map((item, idx) => {
                        const centerName = item['센터'] || item['지사'] || '알수없음';
                        const mobileCenterName = centerName.length > 3 ? centerName.substring(0, 3) + '...' : centerName;
                        // 센터 이름 기반으로 고정된 랜덤 색상 선택
                        const colorIdx = centerName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % rainbowColors.length;
                        return (
                          <div 
                            key={idx} 
                            className={`${rainbowColors[colorIdx]} text-[7px] md:text-[10px] text-white font-bold px-0.5 md:px-1.5 py-0.5 md:py-1 rounded-sm overflow-hidden whitespace-nowrap md:text-ellipsis text-center md:text-left leading-none tracking-tighter md:tracking-normal`}>
                            <span className="md:hidden">{mobileCenterName}</span>
                            <span className="hidden md:inline">{centerName}</span>
                          </div>
                        );
                      })}
                      {dayData.length > 4 && (
                        <div className="text-[7px] text-gray-400 font-bold text-center leading-none">
                          +{dayData.length - 4}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="size-1.5 bg-primary rounded-full"></span>
          {formatDate(selectedDate)} 상세 내역
        </h3>
        {filteredList.length > 0 ? (
          <div className="grid gap-3">
            {filteredList.map((item, idx) => (
              <div 
                key={idx} 
                onClick={() => handleEditClick(item)}
                className="bg-white p-5 rounded-3xl border border-gray-50 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all cursor-pointer active:scale-[0.98]">
                <div className="size-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#0a1931] truncate">
                    {item['센터'] || '알수없음'} · {item['과목'] || '과목없음'}
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">
                    {item['이름'] || '익명'} 강사님 · {item['시간'] || item['타임스탬프']?.split('T')[1]?.substring(0, 5) || '기록없음'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-4xl text-gray-100 mb-2">inbox</span>
            <p className="text-gray-300 font-bold text-sm">기록된 데이터가 없습니다.</p>
          </div>
        )}
        <AdBanner slot="2222222222" className="mx-0" />
      </div>

      <button 
        onClick={() => {
          setEditItem(null);
          setFormCenter('');
          setFormSubject('');
          setFormTime(''); // 초기값을 비워서 --:-- 로 표시되게 함
          setIsModalOpen(true);
        }} 
        className="fixed bottom-36 right-6 size-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 z-40 border-4 border-white safe-mb">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-10 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-10 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black">{editItem ? '보고서 수정' : `${title} 작성`}</h2>
              <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-xl bg-gray-50 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAddData} className="space-y-5">
              {/* 자동 입력 정보 표시 */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400 font-bold">작성자 / 지사</span>
                  <span className="text-[#0a1931] font-black">{userData?.name} / {userData?.branch}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-400 font-bold">날짜</span>
                  <span className="text-primary font-black text-lg">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400 font-bold">이메일</span>
                  <span className="text-[#0a1931] font-black">{userData?.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0a1931] ml-2">시간 <span className="text-rose-500">*</span></label>
                <div className="relative w-full h-14 rounded-2xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <input 
                    type="time"
                    value={formTime} 
                    onChange={(e) => setFormTime(e.target.value)} 
                    className="w-full h-full px-5 bg-transparent border-none outline-none font-bold text-sm cursor-pointer" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">센터명 <span className="text-rose-500">*</span></label>
                  <input 
                    value={formCenter} 
                    onChange={(e) => {
                      setFormCenter(e.target.value);
                      setShowCenterSuggestions(true);
                    }} 
                    onFocus={() => setShowCenterSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCenterSuggestions(false), 200)}
                    placeholder="센터 이름 입력 (2글자 이상)" 
                    className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all" 
                    required 
                  />
                  
                  {showCenterSuggestions && filteredCenters.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-[70] max-h-48 overflow-y-auto custom-scrollbar p-2">
                      {filteredCenters.map((center, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormCenter(center);
                            setShowCenterSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl text-sm font-bold text-[#0a1931] transition-colors">
                          {center}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a1931] ml-2">과목 <span className="text-rose-500">*</span></label>
                  <select 
                    value={formSubject} 
                    onChange={(e) => setFormSubject(e.target.value)} 
                    className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all appearance-none" 
                    required 
                  >
                    <option value="" disabled>과목 선택</option>
                    {['음악', '전래', '체조', '교구', '노래'].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-lg active:scale-[0.98] disabled:opacity-50 transition-all">
                {loading ? "전송 중..." : editItem ? "보고서 수정하기" : "보고서 등록하기"}
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
          <button onClick={() => navigate('/notice')} className={`flex flex-col items-center justify-center gap-1.5 ${type === 'NOTICE' ? 'text-primary' : 'text-gray-400'}`}>
            <span className={`material-symbols-outlined text-[26px] ${type === 'NOTICE' && 'fill-1'}`}>campaign</span>
            <span className="text-[10px] font-bold">공지방</span>
          </button>
          <button onClick={() => navigate('/report')} className={`flex flex-col items-center justify-center gap-1.5 ${type === 'REPORT' ? 'text-primary' : 'text-gray-400'}`}>
            <span className={`material-symbols-outlined text-[26px] ${type === 'REPORT' && 'fill-1'}`}>description</span>
            <span className="text-[10px] font-bold">보고방</span>
          </button>
          <button onClick={() => navigate('/resource')} className={`flex flex-col items-center justify-center gap-1.5 ${type === 'RESOURCE' ? 'text-primary' : 'text-gray-400'}`}>
            <span className={`material-symbols-outlined text-[26px] ${type === 'RESOURCE' && 'fill-1'}`}>folder_open</span>
            <span className="text-[10px] font-bold">자료방</span>
          </button>
          <button onClick={() => navigate('/forum')} className={`flex flex-col items-center justify-center gap-1.5 ${type === 'FORUM' ? 'text-primary' : 'text-gray-400'}`}>
            <span className={`material-symbols-outlined text-[26px] ${type === 'FORUM' && 'fill-1'}`}>forum</span>
            <span className="text-[10px] font-bold">소통방</span>
          </button>
          <button onClick={() => navigate('/stats')} className={`flex flex-col items-center justify-center gap-1.5 ${type === 'STATS' || type === 'STATISTICS' ? 'text-primary' : 'text-gray-400'}`}>
            <span className={`material-symbols-outlined text-[26px] ${(type === 'STATS' || type === 'STATISTICS') && 'fill-1'}`}>leaderboard</span>
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

export default ReportPage;
