import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, getCachedSheetData } from '../services/googleSheets';

const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userData, setUserData] = useState<any>(null);

  const [expandedCenter, setExpandedCenter] = useState<string | null>(null);
  const [confirmedCenters, setConfirmedCenters] = useState<Set<string>>(new Set());

  const handleConfirmCenter = (e: React.MouseEvent, centerName: string) => {
    e.stopPropagation();
    setConfirmedCenters(prev => {
      const next = new Set(prev);
      next.add(centerName);
      return next;
    });
  };

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await fetchSheetData('REPORT', !forceRefresh);
      setReportData(data);
    } catch (error) {
      console.error('Failed to load report data for stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      setUserData(JSON.parse(savedData));
    }

    // Load cached data first
    const cached = getCachedSheetData('REPORT');
    if (cached && cached.length > 0) {
      setReportData(cached);
    }

    // Fetch fresh data
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData(true);
  };

  const stats = useMemo(() => {
    const map = new Map<string, { name: string; subjects: Set<string>; currentMonthCount: number; totalCount: number }>();
    const centerMap = new Map<string, { name: string; currentMonthCount: number; totalCount: number; subjects: Record<string, number>; teachersBySubject: Record<string, Record<string, number>> }>();
    
    let totalCurrentMonth = 0;

    if (!userData) return { list: [], totalCurrentMonth: 0, activeTeachers: 0, topTeacher: '-', centers4OrMore: [], centers3OrLess: [] };

    const userRole = String(userData.role).trim();
    const userBranch = String(userData.branch).trim();
    const userEmail = String(userData.email).trim();

    const filteredData = reportData.filter(row => {
      if (userRole === '관리자') return true;
      if (userRole === '부관리자') {
        return String(row['지사'] || '').trim() === userBranch;
      }
      return String(row['이메일'] || '').trim() === userEmail;
    });
    
    filteredData.forEach(row => {
      const name = String(row['이름'] || '').trim();
      const subject = String(row['과목'] || '').trim();
      const center = String(row['센터'] || '').trim();
      const dateVal = row['날짜'] || row['타임스탬프'];
      
      let isCurrentMonth = false;
      if (dateVal) {
        try {
          // Handle various date formats
          let dateObj: Date;
          const match = String(dateVal).match(/(\d{4})[./-년]\s?(\d{1,2})[./-월]\s?(\d{1,2})/);
          if (match) {
            dateObj = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else {
            dateObj = new Date(dateVal);
          }

          if (!isNaN(dateObj.getTime()) && 
              dateObj.getFullYear() === currentDate.getFullYear() && 
              dateObj.getMonth() === currentDate.getMonth()) {
            isCurrentMonth = true;
          }
        } catch (e) {
          // ignore invalid dates
        }
      }

      if (name) {
        if (!map.has(name)) {
          map.set(name, { name, subjects: new Set(), currentMonthCount: 0, totalCount: 0 });
        }
        const stat = map.get(name)!;
        if (subject) stat.subjects.add(subject);
        stat.totalCount += 1;
        if (isCurrentMonth) {
          stat.currentMonthCount += 1;
          totalCurrentMonth += 1;
        }
      }

      if (center) {
        if (!centerMap.has(center)) {
          centerMap.set(center, { name: center, currentMonthCount: 0, totalCount: 0, subjects: {}, teachersBySubject: {} });
        }
        const cStat = centerMap.get(center)!;
        cStat.totalCount += 1;
        if (isCurrentMonth) {
          cStat.currentMonthCount += 1;
          if (subject) {
            cStat.subjects[subject] = (cStat.subjects[subject] || 0) + 1;
            if (!cStat.teachersBySubject[subject]) {
              cStat.teachersBySubject[subject] = {};
            }
            if (name) {
              cStat.teachersBySubject[subject][name] = (cStat.teachersBySubject[subject][name] || 0) + 1;
            }
          }
        }
      }
    });

    const list = Array.from(map.values()).map(stat => ({
      ...stat,
      subjectStr: Array.from(stat.subjects).join(', ') || '미지정'
    })).sort((a, b) => b.currentMonthCount - a.currentMonthCount || b.totalCount - a.totalCount);

    const centerList = Array.from(centerMap.values())
      .filter(c => c.currentMonthCount > 0)
      .sort((a, b) => b.currentMonthCount - a.currentMonthCount);
      
    // 모든 과목이 정확히 4개인 센터는 제외 (4개가 아닌 과목이 하나라도 있는 센터만 포함)
    const filteredCenterList = centerList.filter(c => 
      Object.values(c.subjects).some(count => count !== 4)
    );
      
    const centers4OrMore = filteredCenterList.filter(c => c.currentMonthCount >= 4 && !confirmedCenters.has(c.name));
    const centers3OrLess = filteredCenterList.filter(c => c.currentMonthCount <= 3 && !confirmedCenters.has(c.name));

    const activeTeachers = list.filter(t => t.currentMonthCount > 0).length;
    const topTeacher = list.length > 0 && list[0].currentMonthCount > 0 ? list[0].name : '-';

    return { list, totalCurrentMonth, activeTeachers, topTeacher, centers4OrMore, centers3OrLess };
  }, [reportData, currentDate, confirmedCenters]);

  const maxCount = stats.list.length > 0 ? Math.max(...stats.list.map(t => t.currentMonthCount)) : 1;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-44 font-sans">
      <header className="px-4 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="size-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">통계방</h1>
            <p className="text-[8px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">Analytics Hub</p>
          </div>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
          새로고침
        </button>
      </header>

      <div className="px-6 py-6 space-y-4">
        {/* 1. 실시간 활동 요약 (Top Summary) */}
        <div className="flex items-center justify-between mt-2 mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="size-1.5 bg-blue-500 rounded-full"></span>
            {currentDate.getMonth() + 1}월 활동 요약
          </h3>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-gray-400 hover:text-blue-500 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back_ios_new</span>
            </button>
            <span className="text-xs font-bold w-12 text-center">{currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-gray-400 hover:text-blue-500 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center relative overflow-hidden min-h-[100px]">
            <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-6xl text-white/10">school</span>
            <span className="text-[10px] font-bold text-blue-100 mb-1 z-10">당월 총 수업</span>
            <div className="flex items-end justify-center z-10">
              <span className="text-2xl font-black leading-none">{stats.totalCurrentMonth}</span>
              <span className="text-[10px] ml-0.5 mb-0.5 opacity-80 font-bold">회</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
            <span className="text-[10px] font-bold text-gray-400 mb-1">활동 강사</span>
            <div className="flex items-end justify-center">
              <span className="text-2xl font-black text-[#0a1931] leading-none">{stats.activeTeachers}</span>
              <span className="text-[10px] text-gray-400 ml-0.5 mb-0.5 font-bold">명</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
            <span className="text-[10px] font-bold text-gray-400 mb-1">이달의 우수</span>
            <div className="flex flex-col items-center justify-center">
              <span className="text-sm font-black text-amber-500 truncate">{stats.topTeacher}</span>
              <span className="text-[9px] text-gray-400 mt-0.5">강사님</span>
            </div>
          </div>
        </div>

        {/* 2. 강사별 수업 횟수 랭킹 (Visual Chart) */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="size-1.5 bg-blue-500 rounded-full"></span>
            명예의 전당 (Top 5)
          </h3>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
          <div className="space-y-5">
            {stats.list.slice(0, 5).map((teacher, idx) => (
              <div key={teacher.name} className="flex items-center gap-3 group">
                <div className="w-8 shrink-0 flex justify-center">
                  {idx === 0 ? <span className="text-2xl" title="1위">🥇</span> :
                   idx === 1 ? <span className="text-2xl" title="2위">🥈</span> :
                   idx === 2 ? <span className="text-2xl" title="3위">🥉</span> :
                   <span className="text-sm font-black text-gray-300">{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-sm font-bold text-[#0a1931] truncate">{teacher.name}</span>
                    <span className="text-xs font-black text-blue-500">{teacher.currentMonthCount}<span className="text-[9px] text-gray-400 ml-0.5 font-medium">회</span></span>
                  </div>
                  <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : idx === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : idx === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' : 'bg-gradient-to-r from-blue-400 to-blue-500'}`}
                      style={{ width: `${Math.max((teacher.currentMonthCount / maxCount) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {stats.list.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400 font-medium">
                이번 달 기록된 수업이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 3. 센터별 통계 (Center Stats) */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="size-1.5 bg-blue-500 rounded-full"></span>
            센터별 당월 수업 현황
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
            <h4 className="text-sm font-bold text-[#0a1931] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
              4회 이상 센터
              <span className="ml-auto bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full">{stats.centers4OrMore.length}개</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {stats.centers4OrMore.map(center => {
                const incompleteSubjects = Object.entries(center.subjects).filter(([_, count]) => count !== 4);
                const isExpanded = expandedCenter === center.name;
                return (
                  <div key={center.name} className="flex flex-col p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" onClick={() => setExpandedCenter(isExpanded ? null : center.name)}>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-700">{center.name}</span>
                        {incompleteSubjects.length > 0 && (
                          <span className="text-[10px] text-rose-500 font-medium">
                            {incompleteSubjects.map(([subj, count]) => `${subj} ${count}개`).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-500 shrink-0">{center.currentMonthCount}회</span>
                        <button 
                          onClick={(e) => handleConfirmCenter(e, center.name)}
                          className="ml-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded transition-colors"
                        >
                          확인
                        </button>
                        <span className={`material-symbols-outlined text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 shadow-inner text-xs space-y-2 cursor-default" onClick={e => e.stopPropagation()}>
                        {Object.entries(center.teachersBySubject).map(([subj, teachers]) => (
                          <div key={subj} className="flex flex-col gap-1">
                            <span className={`font-bold ${center.subjects[subj] !== 4 ? 'text-rose-500' : 'text-gray-700'}`}>{subj} ({center.subjects[subj]}개)</span>
                            <div className="pl-2 space-y-0.5">
                              {Object.entries(teachers).map(([teacher, count]) => (
                                <div key={teacher} className="flex justify-between text-gray-500">
                                  <span>- {teacher} 강사님</span>
                                  <span className="font-medium">{count}회</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {stats.centers4OrMore.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">해당하는 센터가 없습니다.</div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
            <h4 className="text-sm font-bold text-[#0a1931] mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-rose-500 text-lg">warning</span>
              4회 미만 (1~3회) 센터
              <span className="ml-auto bg-rose-50 text-rose-600 text-[10px] px-2 py-0.5 rounded-full">{stats.centers3OrLess.length}개</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {stats.centers3OrLess.map(center => {
                const incompleteSubjects = Object.entries(center.subjects).filter(([_, count]) => count !== 4);
                const isExpanded = expandedCenter === center.name;
                return (
                  <div key={center.name} className="flex flex-col p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer" onClick={() => setExpandedCenter(isExpanded ? null : center.name)}>
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-700">{center.name}</span>
                        {incompleteSubjects.length > 0 && (
                          <span className="text-[10px] text-rose-500 font-medium">
                            {incompleteSubjects.map(([subj, count]) => `${subj} ${count}개`).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-rose-500 shrink-0">{center.currentMonthCount}회</span>
                        <button 
                          onClick={(e) => handleConfirmCenter(e, center.name)}
                          className="ml-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded transition-colors"
                        >
                          확인
                        </button>
                        <span className={`material-symbols-outlined text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 shadow-inner text-xs space-y-2 cursor-default" onClick={e => e.stopPropagation()}>
                        {Object.entries(center.teachersBySubject).map(([subj, teachers]) => (
                          <div key={subj} className="flex flex-col gap-1">
                            <span className={`font-bold ${center.subjects[subj] !== 4 ? 'text-rose-500' : 'text-gray-700'}`}>{subj} ({center.subjects[subj]}개)</span>
                            <div className="pl-2 space-y-0.5">
                              {Object.entries(teachers).map(([teacher, count]) => (
                                <div key={teacher} className="flex justify-between text-gray-500">
                                  <span>- {teacher} 강사님</span>
                                  <span className="font-medium">{count}회</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {stats.centers3OrLess.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">해당하는 센터가 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        {/* 4. 상세 통계 테이블 (Detailed Data) */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="size-1.5 bg-blue-500 rounded-full"></span>
            전체 강사 통계
          </h3>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="divide-y divide-blue-50">
            {stats.list.map((teacher, idx) => (
              <div key={teacher.name} className="flex items-center justify-between p-4 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-black text-blue-500 shrink-0">
                    {teacher.name.substring(0, 1)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#0a1931]">{teacher.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md bg-gray-50 text-[10px] font-bold text-gray-500 w-fit">
                      {teacher.subjectStr}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-500/70">당월</span>
                    <span className="text-base font-black text-blue-500">{teacher.currentMonthCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400">누적</span>
                    <span className="text-sm font-bold text-gray-400">{teacher.totalCount}</span>
                  </div>
                </div>
              </div>
            ))}
            {stats.list.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400 font-medium">
                데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

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
          <button onClick={() => navigate('/resource')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">folder_open</span>
            <span className="text-[10px] font-bold">자료방</span>
          </button>
          <button onClick={() => navigate('/forum')} className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
            <span className="material-symbols-outlined text-[26px]">forum</span>
            <span className="text-[10px] font-bold">소통방</span>
          </button>
          <button onClick={() => navigate('/stats')} className="flex flex-col items-center justify-center gap-1.5 text-blue-500">
            <span className="material-symbols-outlined text-[26px] fill-1">leaderboard</span>
            <span className="text-[10px] font-black">통계방</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default StatsPage;
