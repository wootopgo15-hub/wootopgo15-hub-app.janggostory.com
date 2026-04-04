import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, getCachedSheetData } from '../services/googleSheets';
import html2canvas from 'html2canvas';

const SalaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userData, setUserData] = useState<any>(null);
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>({});
  const [additionals, setAdditionals] = useState<Record<string, number>>({});
  const [batchUnitPrice, setBatchUnitPrice] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isInstructorFeeModalOpen, setIsInstructorFeeModalOpen] = useState(false);
  const [isResidentNumberModalOpen, setIsResidentNumberModalOpen] = useState(false);
  const [residentNumbers, setResidentNumbers] = useState<Record<string, string>>({});
  const [savingResidentNumber, setSavingResidentNumber] = useState<string | null>(null);
  const [instructorPositions, setInstructorPositions] = useState<Record<string, string>>({});
  const [instructorNotes, setInstructorNotes] = useState<Record<string, string>>({});
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportRes, userRes] = await Promise.all([
        fetchSheetData('REPORT', true),
        fetchSheetData('USER', true)
      ]);
      setReportData(reportRes);
      setAllUsers(userRes);
    } catch (error) {
      console.error('Failed to load data for salary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      setUserData(JSON.parse(savedData));
    }

    const cached = getCachedSheetData('REPORT');
    if (cached && cached.length > 0) {
      setReportData(cached);
    }

    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
  };

  // Load saved unit prices and additionals when month changes
  useEffect(() => {
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    
    const savedUnitPrices = localStorage.getItem(`salary_unit_prices_${monthKey}`);
    if (savedUnitPrices) {
      try { setUnitPrices(JSON.parse(savedUnitPrices)); } catch (e) { setUnitPrices({}); }
    } else {
      setUnitPrices({});
    }

    const savedAdditionals = localStorage.getItem(`salary_additionals_${monthKey}`);
    if (savedAdditionals) {
      try { setAdditionals(JSON.parse(savedAdditionals)); } catch (e) { setAdditionals({}); }
    } else {
      setAdditionals({});
    }
  }, [currentDate]);

  const handleUnitPriceChange = (key: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    const newUnitPrices = { ...unitPrices, [key]: numValue };
    setUnitPrices(newUnitPrices);
    
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    localStorage.setItem(`salary_unit_prices_${monthKey}`, JSON.stringify(newUnitPrices));
  };

  const handleAdditionalChange = (key: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
    const newAdditionals = { ...additionals, [key]: numValue };
    setAdditionals(newAdditionals);
    
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    localStorage.setItem(`salary_additionals_${monthKey}`, JSON.stringify(newAdditionals));
  };

  const handleBatchApply = () => {
    const unitPrice = parseInt(batchUnitPrice.replace(/[^0-9]/g, ''), 10) || 0;
    if (unitPrice === 0) return;

    const newUnitPrices = { ...unitPrices };
    statsByBranch.forEach(({ branch, rows }) => {
      rows.forEach(row => {
        const key = `${branch}_${row.subject}_${row.name}`;
        newUnitPrices[key] = unitPrice;
      });
    });
    setUnitPrices(newUnitPrices);
    
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    localStorage.setItem(`salary_unit_prices_${monthKey}`, JSON.stringify(newUnitPrices));
    setBatchUnitPrice('');
  };

  const statsByBranch = useMemo(() => {
    const map = new Map<string, Map<string, { branch: string; subjects: Set<string>; name: string; count: number }>>();

    if (!userData) return [];

    const userRole = String(userData.role).trim();
    const userBranch = String(userData.branch).trim();

    const filteredData = reportData.filter(row => {
      if (userRole === '관리자') return true;
      if (userRole === '부관리자') {
        return String(row['지사'] || '').trim() === userBranch;
      }
      return false; // 일반 강사는 접근 불가 (App.tsx 라우팅에서 막히거나 여기서 빈 배열 반환)
    });
    
    filteredData.forEach(row => {
      const branch = String(row['지사'] || '미지정').trim();
      const name = String(row['이름'] || '').trim();
      const subject = String(row['과목'] || '').trim();
      const dateVal = row['날짜'] || row['타임스탬프'];
      
      if (!name || !subject) return;

      let isCurrentMonth = false;
      if (dateVal) {
        try {
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

      if (isCurrentMonth) {
        if (!map.has(branch)) map.set(branch, new Map());
        const branchMap = map.get(branch)!;
        const key = name;
        
        if (!branchMap.has(key)) {
          branchMap.set(key, { branch, subjects: new Set([subject]), name, count: 0 });
        } else {
          branchMap.get(key)!.subjects.add(subject);
        }
        branchMap.get(key)!.count += 1;
      }
    });

    return Array.from(map.entries()).map(([branch, branchMap]) => {
      return {
        branch,
        rows: Array.from(branchMap.values()).map(row => {
          const cleanName = row.name.trim();
          const cleanBranch = row.branch.trim();
          
          let matchedUsers = allUsers.filter(u => 
            String(u['이름'] || '').trim() === cleanName && 
            String(u['지사'] || '').trim() === cleanBranch
          );
          
          if (matchedUsers.length === 0) {
            matchedUsers = allUsers.filter(u => String(u['이름'] || '').trim() === cleanName);
          }

          const user = matchedUsers[0];
          let joinDate = '-';
          if (user && user['입사일']) {
            const rawDate = String(user['입사일']).trim();
            if (rawDate) {
              try {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                  joinDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                } else {
                  joinDate = rawDate;
                }
              } catch (e) {
                joinDate = rawDate;
              }
            }
          }

          return {
            branch: row.branch,
            name: row.name,
            subject: Array.from(row.subjects).join('/'),
            count: row.count,
            joinDate
          };
        }).sort((a, b) => a.subject.localeCompare(b.subject) || a.name.localeCompare(b.name))
      };
    }).sort((a, b) => a.branch.localeCompare(b.branch));
  }, [reportData, currentDate, userData, allUsers]);

  // Calculate totals
  const totalsByBranch = useMemo(() => {
    const branchTotals: Record<string, any> = {};
    let grandTotal = { count: 0, principal: 0, additional: 0, tax3: 0, tax03: 0, payment: 0 };

    statsByBranch.forEach(({ branch, rows }) => {
      let bCount = 0, bPrincipal = 0, bAdditional = 0, bTax3 = 0, bTax03 = 0, bPayment = 0;

      rows.forEach(row => {
        const key = `${branch}_${row.subject}_${row.name}`;
        const unitPrice = unitPrices[key] || 0;
        const principal = unitPrice * row.count;
        const additional = additionals[key] || 0;
        const totalIncome = principal + additional;
        
        const tax3 = Math.floor(totalIncome * 0.03);
        const tax03 = Math.floor(totalIncome * 0.003);
        const payment = totalIncome - tax3 - tax03;

        bCount += row.count;
        bPrincipal += principal;
        bAdditional += additional;
        bTax3 += tax3;
        bTax03 += tax03;
        bPayment += payment;
      });

      branchTotals[branch] = { count: bCount, principal: bPrincipal, additional: bAdditional, tax3: bTax3, tax03: bTax03, payment: bPayment };

      grandTotal.count += bCount;
      grandTotal.principal += bPrincipal;
      grandTotal.additional += bAdditional;
      grandTotal.tax3 += bTax3;
      grandTotal.tax03 += bTax03;
      grandTotal.payment += bPayment;
    });

    return { branchTotals, grandTotal };
  }, [statsByBranch, unitPrices, additionals]);

  useEffect(() => {
    if (statsByBranch.length > 0 && !statsByBranch.find(b => b.branch === selectedBranch)) {
      setSelectedBranch(statsByBranch[0].branch);
    }
  }, [statsByBranch, selectedBranch]);

  useEffect(() => {
    if (isResidentNumberModalOpen) {
      const initialNumbers: Record<string, string> = {};
      statsByBranch.forEach(({ branch, rows }) => {
        rows.forEach(row => {
          const cleanName = row.name.trim();
          const cleanBranch = branch.trim();
          
          let matchedUsers = allUsers.filter(u => 
            String(u['이름'] || '').trim() === cleanName && 
            String(u['지사'] || '').trim() === cleanBranch
          );
          
          if (matchedUsers.length === 0) {
            matchedUsers = allUsers.filter(u => String(u['이름'] || '').trim() === cleanName);
          }

          const user = matchedUsers[0];
          const resNum = user ? String(user['주민번호'] || user['주민등록번호'] || '').trim() : '';
          initialNumbers[`${branch}_${row.name}`] = resNum;
        });
      });
      setResidentNumbers(initialNumbers);
    }
  }, [isResidentNumberModalOpen, statsByBranch, allUsers]);

  const handleSaveResidentNumber = async (branch: string, name: string) => {
    const key = `${branch}_${name}`;
    const resNum = residentNumbers[key] || '';
    
    setSavingResidentNumber(key);
    try {
      const { submitToGoogleSheets } = await import('../services/googleSheets');
      await submitToGoogleSheets({
        mode: 'UPDATE_USER_BY_NAME',
        type: 'USER',
        '이름': name,
        '지사': branch,
        '주민번호': resNum
      });
      
      // Update allUsers locally to reflect the change immediately
      setAllUsers(prev => prev.map(u => {
        if (String(u['이름'] || '').trim() === name && (String(u['지사'] || '').trim() === branch || !u['지사'])) {
          return { ...u, '주민번호': resNum };
        }
        return u;
      }));
      
      alert(`${name} 강사님의 주민번호가 저장되었습니다.`);
    } catch (error) {
      console.error('Failed to save resident number:', error);
      alert('주민번호 저장에 실패했습니다.');
    } finally {
      setSavingResidentNumber(null);
    }
  };

  const handleTaxReportOutput = async () => {
    try {
      const userTotals = new Map<string, { name: string; totalIncome: number; residentNumber: string }>();
      
      statsByBranch.forEach(({ branch, rows }) => {
        if (selectedBranch && branch !== selectedBranch) return;

        rows.forEach(row => {
          const key = `${branch}_${row.subject}_${row.name}`;
          const unitPrice = unitPrices[key] || 0;
          const principal = unitPrice * row.count;
          const additional = additionals[key] || 0;
          const totalIncome = principal + additional;
          
          if (totalIncome === 0) return; // Skip 0 income

          const userKey = `${branch}_${row.name}`;
          
          if (!userTotals.has(userKey)) {
            // Find user in allUsers (first try exact match with branch, then fallback to name only)
            const cleanName = row.name.trim();
            const cleanBranch = branch.trim();
            
            let matchedUsers = allUsers.filter(u => 
              String(u['이름'] || '').trim() === cleanName && 
              String(u['지사'] || '').trim() === cleanBranch
            );
            
            if (matchedUsers.length === 0) {
              matchedUsers = allUsers.filter(u => String(u['이름'] || '').trim() === cleanName);
            }

            const userWithResNum = matchedUsers.find(u => String(u['주민번호'] || u['주민등록번호'] || '').trim() !== '');
            const user = userWithResNum || matchedUsers[0];
            
            const residentNumber = user ? (String(user['주민번호'] || user['주민등록번호'] || '').trim() || '주민번호 없음') : '주민번호 없음';
            
            userTotals.set(userKey, {
              name: row.name,
              totalIncome: 0,
              residentNumber
            });
          }
          
          const userData = userTotals.get(userKey)!;
          userData.totalIncome += totalIncome;
        });
      });

      let outputText = '';
      userTotals.forEach(userData => {
        outputText += `${userData.name} ${userData.totalIncome.toLocaleString('ko-KR')} ${userData.residentNumber}\n`;
      });

      if (!outputText) {
        alert('출력할 데이터가 없습니다.');
        return;
      }

      await navigator.clipboard.writeText(outputText.trim());
      alert('세무사 출력 데이터가 클립보드에 복사되었습니다. 카카오톡에 붙여넣기 하세요.');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  const handleDownloadJpg = async () => {
    const elements = document.querySelectorAll('.statement-card');
    if (elements.length === 0) {
      alert('출력할 명세서가 없습니다.');
      return;
    }

    setIsGeneratingPreview(true);

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;
      const name = el.getAttribute('data-name') || '이름없음';
      const subject = el.getAttribute('data-subject') || '과목없음';
      const branch = el.getAttribute('data-branch') || '지사없음';
      
      // Clone the element to render it properly without modal scroll constraints
      const clone = el.cloneNode(true) as HTMLElement;
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.width = '1000px'; // Increased width for more spacious look
      wrapper.style.backgroundColor = '#ffffff';
      
      // Ensure the clone expands fully
      clone.style.padding = '56px'; // Generous padding
      clone.style.height = 'max-content';
      clone.style.overflow = 'visible';
      clone.style.boxSizing = 'border-box';
      
      // Copy select values to the clone
      const originalSelects = el.querySelectorAll('select');
      const clonedSelects = clone.querySelectorAll('select');
      originalSelects.forEach((select, index) => {
        const div = document.createElement('div');
        div.textContent = select.value;
        div.className = select.className;
        div.style.display = 'block';
        clonedSelects[index].parentNode?.replaceChild(div, clonedSelects[index]);
      });

      // Copy input values to the clone
      const originalInputs = el.querySelectorAll('input');
      const clonedInputs = clone.querySelectorAll('input');
      originalInputs.forEach((input, index) => {
        const div = document.createElement('div');
        div.textContent = input.value;
        div.className = input.className;
        div.style.display = 'block';
        clonedInputs[index].parentNode?.replaceChild(div, clonedInputs[index]);
      });

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      try {
        const canvas = await html2canvas(clone, { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const link = document.createElement('a');
        link.download = `${name}_${subject}_${branch}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Failed to generate JPG:', error);
      } finally {
        document.body.removeChild(wrapper);
      }
    }
    
    setIsGeneratingPreview(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pb-24 font-sans">
      <header className="px-4 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="size-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">급여관리</h1>
            <p className="text-[8px] text-teal-500 font-black uppercase tracking-[0.2em] mt-1">Salary Management</p>
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

      <div className="p-4 sm:p-6 space-y-4">
        {/* 기준일 선택 */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold flex items-center gap-2 text-[#0a1931]">
            <span className="material-symbols-outlined text-teal-500 text-lg">calendar_month</span>
            기준일
          </h3>
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="text-gray-400 hover:text-teal-500 transition-colors flex items-center">
              <span className="material-symbols-outlined text-sm">arrow_back_ios_new</span>
            </button>
            <span className="text-sm font-black w-16 text-center text-[#0a1931]">
              {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="text-gray-400 hover:text-teal-500 transition-colors flex items-center">
              <span className="material-symbols-outlined text-sm">arrow_forward_ios</span>
            </button>
          </div>
        </div>

        {/* 일괄 입력 */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold flex items-center gap-2 text-[#0a1931]">
            <span className="material-symbols-outlined text-teal-500 text-lg">calculate</span>
            단가 일괄 적용
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={batchUnitPrice}
              onChange={(e) => {
                const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                setBatchUnitPrice(val ? formatCurrency(val) : '');
              }}
              placeholder="1회 단가 입력"
              className="w-32 text-right bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            />
            <button
              onClick={handleBatchApply}
              className="px-4 py-1.5 bg-teal-500 text-white text-sm font-bold rounded-lg hover:bg-teal-600 active:scale-95 transition-all"
            >
              적용
            </button>
          </div>
        </div>

        {/* 세무사 출력 버튼 */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-white border-2 border-gray-200 text-[#0a1931] text-base font-bold rounded-xl pl-6 pr-10 py-3 focus:outline-none focus:border-[#0a1931] focus:ring-4 focus:ring-[#0a1931]/10 shadow-sm transition-all cursor-pointer hover:border-gray-300"
            >
              {statsByBranch.map(({ branch }) => (
                <option key={branch} value={branch}>{branch} 지사</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsResidentNumberModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-500/20 border-2 border-amber-500"
            >
              <span className="material-symbols-outlined text-lg">badge</span>
              주민번호 입력
            </button>
            <button
              onClick={() => setIsInstructorFeeModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 border-2 border-indigo-600"
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              강사료 출력
            </button>
            <button
              onClick={handleTaxReportOutput}
              className="flex items-center gap-2 px-7 py-3 bg-[#0a1931] text-white text-base font-bold rounded-xl hover:bg-[#1a2941] active:scale-95 transition-all shadow-md shadow-[#0a1931]/20 border-2 border-[#0a1931]"
            >
              <span className="material-symbols-outlined text-xl">content_copy</span>
              세무사 출력 (카톡 복사)
            </button>
          </div>
        </div>

        {/* 급여 테이블 (지사별) */}
        {statsByBranch.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400 font-medium">
            해당 월의 수업 데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-6">
            {statsByBranch.map(({ branch, rows }) => {
              const bTotals = totalsByBranch.branchTotals[branch];
              return (
                <div key={branch} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-teal-50/50 px-4 py-3 border-b border-teal-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">domain</span>
                    <h3 className="font-black text-[#0a1931]">{branch} 지사</h3>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-bold text-center">과목</th>
                          <th className="px-4 py-3 font-bold text-center">입사일</th>
                          <th className="px-4 py-3 font-bold text-center">이름</th>
                          <th className="px-4 py-3 font-bold text-center">건수</th>
                          <th className="px-4 py-3 font-bold text-right">단가</th>
                          <th className="px-4 py-3 font-bold text-right">합계(세전)</th>
                          <th className="px-4 py-3 font-bold text-right">추가금</th>
                          <th className="px-4 py-3 font-bold text-right">원천세 3%</th>
                          <th className="px-4 py-3 font-bold text-right">지방소득세 0.3%</th>
                          <th className="px-4 py-3 font-bold text-right text-teal-600">강사지급</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map((row) => {
                          const key = `${branch}_${row.subject}_${row.name}`;
                          const unitPrice = unitPrices[key] || 0;
                          const principal = unitPrice * row.count;
                          const additional = additionals[key] || 0;
                          const totalIncome = principal + additional;
                          
                          const tax3 = Math.floor(totalIncome * 0.03);
                          const tax03 = Math.floor(totalIncome * 0.003);
                          const payment = totalIncome - tax3 - tax03;

                          return (
                            <tr key={key} className="hover:bg-teal-50/30 transition-colors">
                              <td className="px-4 py-3 text-center font-medium text-gray-600">{row.subject}</td>
                              <td className="px-4 py-3 text-center font-medium text-gray-500">{row.joinDate}</td>
                              <td className="px-4 py-3 text-center font-bold text-[#0a1931]">{row.name}</td>
                              <td className="px-4 py-3 text-center font-black text-blue-500">{row.count}</td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="text"
                                  value={unitPrice === 0 ? '' : formatCurrency(unitPrice)}
                                  onChange={(e) => handleUnitPriceChange(key, e.target.value)}
                                  placeholder="0"
                                  className="w-24 text-right bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-gray-700">{formatCurrency(totalIncome)}</td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="text"
                                  value={additional === 0 ? '' : formatCurrency(additional)}
                                  onChange={(e) => handleAdditionalChange(key, e.target.value)}
                                  placeholder="0"
                                  className="w-24 text-right bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-rose-500">{formatCurrency(tax3)}</td>
                              <td className="px-4 py-3 text-right font-medium text-orange-500">{formatCurrency(tax03)}</td>
                              <td className="px-4 py-3 text-right font-black text-teal-600">{formatCurrency(payment)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center font-black text-[#0a1931]">지사 소계</td>
                          <td className="px-4 py-4 text-center font-black text-blue-600">{bTotals.count}</td>
                          <td className="px-4 py-4 text-center font-black text-gray-400">-</td>
                          <td className="px-4 py-4 text-right font-black text-[#0a1931]">{formatCurrency(bTotals.principal + bTotals.additional)}</td>
                          <td className="px-4 py-4 text-right font-black text-[#0a1931]">{formatCurrency(bTotals.additional)}</td>
                          <td className="px-4 py-4 text-right font-black text-rose-600">{formatCurrency(bTotals.tax3)}</td>
                          <td className="px-4 py-4 text-right font-black text-orange-600">{formatCurrency(bTotals.tax03)}</td>
                          <td className="px-4 py-4 text-right font-black text-teal-600 text-base">{formatCurrency(bTotals.payment)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* 관리자용 전체 총계 */}
            {userData?.role === '관리자' && statsByBranch.length > 1 && (
              <div className="bg-[#0a1931] rounded-2xl shadow-lg border border-gray-800 overflow-hidden text-white mt-8">
                <div className="bg-white/10 px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">account_balance</span>
                  <h3 className="font-black">전체 지사 총계</h3>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold mb-1">총 건수</span>
                    <span className="text-lg font-black text-blue-400">{totalsByBranch.grandTotal.count}건</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold mb-1">총 합계(세전)</span>
                    <span className="text-lg font-black">{formatCurrency(totalsByBranch.grandTotal.principal + totalsByBranch.grandTotal.additional)}원</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold mb-1">총 추가금</span>
                    <span className="text-lg font-black">{formatCurrency(totalsByBranch.grandTotal.additional)}원</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold mb-1">총 원천세 (3%)</span>
                    <span className="text-lg font-black text-rose-400">{formatCurrency(totalsByBranch.grandTotal.tax3)}원</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold mb-1">총 지방소득세 (0.3%)</span>
                    <span className="text-lg font-black text-orange-400">{formatCurrency(totalsByBranch.grandTotal.tax03)}원</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-teal-400 font-bold mb-1">총 강사지급액</span>
                    <span className="text-xl font-black text-teal-400">{formatCurrency(totalsByBranch.grandTotal.payment)}원</span>
                  </div>
                </div>

                {/* 지사별 총계 요약 */}
                <div className="bg-white/5 border-t border-white/10 p-4 sm:p-6">
                  <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">list_alt</span>
                    지사별 요약
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {statsByBranch.map(({ branch }) => {
                      const bTotals = totalsByBranch.branchTotals[branch];
                      return (
                        <div key={branch} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                          <div className="font-black text-teal-400 mb-3 text-lg">{branch} 지사 총계</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">총 건수</span>
                              <span className="font-bold text-blue-300">{bTotals.count}건</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">총 합계(세전)</span>
                              <span className="font-medium">{formatCurrency(bTotals.principal + bTotals.additional)}원</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">총 추가금</span>
                              <span className="font-medium">{formatCurrency(bTotals.additional)}원</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                              <span className="text-gray-400">총 세금</span>
                              <span className="font-medium text-rose-300">{formatCurrency(bTotals.tax3 + bTotals.tax03)}원</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-teal-400 font-bold">강사지급액</span>
                              <span className="font-black text-teal-300">{formatCurrency(bTotals.payment)}원</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* 강사료 지급 명세서 모달 */}
      {/* 주민번호 입력 모달 */}
      {isResidentNumberModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600">badge</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#0a1931] tracking-tight">주민번호 입력 및 확인</h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">이번 달 급여 대상자의 주민번호를 확인하고 입력하세요.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsResidentNumberModalOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
              <div className="space-y-6">
                {statsByBranch.map(({ branch, rows }) => {
                  if (selectedBranch && branch !== selectedBranch) return null;
                  
                  // Deduplicate rows by name within the branch
                  const uniqueInstructors = Array.from(new Set(rows.map(r => r.name))).map(name => {
                    return rows.find(r => r.name === name)!;
                  });

                  return (
                    <div key={branch} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600 text-sm">domain</span>
                        <h3 className="font-bold text-[#0a1931] text-sm">{branch} 지사</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {uniqueInstructors.map((row) => {
                          const key = `${branch}_${row.name}`;
                          const resNum = residentNumbers[key] || '';
                          const isMissing = !resNum;
                          const isSaving = savingResidentNumber === key;

                          return (
                            <div key={key} className={`p-4 flex items-center justify-between gap-4 transition-colors ${isMissing ? 'bg-red-50/30' : 'hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-3 min-w-[120px]">
                                <div className={`w-2 h-2 rounded-full ${isMissing ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <span className="font-bold text-[#0a1931]">{row.name}</span>
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={resNum}
                                  onChange={(e) => setResidentNumbers(prev => ({ ...prev, [key]: e.target.value }))}
                                  placeholder="주민번호 (예: 900101-1234567)"
                                  className={`flex-1 bg-white border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                                    isMissing 
                                      ? 'border-red-200 focus:border-red-500 focus:ring-red-500/20 placeholder:text-red-300' 
                                      : 'border-gray-200 focus:border-amber-500 focus:ring-amber-500/20'
                                  }`}
                                />
                                <button
                                  onClick={() => handleSaveResidentNumber(branch, row.name)}
                                  disabled={isSaving}
                                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1 min-w-[80px] justify-center ${
                                    isMissing
                                      ? 'bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow-sm shadow-red-500/20'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                                  } disabled:opacity-50`}
                                >
                                  {isSaving ? (
                                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-sm">save</span>
                                      저장
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {isInstructorFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h2 className="text-lg font-black text-[#0a1931] flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">receipt_long</span>
                강사료 지급 명세서
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadJpg}
                  disabled={isGeneratingPreview}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPreview ? (
                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span className="material-symbols-outlined text-sm">download</span>
                  )}
                  {isGeneratingPreview ? '저장중...' : 'JPG 저장'}
                </button>
                <button
                  onClick={() => setIsInstructorFeeModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-100" id="instructor-fee-print-area">
              <div className="space-y-8">
                {statsByBranch
                  .filter(({ branch }) => branch === selectedBranch)
                  .map(({ branch, rows }) => {
                    return rows.map((row) => {
                      const key = `${branch}_${row.subject}_${row.name}`;
                      const unitPrice = unitPrices[key] || 0;
                      const principal = unitPrice * row.count;
                      const additional = additionals[key] || 0;
                      const totalIncome = principal + additional;
                      
                      if (totalIncome === 0) return null;

                      const tax3 = Math.floor(totalIncome * 0.03);
                      const tax03 = Math.floor(totalIncome * 0.003);
                      const payment = totalIncome - tax3 - tax03;
                      
                      const position = instructorPositions[key] || '강사';

                      // Find detailed class records for this instructor
                      const instructorClasses = reportData.filter(r => {
                        if (String(r['이름'] || '').trim() !== row.name) return false;
                        if (String(r['지사'] || '').trim() !== branch) return false;
                        
                        const rSubject = String(r['과목'] || '').trim();
                        if (!row.subject.split('/').includes(rSubject)) return false;

                        const dateVal = r['날짜'] || r['타임스탬프'];
                        if (!dateVal) return false;

                        try {
                          let dateObj: Date;
                          const match = String(dateVal).match(/(\d{4})[./-년]\s?(\d{1,2})[./-월]\s?(\d{1,2})/);
                          if (match) {
                            dateObj = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                          } else {
                            dateObj = new Date(dateVal);
                          }

                          return !isNaN(dateObj.getTime()) && 
                                 dateObj.getFullYear() === currentDate.getFullYear() && 
                                 dateObj.getMonth() === currentDate.getMonth();
                        } catch (e) {
                          return false;
                        }
                      });

                      // Group by center
                      const centerGroups = instructorClasses.reduce((acc, cls) => {
                        const centerName = String(cls['센터'] || '').trim();
                        if (!centerName) return acc;
                        if (!acc[centerName]) {
                          acc[centerName] = {
                            count: 0,
                            notes: []
                          };
                        }
                        acc[centerName].count += 1;
                        if (cls['비고']) {
                          acc[centerName].notes.push(cls['비고']);
                        }
                        return acc;
                      }, {} as Record<string, { count: number, notes: string[] }>);

                      const uniqueCenters = Object.entries(centerGroups).map(([name, data]) => ({
                        name,
                        count: data.count,
                        note: Array.from(new Set(data.notes)).join(', ')
                      }));

                      let totalPositiveDiff = 0;
                      let totalNegativeDiff = 0;
                      uniqueCenters.forEach(center => {
                        let diff = center.count - 4;
                        if (center.count === 1 || center.count === 2) {
                          diff = center.count;
                        }
                        if (diff > 0) totalPositiveDiff += diff;
                        if (diff < 0) totalNegativeDiff += Math.abs(diff);
                      });

                      return (
                        <div 
                          key={key} 
                          className="statement-card bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:mb-4 page-break-after-always"
                          data-name={row.name}
                          data-subject={row.subject}
                          data-branch={branch}
                        >
                          <div className="text-center mb-8">
                            <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-widest">강사료 지급 명세서</h1>
                            <p className="text-lg font-bold text-gray-600">
                              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                            </p>
                          </div>

                          <div className="flex justify-between items-end mb-6">
                            <table className="w-[55%] border-collapse border border-gray-300 text-sm">
                              <tbody>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-4 text-left w-24 align-middle leading-none">성명</th>
                                  <td className="border border-gray-300 px-4 py-4 font-bold align-middle text-base leading-none">{row.name}</td>
                                </tr>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-4 text-left align-middle leading-none">지사</th>
                                  <td className="border border-gray-300 px-4 py-4 align-middle text-base leading-none">{branch}</td>
                                </tr>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-4 text-left align-middle leading-none">과목</th>
                                  <td className="border border-gray-300 px-4 py-4 align-middle text-base leading-none">{row.subject}</td>
                                </tr>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-4 text-left align-middle leading-none">직급</th>
                                  <td className="border border-gray-300 px-4 py-4 align-middle text-base leading-none">
                                    <select 
                                      value={position}
                                      onChange={(e) => setInstructorPositions({...instructorPositions, [key]: e.target.value})}
                                      className="w-full bg-transparent border-none focus:ring-0 p-0 font-bold text-gray-900 cursor-pointer print:appearance-none"
                                    >
                                      <option value="강사">강사</option>
                                      <option value="신입강사">신입강사</option>
                                      <option value="수석강사">수석강사</option>
                                      <option value="팀장">팀장</option>
                                    </select>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-3 py-3 text-center w-16 align-middle leading-none">번호</th>
                                <th className="border border-gray-300 px-3 py-3 text-center align-middle leading-none">센터명</th>
                                <th className="border border-gray-300 px-3 py-3 text-center w-16 align-middle leading-none">구분</th>
                                <th className="border border-gray-300 px-3 py-3 text-center w-20 align-middle leading-none">차이</th>
                                <th className="border border-gray-300 px-3 py-3 text-center w-32 align-middle leading-none">비고</th>
                              </tr>
                            </thead>
                            <tbody>
                              {uniqueCenters.map((center, idx) => {
                                let diff = center.count - 4;
                                if (center.count === 1 || center.count === 2) {
                                  diff = center.count;
                                }
                                return (
                                  <tr key={idx}>
                                    <td className="border border-gray-300 px-3 py-3 text-center align-middle leading-none">{idx + 1}</td>
                                    <td className="border border-gray-300 p-0 align-middle leading-none">
                                      <input defaultValue={center.name} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 text-gray-900 outline-none text-left" />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-middle leading-none">
                                      <input defaultValue={center.count} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 text-gray-900 outline-none text-center" />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-middle leading-none">
                                      <input defaultValue={diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0'} className={`w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 outline-none text-center font-bold ${diff > 0 ? 'text-blue-600' : diff < 0 ? 'text-red-600' : 'text-gray-900'}`} />
                                    </td>
                                    <td className="border border-gray-300 p-0 align-middle leading-none">
                                      <input defaultValue={center.note} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 text-gray-900 outline-none text-left" placeholder="비고 입력" />
                                    </td>
                                  </tr>
                                );
                              })}
                              {uniqueCenters.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="border border-gray-300 px-3 py-4 text-center text-gray-500 align-middle leading-none">수업 내역이 없습니다.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          <table className="w-full border-collapse border border-gray-300 text-sm mb-6">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-3 py-3 text-center align-middle leading-none">추가금</th>
                                <th className="border border-gray-300 px-3 py-3 text-center align-middle leading-none">휴강</th>
                                <th className="border border-gray-300 px-3 py-3 text-center align-middle leading-none">5주차/대타</th>
                                <th className="border border-gray-300 px-3 py-3 text-center align-middle leading-none">비고</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-gray-300 p-0 align-middle leading-none">
                                  <input defaultValue={additional > 0 ? formatCurrency(additional) : ''} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 text-gray-900 outline-none text-right" />
                                </td>
                                <td className="border border-gray-300 p-0 align-middle leading-none">
                                  <input defaultValue={totalNegativeDiff > 0 ? totalNegativeDiff : ''} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 outline-none text-center text-red-600 font-bold" />
                                </td>
                                <td className="border border-gray-300 p-0 align-middle leading-none">
                                  <input defaultValue={totalPositiveDiff > 0 ? totalPositiveDiff : ''} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 outline-none text-center text-blue-600 font-bold" />
                                </td>
                                <td className="border border-gray-300 p-0 align-middle leading-none">
                                  <input
                                    type="text"
                                    value={instructorNotes[key] || ''}
                                    onChange={(e) => setInstructorNotes({...instructorNotes, [key]: e.target.value})}
                                    className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-3 py-3 text-gray-900 placeholder-gray-300 outline-none print:placeholder-transparent"
                                    placeholder="비고 입력"
                                  />
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          <div className="flex justify-end">
                            <table className="w-1/2 border-collapse border border-gray-300 text-sm">
                              <tbody>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left w-32 align-middle leading-none">수업시간</th>
                                  <td className="border border-gray-300 p-0 align-middle leading-none">
                                    <input defaultValue={row.count} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-4 py-3 text-gray-900 outline-none text-right font-bold" />
                                  </td>
                                </tr>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left align-middle leading-none">확인</th>
                                  <td className="border border-gray-300 p-0 align-middle leading-none">
                                    <input defaultValue="" className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-4 py-3 text-gray-900 outline-none text-right" />
                                  </td>
                                </tr>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left align-middle leading-none">세전</th>
                                  <td className="border border-gray-300 p-0 align-middle leading-none">
                                    <input defaultValue={formatCurrency(totalIncome)} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-4 py-3 outline-none text-right font-bold text-blue-600" />
                                  </td>
                                </tr>
                                <tr>
                                  <th className="border border-gray-300 bg-gray-100 px-4 py-3 text-left align-middle leading-none">세후</th>
                                  <td className="border border-gray-300 p-0 align-middle leading-none">
                                    <input defaultValue={formatCurrency(payment)} className="w-full h-full min-h-[42px] bg-transparent border-none focus:ring-0 px-4 py-3 outline-none text-right font-black text-teal-600 text-lg" />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryPage;
