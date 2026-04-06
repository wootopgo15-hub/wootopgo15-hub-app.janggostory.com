import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitToGoogleSheets, fetchSheetData, getCachedSheetData } from '../services/googleSheets';

const PropsOffPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'PROP' | 'OFF'>('PROP');
  const [editItem, setEditItem] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Form states
  const [propName, setPropName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [normalQuantity, setNormalQuantity] = useState('');
  const [brokenQuantity, setBrokenQuantity] = useState('');
  const [lostQuantity, setLostQuantity] = useState('');
  const [offDays, setOffDays] = useState<string[]>([]);
  const [week, setWeek] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('전체');

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      setUserData(JSON.parse(savedData));
    }
    
    const cached = getCachedSheetData('PROPS_OFF');
    if (cached.length > 0) {
      setDataList(cached);
    }
    
    loadData();
  }, []);

  const loadData = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const data = await fetchSheetData('PROPS_OFF', force);
      setDataList(data);
    } catch (error: any) {
      console.error('Failed to load PROPS_OFF:', error);
      setModalMessage(`데이터를 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const myOffDayEntry = useMemo(() => {
    if (!userData) return null;
    return dataList.find(item => item['이메일'] === userData.email && item['쉬는날']);
  }, [dataList, userData]);

  const baseList = useMemo(() => {
    if (!userData) return [];
    const userRole = String(userData.role).trim();
    const userBranch = String(userData.branch).trim();
    const userDepartment = String(userData.department).trim();

    return dataList.filter(item => {
      // 관리자, 부관리자는 전체(또는 해당 지사) 열람 가능
      if (userRole === '관리자') return true;
      if (userRole === '부관리자') {
        return String(item['지사'] || '').trim() === userBranch;
      }
      // 강사는 같은 부서만 열람 가능
      return String(item['부서'] || '').trim() === userDepartment;
    });
  }, [dataList, userData]);

  const offDaysByMonth = useMemo(() => {
    const grouped: Record<string, Record<string, any>> = {};
    
    if (!userData) return { grouped: {}, sortedMonths: [] };
    const userRole = String(userData.role).trim();
    const userBranch = String(userData.branch).trim();
    const userEmail = String(userData.email).trim();

    const offDaysList = dataList.filter(item => {
      if (!item['쉬는날']) return false;
      if (userRole === '관리자') return true;
      if (userRole === '부관리자') return String(item['지사'] || '').trim() === userBranch;
      return String(item['이메일'] || '').trim() === userEmail;
    });

    offDaysList.forEach(item => {
      const dates = String(item['쉬는날']).split(',').map(d => d.split('T')[0].trim()).filter(Boolean);
      dates.forEach(dateStr => {
        let year, month;
        if (dateStr === '없음') {
          const ts = new Date(item['타임스탬프'] || Date.now());
          year = ts.getFullYear().toString();
          month = (ts.getMonth() + 1).toString().padStart(2, '0');
        } else {
          const parts = dateStr.split('-');
          year = parts[0];
          month = parts[1];
        }
        
        if (year && month) {
          const monthKey = `${year}년 ${parseInt(month, 10)}월`;
          if (!grouped[monthKey]) {
            grouped[monthKey] = {};
          }
          const personKey = `${item['이름']}_${item['지사']}_${item['부서']}`;
          if (!grouped[monthKey][personKey]) {
            grouped[monthKey][personKey] = {
              name: item['이름'],
              branch: item['지사'] || '미지정',
              department: item['부서'] || '미지정',
              dates: []
            };
          }
          if (!grouped[monthKey][personKey].dates.includes(dateStr)) {
            grouped[monthKey][personKey].dates.push(dateStr);
          }
        }
      });
    });

    const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const finalGrouped: Record<string, { branch: string, departments: { department: string, persons: any[] }[] }[]> = {};
    
    sortedMonths.forEach(month => {
      const persons = Object.values(grouped[month]);
      persons.forEach(p => p.dates.sort((a: string, b: string) => a.localeCompare(b)));
      persons.sort((a, b) => {
        const dateA = a.dates[0] || '';
        const dateB = b.dates[0] || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.name.localeCompare(b.name);
      });

      const branchGroup: Record<string, Record<string, any[]>> = {};
      persons.forEach(p => {
        if (!branchGroup[p.branch]) branchGroup[p.branch] = {};
        if (!branchGroup[p.branch][p.department]) branchGroup[p.branch][p.department] = [];
        branchGroup[p.branch][p.department].push(p);
      });

      const sortedBranches = Object.keys(branchGroup).sort((a, b) => a.localeCompare(b));
      finalGrouped[month] = sortedBranches.map(branch => {
        const sortedDepartments = Object.keys(branchGroup[branch]).sort((a, b) => a.localeCompare(b));
        return {
          branch,
          departments: sortedDepartments.map(dept => ({
            department: dept,
            persons: branchGroup[branch][dept]
          }))
        };
      });
    });

    return { grouped: finalGrouped, sortedMonths };
  }, [dataList, userData]);

  const { filteredPropsList, groupedPropsList } = useMemo(() => {
    let list = baseList.filter(item => item['교구명']);

    if (selectedWeek !== '전체') {
      list = list.filter(item => item['주차'] === selectedWeek);
    }

    list.sort((a, b) => new Date(b['타임스탬프']).getTime() - new Date(a['타임스탬프']).getTime());

    const branchGroup: Record<string, Record<string, any[]>> = {};
    list.forEach(item => {
      const branch = String(item['지사'] || '미지정').trim();
      const course = String(item['수업명'] || '미지정').trim();
      if (!branchGroup[branch]) branchGroup[branch] = {};
      if (!branchGroup[branch][course]) branchGroup[branch][course] = [];
      branchGroup[branch][course].push(item);
    });

    const sortedBranches = Object.keys(branchGroup).sort((a, b) => a.localeCompare(b));
    const groupedList = sortedBranches.map(branch => {
      const sortedCourses = Object.keys(branchGroup[branch]).sort((a, b) => a.localeCompare(b));
      return {
        branch,
        courses: sortedCourses.map(course => {
          const items = branchGroup[branch][course];
          const personGroup: Record<string, any[]> = {};
          items.forEach(item => {
            const name = String(item['이름'] || '미지정').trim();
            if (!personGroup[name]) personGroup[name] = [];
            personGroup[name].push(item);
          });
          const sortedNames = Object.keys(personGroup).sort((a, b) => a.localeCompare(b));
          return {
            course: course,
            persons: sortedNames.map(name => ({
              name,
              items: personGroup[name]
            }))
          };
        })
      };
    });

    return { filteredPropsList: list, groupedPropsList: groupedList };
  }, [baseList, selectedWeek]);

  const handleAddOffDay = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    
    if (offDays.includes(value)) {
      setOffDays(prev => prev.filter(d => d !== value));
    } else {
      if (offDays.length >= 5 && !offDays.includes('없음')) {
        setModalMessage('쉬는 날은 5일까지만 선택 가능합니다.');
        return;
      }
      setOffDays(prev => {
        const filtered = prev.filter(d => d !== '없음');
        return [...filtered, value].sort();
      });
    }
  };

  const handleNoOffDay = () => {
    setOffDays(['없음']);
  };

  const removeOffDay = (dateToRemove: string) => {
    setOffDays(prev => prev.filter(d => d !== dateToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    if (modalMode === 'PROP') {
      if (!week) {
        setModalMessage('주차를 선택해야 합니다.');
        return;
      }
      if (!courseName) {
        setModalMessage('수업명을 선택해야 합니다.');
        return;
      }
      if (!propName.trim()) {
        setModalMessage('교구명을 입력해야 합니다.');
        return;
      }
      if (!normalQuantity) {
        setModalMessage('정상 수량을 입력해야 합니다.');
        return;
      }
    }
    
    if (modalMode === 'OFF' && offDays.length === 0) {
      setModalMessage('쉬는 날을 선택해야 합니다.');
      return;
    }

    setLoading(true);
    const now = new Date();
    
    let payload: any = {
      type: 'PROPS_OFF',
      '이름': editItem ? editItem['이름'] : userData.name,
      '지사': editItem ? editItem['지사'] : userData.branch,
      '부서': editItem ? editItem['부서'] : userData.department,
      '이메일': editItem ? editItem['이메일'] : userData.email,
    };

    if (modalMode === 'PROP') {
      payload.mode = editItem ? 'UPDATE' : 'APPEND';
      payload['주차'] = week;
      payload['수업명'] = courseName;
      payload['교구명'] = propName;
      payload['정상수량'] = normalQuantity;
      payload['파손수량'] = brokenQuantity;
      payload['분실수량'] = lostQuantity;
      payload['타임스탬프'] = editItem ? editItem['타임스탬프'] : now.toISOString();
      payload.timestamp = payload['타임스탬프'];
      if (editItem) {
        payload['쉬는날'] = editItem['쉬는날'] || '';
      }
    } else {
      payload.mode = editItem ? 'UPDATE' : 'APPEND';
      payload['쉬는날'] = offDays.join(', ');
      payload['타임스탬프'] = editItem ? editItem['타임스탬프'] : now.toISOString();
      payload.timestamp = payload['타임스탬프'];
      // 기존 교구 데이터가 있다면 유지
      if (editItem) {
        payload['주차'] = editItem['주차'] || '';
        payload['수업명'] = editItem['수업명'] || '';
        payload['교구명'] = editItem['교구명'] || '';
        payload['정상수량'] = editItem['정상수량'] || '';
        payload['파손수량'] = editItem['파손수량'] || '';
        payload['분실수량'] = editItem['분실수량'] || '';
      }
    }

    try {
      // 낙관적 업데이트
      if (payload.mode === 'UPDATE') {
        setDataList(prev => prev.map(item => item['타임스탬프'] === payload['타임스탬프'] ? { ...item, ...payload } : item));
      } else {
        setDataList(prev => [payload, ...prev]);
      }
      
      setIsModalOpen(false);
      setPropName('');
      setCourseName('');
      setNormalQuantity('');
      setBrokenQuantity('');
      setLostQuantity('');
      setOffDays([]);
      setEditItem(null);

      await submitToGoogleSheets(payload);
      loadData(true);
    } catch (err) {
      console.error('Submit Error:', err);
      loadData(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-44 font-sans">
      <header className="px-6 pt-6 pb-6 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 shadow-sm safe-top">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="size-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none">교구&오프</h1>
            <p className="text-[9px] text-rose-500 font-black uppercase tracking-[0.2em] mt-1">Props & Time-off</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData(true)} disabled={isRefreshing} className={`size-10 rounded-full flex items-center justify-center bg-rose-500 text-white shadow-lg transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-95'}`}>
            <span className="material-symbols-outlined text-xl">refresh</span>
          </button>
        </div>
      </header>

      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between mt-2 mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="size-1.5 bg-rose-500 rounded-full"></span>
            월간 쉬는 날
          </h3>
          {myOffDayEntry ? (
            <button 
              onClick={() => {
                setOffDays(myOffDayEntry['쉬는날'] ? myOffDayEntry['쉬는날'].split(',').map((d:string)=>d.split('T')[0].trim()).filter(Boolean) : []);
                setEditItem(myOffDayEntry);
                setModalMode('OFF');
                setIsModalOpen(true);
              }}
              className="text-xs font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              내 일정 수정
            </button>
          ) : (
            <button 
              onClick={() => {
                setOffDays([]);
                setEditItem(null);
                setModalMode('OFF');
                setIsModalOpen(true);
              }}
              className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-rose-500/30"
            >
              쉬는 날 등록
            </button>
          )}
        </div>

        {offDaysByMonth.sortedMonths.length > 0 ? (
          <div className="space-y-6">
            {offDaysByMonth.sortedMonths.map(month => (
              <div key={month} className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm">
                <h4 className="text-sm font-black text-rose-500 mb-4 border-b border-rose-50 pb-2">{month}</h4>
                <div className="space-y-6">
                  {offDaysByMonth.grouped[month].map((branchGroup, bIdx) => (
                    <div key={bIdx} className="space-y-4">
                      <h5 className="text-sm font-bold text-[#0a1931] flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-400 text-sm">domain</span>
                        {branchGroup.branch}
                      </h5>
                      <div className="space-y-4 pl-2 border-l-2 border-rose-50">
                        {branchGroup.departments.map((deptGroup, dIdx) => (
                          <div key={dIdx} className="space-y-3">
                            <h6 className="text-xs font-bold text-gray-500 flex items-center gap-1.5 ml-2">
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              {deptGroup.department}
                            </h6>
                            <div className="grid gap-3 ml-2">
                              {deptGroup.persons.map((off: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-white flex items-center justify-center text-rose-400 shadow-sm border border-rose-100 shrink-0">
                                      <span className="material-symbols-outlined text-sm">event_busy</span>
                                    </div>
                                    <div>
                                      <p className="font-bold text-[#0a1931]">{off.name} 강사님</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap justify-end gap-1.5 max-w-[55%]">
                                    {off.dates.map((d: string, dIdx: number) => (
                                      <span key={dIdx} className="px-2 py-1 bg-white text-rose-600 text-[11px] font-bold rounded-md border border-rose-200 shadow-sm whitespace-nowrap">
                                        {d.substring(5).replace('-', '/')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <span className="material-symbols-outlined text-3xl text-gray-200 mb-2">event_available</span>
            <p className="text-gray-400 font-bold text-xs">등록된 쉬는 날이 없습니다.</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-8">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="size-1.5 bg-rose-500 rounded-full"></span>
            주간 교구 사용 내역
          </h3>
          <button 
            onClick={() => {
              setPropName('');
              setCourseName('');
              setNormalQuantity('');
              setBrokenQuantity('');
              setLostQuantity('');
              setWeek('');
              setEditItem(null);
              setModalMode('PROP');
              setIsModalOpen(true);
            }}
            className="text-xs font-bold text-white bg-[#0a1931] hover:bg-[#1a2941] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
          >
            교구 등록
          </button>
        </div>

        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-2 pb-2 mt-4">
          {['전체', '1주차', '2주차', '3주차', '4주차', '5주차'].map(w => (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedWeek === w ? 'bg-[#0a1931] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
            >
              {w}
            </button>
          ))}
        </div>

        {filteredPropsList.length > 0 ? (
          <div className="space-y-6">
            {groupedPropsList.map((branchGroup, bIdx) => (
              <div key={bIdx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-[#0a1931] flex items-center gap-2 border-b border-gray-50 pb-2">
                  <span className="material-symbols-outlined text-rose-500 text-sm">domain</span>
                  {branchGroup.branch}
                </h4>
                <div className="space-y-4 pl-2 border-l-2 border-gray-50">
                  {branchGroup.courses.map((courseGroup, cIdx) => (
                    <div key={cIdx} className="space-y-3">
                      <h5 className="text-xs font-bold text-gray-500 flex items-center gap-1.5 ml-2">
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        {courseGroup.course}
                      </h5>
                      <div className="grid gap-3 ml-2">
                        {courseGroup.persons.map((person: any, pIdx: number) => (
                          <div key={pIdx} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm">
                                <span className="material-symbols-outlined text-sm">inventory_2</span>
                              </div>
                              <div>
                                <p className="font-bold text-[#0a1931]">{person.name} 강사님</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {person.items.map((item: any, idx: number) => (
                                item['교구명'] && (
                                  <div key={idx} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative group">
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-sm text-gray-400 mt-0.5">extension</span>
                                        <div>
                                          <p className="text-xs font-bold text-gray-500">사용한 교구 {item['주차'] ? `(${item['주차']})` : ''}{item['수업명'] ? ` - ${item['수업명']}` : ''}</p>
                                          <p className="text-sm font-bold text-[#0a1931]">
                                            {item['교구명']} 
                                            {item['정상수량'] && (
                                              <span className="text-blue-500 ml-1">
                                                정상({item['정상수량']})
                                              </span>
                                            )}
                                            {item['파손수량'] && (
                                              <span className="text-red-500 ml-1">
                                                파손({item['파손수량']})
                                              </span>
                                            )}
                                            {item['분실수량'] && (
                                              <span className="text-orange-500 ml-1">
                                                분실({item['분실수량']})
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] text-gray-400 font-medium">
                                          {new Date(item['타임스탬프']).toLocaleDateString()}
                                        </span>
                                        {(String(userData?.name || '').trim() === String(item['이름'] || '').trim() || String(userData?.role || '').trim() === '관리자' || String(userData?.role || '').trim() === '부관리자') && (
                                          <button
                                            onClick={() => {
                                              setPropName(item['교구명'] || '');
                                              setCourseName(item['수업명'] || '');
                                              setNormalQuantity(item['정상수량'] || '');
                                              setBrokenQuantity(item['파손수량'] || '');
                                              setLostQuantity(item['분실수량'] || '');
                                              setWeek(item['주차'] || '');
                                              setEditItem(item);
                                              setModalMode('PROP');
                                              setIsModalOpen(true);
                                            }}
                                            className="p-1 text-gray-400 hover:text-[#0a1931] transition-colors rounded-lg hover:bg-gray-100"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2rem] p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black">
                {modalMode === 'PROP' ? (editItem ? '주간 교구 수정' : '주간 교구 등록') : (editItem ? '쉬는 날 수정' : '다음주 쉬는 날 등록')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-xl bg-gray-50 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {modalMode === 'PROP' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#0a1931] flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="material-symbols-outlined text-rose-500 text-lg">extension</span>
                    한 주 사용 교구
                  </h3>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 ml-1">주차 선택</label>
                    <div className="flex gap-2">
                      {['1주차', '2주차', '3주차', '4주차', '5주차'].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWeek(w)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${week === w ? 'bg-rose-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 ml-1">수업명</label>
                    <div className="flex gap-2">
                      {['음악', '전래', '체조', '인지', '노래'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCourseName(c)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${courseName === c ? 'bg-rose-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-500 ml-1">교구명</label>
                      <input 
                        value={propName} 
                        onChange={(e) => setPropName(e.target.value)} 
                        placeholder="예: 리듬막대" 
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 border-none outline-none font-bold text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition-all" 
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-blue-500 ml-1">정상 수량</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={normalQuantity} 
                          onChange={(e) => setNormalQuantity(e.target.value)} 
                          placeholder="0" 
                          className="w-full h-12 px-4 rounded-xl bg-blue-50/50 border-none outline-none font-bold text-sm text-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-red-500 ml-1">파손 수량</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={brokenQuantity} 
                          onChange={(e) => setBrokenQuantity(e.target.value)} 
                          placeholder="0" 
                          className="w-full h-12 px-4 rounded-xl bg-red-50/50 border-none outline-none font-bold text-sm text-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 transition-all" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-orange-500 ml-1">분실 수량</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={lostQuantity} 
                          onChange={(e) => setLostQuantity(e.target.value)} 
                          placeholder="0" 
                          className="w-full h-12 px-4 rounded-xl bg-orange-50/50 border-none outline-none font-bold text-sm text-orange-600 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalMode === 'OFF' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#0a1931] flex items-center gap-2 border-b border-gray-100 pb-2">
                    <span className="material-symbols-outlined text-rose-500 text-lg">event_busy</span>
                    다음주 쉬는 날 (5주차만 가능)
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 h-12 rounded-xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/20 transition-all overflow-hidden">
                        <input 
                          type="date"
                          onChange={handleAddOffDay}
                          className="w-full h-full px-4 bg-transparent border-none outline-none font-bold text-sm cursor-pointer" 
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleNoOffDay}
                        className={`h-12 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${offDays.includes('없음') ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        쉬는날 없음
                      </button>
                    </div>
                    
                    {offDays.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                        {offDays.map(date => (
                          <div key={date} className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-rose-200 shadow-sm">
                            <span className="text-xs font-bold text-rose-600">{date}</span>
                            <button type="button" onClick={() => removeOffDay(date)} className="flex items-center justify-center text-gray-400 hover:text-rose-500">
                              <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-500 font-medium bg-rose-50/50 p-2 rounded-lg">
                    ※ 일정은 센터와 합의 하셔야 합니다.
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full h-14 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-500/30 active:scale-[0.98] disabled:opacity-50 transition-all mt-4">
                {loading ? (editItem ? "수정 중..." : "등록 중...") : (editItem ? "수정하기" : "등록하기")}
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

export default PropsOffPage;
