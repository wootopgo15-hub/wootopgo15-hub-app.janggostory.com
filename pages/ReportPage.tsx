
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitToGoogleSheets, fetchSheetData, getCachedSheetData } from '../services/googleSheets';

interface Props {
  title?: string;
  type?: string;
  icon?: string;
  color?: string;
}

const ReportPage: React.FC<Props> = ({ title = "보고방", type = "CENTER_LIST", icon = "description", color = "primary" }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [centerList, setCenterList] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const [formCenter, setFormCenter] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDate, setFormDate] = useState('');
  const [showCenterSuggestions, setShowCenterSuggestions] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // 센터 추가 모달 상태
  const [isAddCenterModalOpen, setIsAddCenterModalOpen] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [newCenterBranch, setNewCenterBranch] = useState('');
  const [newCenterStatus, setNewCenterStatus] = useState('승인');
  const [isAddingCenter, setIsAddingCenter] = useState(false);

  const filteredCenters = useMemo(() => {
    const trimmedInput = formCenter.trim();
    const excludedWords = ['요양원', '센터', '요양', '주간', '보호', '주간보', '주간보호', '주간보호센', '주간보호센터', '보호센', '보호센터', '간보', '간보호', '간보호센', '간보호센터', '호센', '호센터'];
    
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
    
    const cachedCenters = getCachedSheetData('CENTER');
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
      const centers = await fetchSheetData('CENTER', force);
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
    
    // 7의 배수로 맞추기 위해 빈 칸 추가
    const remaining = days.length % 7;
    if (remaining > 0) {
      for (let i = 0; i < 7 - remaining; i++) days.push(null);
    }
    
    return days;
  }, [currentDate]);

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    if (formDate.endsWith('-00')) {
      setModalMessage("날짜를 올바르게 선택해주세요.");
      return;
    }

    // 센터 유효성 검사
    const trimmedCenter = formCenter.trim();
    const allCenterNames = centerList.map(c => String(Object.values(c)[0] || '').trim());
    if (centerList.length > 0 && !allCenterNames.includes(trimmedCenter)) {
      setModalMessage("등록되지 않은 센터명입니다. 목록에서 선택하거나 정확히 입력해주세요.");
      return;
    }

    setLoading(true);

    const now = new Date();
    
    const payload: any = {
      type: type,
      mode: editItem ? 'UPDATE' : 'APPEND',
      '이름': userData.name, // 이름(자동)
      '날짜': formDate, // 날짜(입력)
      '시간': formTime, // 시간(입력)
      '센터': formCenter, // 센터(입력)
      '과목': formSubject, // 과목(입력)
      '지사': userData.branch, // 지사(자동)
      '이메일': userData.email, // 이메일(자동)
      '타임스탬프': editItem ? editItem['타임스탬프'] : now.toISOString(),
    };

    try {
      // 1. 낙관적 업데이트 (화면에 즉시 반영)
      const newItem = {
        '이름': payload['이름'],
        '날짜': payload['날짜'],
        '시간': payload['시간'],
        '센터': payload['센터'],
        '과목': payload['과목'],
        '지사': payload['지사'],
        '이메일': payload['이메일'],
        '타임스탬프': payload['타임스탬프']
      };

      if (editItem) {
        setDataList(prev => prev.map(item => item['타임스탬프'] === payload['타임스탬프'] ? { ...item, ...newItem } : item));
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
    } catch (err: any) {
      console.error('Submit Error:', err);
      setModalMessage(`저장에 실패했습니다: ${err.message || '알 수 없는 오류'}`);
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
    setFormDate(item['날짜'] || formatDate(selectedDate));
    setIsModalOpen(true);
  };

  const handleAddCenterClick = () => {
    if (!userData) return;
    if (userData.role === '강사') {
      setModalMessage('센터추가는 일반강사는 할수 없습니다');
      return;
    }
    setNewCenterName('');
    setNewCenterBranch(userData.role === '관리자' ? '' : (userData.branch || ''));
    setNewCenterStatus('승인');
    setIsAddCenterModalOpen(true);
  };

  const handleAddCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCenterName.trim() || !newCenterBranch.trim()) return;

    setIsAddingCenter(true);
    try {
      const payload = {
        type: 'CENTER',
        mode: 'APPEND',
        '센터명': newCenterName.trim(),
        '지사': newCenterBranch.trim(),
        '승인상태': newCenterStatus
      };

      const success = await submitToGoogleSheets(payload);
      if (success) {
        setIsAddCenterModalOpen(false);
        setNewCenterName('');
        setNewCenterBranch('');
        setNewCenterStatus('승인');
        setModalMessage('센터가 성공적으로 추가되었습니다.');
        loadCenterList(true); // 센터 목록 새로고침
      } else {
        setModalMessage('센터 추가에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Center Add Error:', err);
      setModalMessage(`센터 추가 중 오류가 발생했습니다: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsAddingCenter(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-white text-[#0f172a] font-sans overflow-hidden flex flex-col pb-20 safe-mb">
      <header className="px-4 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between shrink-0 border-b border-gray-100 safe-top z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="size-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">{title}</h1>
            <p className="text-[8px] text-primary font-black uppercase tracking-[0.2em] mt-1">Management Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleAddCenterClick} 
            className="h-8 px-3 rounded-full flex items-center justify-center bg-emerald-500 text-white shadow-sm transition-all active:scale-95 font-bold text-xs"
          >
            센터추가
          </button>
          <button onClick={() => { loadData(true); loadCenterList(true); }} disabled={isRefreshing} className={`size-8 rounded-full flex items-center justify-center bg-primary text-white shadow-sm transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-95'}`}>
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between p-3 shrink-0">
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="size-8 flex items-center justify-center hover:bg-gray-50 rounded-xl"><span className="material-symbols-outlined">chevron_left</span></button>
          <h2 className="text-base font-black">{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="size-8 flex items-center justify-center hover:bg-gray-50 rounded-xl"><span className="material-symbols-outlined">chevron_right</span></button>
        </div>
        
        <div className="flex flex-col pb-6">
          <div className="grid grid-cols-7 mb-1 shrink-0 text-center px-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div key={day} className={`text-[10px] font-bold uppercase ${i === 0 ? 'text-rose-400' : 'text-gray-400'}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(75px,auto)] gap-px bg-gray-100 border-t border-gray-100">
            {calendarDays.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} className="bg-white h-full w-full"></div>;
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
                  onClick={() => {
                    setSelectedDate(date);
                    setIsDetailsModalOpen(true);
                  }} 
                  className={`relative bg-white flex flex-col items-center pt-1 pb-1 transition-all overflow-hidden h-full w-full ${isSelected ? 'ring-2 ring-inset ring-primary z-10' : 'hover:bg-gray-50'}`}>
                  <span className={`text-[10px] font-black mb-0.5 ${isSelected ? 'text-primary' : 'text-gray-600'}`}>{date.getDate()}</span>
                  
                  <div className="w-full px-0.5 space-y-px overflow-hidden flex-1">
                    {dayData.slice(0, 4).map((item, idx) => {
                      const centerName = item['센터'] || item['지사'] || '알수없음';
                      const mobileCenterName = centerName.length > 3 ? centerName.substring(0, 3) + '...' : centerName;
                      // 센터 이름 기반으로 고정된 랜덤 색상 선택
                      const colorIdx = centerName.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % rainbowColors.length;
                      return (
                        <div 
                          key={idx} 
                          className={`${rainbowColors[colorIdx]} text-[7px] md:text-[10px] text-white font-bold px-0.5 md:px-1.5 py-0.5 rounded-sm overflow-hidden whitespace-nowrap md:text-ellipsis text-center md:text-left leading-none tracking-tighter md:tracking-normal`}>
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
      </main>

      <button 
        onClick={() => {
          setEditItem(null);
          setFormCenter('');
          setFormSubject('');
          setFormTime(''); // 초기값을 비워서 --:-- 로 표시되게 함
          const y = selectedDate.getFullYear();
          const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
          setFormDate(`${y}-${m}-00`);
          setIsModalOpen(true);
        }} 
        className="fixed bottom-28 right-6 size-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 z-40 safe-mb">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Details Modal */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up sm:animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="size-1.5 bg-primary rounded-full"></span>
                {formatDate(selectedDate)} 상세 내역
              </h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="size-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-600 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {filteredList.length > 0 ? (
                <div className="grid gap-3">
                  {filteredList.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setIsDetailsModalOpen(false);
                        handleEditClick(item);
                      }}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all cursor-pointer active:scale-[0.98]">
                      <div className="size-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#0a1931] truncate text-sm">
                          {item['센터'] || '알수없음'} · {item['과목'] || '과목없음'}
                        </p>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                          {item['이름'] || '익명'} 강사님 · {item['시간'] || item['타임스탬프']?.split('T')[1]?.substring(0, 5) || '기록없음'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
                  <p className="text-gray-400 font-bold text-sm">기록된 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
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
                <div className="flex justify-between items-center text-[11px] relative">
                  <span className="text-gray-400 font-bold">날짜</span>
                  <div className="relative flex items-center justify-end">
                    <span className="text-primary font-black text-lg mr-1">{formDate}</span>
                    <input 
                      type="date"
                      value={formDate.endsWith('-00') ? '' : formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      required
                    />
                  </div>
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
          <button onClick={() => navigate('/report')} className={`flex flex-col items-center justify-center gap-1.5 ${type === 'CENTER_LIST' ? 'text-primary' : 'text-gray-400'}`}>
            <span className={`material-symbols-outlined text-[26px] ${type === 'CENTER_LIST' && 'fill-1'}`}>description</span>
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

      {/* 센터 추가 모달 */}
      {isAddCenterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-[#111318]">센터 추가</h3>
              <button onClick={() => setIsAddCenterModalOpen(false)} className="size-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>
            <form onSubmit={handleAddCenterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">센터명</label>
                <input
                  type="text"
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                  placeholder="추가할 센터명을 입력하세요"
                  className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">지사</label>
                <select
                  value={newCenterBranch}
                  onChange={(e) => setNewCenterBranch(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-70"
                  required
                  disabled={userData?.role !== '관리자'}
                >
                  <option value="" disabled>지사를 선택하세요</option>
                  <option value="천안">천안</option>
                  <option value="세종">세종</option>
                  <option value="평택">평택</option>
                  <option value="준비중">준비중</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">승인상태</label>
                <select
                  value={newCenterStatus}
                  onChange={(e) => setNewCenterStatus(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  <option value="승인">승인</option>
                  <option value="대기">대기</option>
                  <option value="거절">거절</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isAddingCenter || !newCenterName.trim() || !newCenterBranch.trim()}
                className="w-full h-12 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isAddingCenter ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                    <span>추가 중...</span>
                  </>
                ) : (
                  <span>추가하기</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

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
