
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

type ViewMode = 'MENU' | 'LIST' | 'DETAIL' | 'WRITE' | 'TEST_FORM' | 'TEST_RUN' | 'TEST_RESULT';

const ForumPage: React.FC<Props> = ({ title = "소통방", type = "FORUM", icon = "forum", color = "emerald-500" }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('MENU');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataList, setDataList] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  
  // Form states
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dementia Test States
  const [testPatientName, setTestPatientName] = useState('');
  const [testPatientGender, setTestPatientGender] = useState('남성');
  const [testPatientBirth, setTestPatientBirth] = useState('');
  const [testCurrentQuestion, setTestCurrentQuestion] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testResult, setTestResult] = useState('');

  const dementiaQuestions = [
    { q: "올해는 몇 년도입니까?", type: "input", answer: new Date().getFullYear().toString() },
    { q: "지금은 무슨 계절입니까?", type: "choice", options: ["봄", "여름", "가을", "겨울"] },
    { q: "오늘은 몇 월입니까?", type: "input", answer: (new Date().getMonth() + 1).toString() },
    { q: "오늘은 며칠입니까?", type: "input", answer: new Date().getDate().toString() },
    { q: "오늘은 무슨 요일입니까?", type: "choice", options: ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"] },
    { q: "우리가 있는 이곳은 무슨 시/도 입니까?", type: "input", answer: "예: 서울특별시, 경기도" },
    { q: "이곳은 무슨 구/군 입니까?", type: "input", answer: "예: 강남구, 분당구" },
    { q: "이곳은 무슨 동/읍/면 입니까?", type: "input", answer: "예: 역삼동, 조천읍" },
    { q: "이곳은 어떤 장소입니까? (예: 병원, 집, 복지관)", type: "input" },
    { q: "이 장소는 몇 층입니까? (또는 방 이름)", type: "input" },
    { q: "제가 지금 세 가지 물건 이름을 말씀드리겠습니다. 듣고 따라해 보세요. '비행기, 연필, 소나무'", type: "choice", options: ["3개 모두 기억함 (3점)", "2개 기억함 (2점)", "1개 기억함 (1점)", "기억 못함 (0점)"], scores: [3, 2, 1, 0] },
    { q: "100에서 7을 빼면 얼마입니까?", type: "input", answer: "93" },
    { q: "거기서 또 7을 빼면 얼마입니까?", type: "input", answer: "86" },
    { q: "거기서 또 7을 빼면 얼마입니까?", type: "input", answer: "79" },
    { q: "거기서 또 7을 빼면 얼마입니까?", type: "input", answer: "72" },
    { q: "거기서 또 7을 빼면 얼마입니까?", type: "input", answer: "65" },
    { q: "아까 제가 말씀드린 세 가지 물건 이름이 무엇인지 다시 말씀해 보세요.", type: "choice", options: ["3개 모두 기억함 (3점)", "2개 기억함 (2점)", "1개 기억함 (1점)", "기억 못함 (0점)"], scores: [3, 2, 1, 0] },
    { q: "이것(시계나 펜)은 무엇입니까? 그리고 저것(열쇠나 동전)은 무엇입니까?", type: "choice", options: ["2개 모두 맞춤 (2점)", "1개 맞춤 (1점)", "모두 틀림 (0점)"], scores: [2, 1, 0] },
    { q: "제가 드리는 종이를 '오른손으로 받아서', '반으로 접은 다음', '바닥에 내려놓으세요'.", type: "choice", options: ["3단계 모두 수행 (3점)", "2단계 수행 (2점)", "1단계 수행 (1점)", "수행 못함 (0점)"], scores: [3, 2, 1, 0] },
    { q: "다음 문장을 따라해 보시고('백지장도 맞들면 낫다'), 종이에 적힌 글('눈을 감으세요')을 보고 그대로 행동해 보세요.", type: "choice", options: ["2가지 모두 수행 (2점)", "1가지만 수행 (1점)", "모두 수행 못함 (0점)"], scores: [2, 1, 0] }
  ];

  useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      setUserData(JSON.parse(savedData));
    }
    
    // 1. 캐시 데이터 즉시 로드
    const cached = getCachedSheetData(type);
    if (cached.length > 0) {
      const sorted = cached.sort((a: any, b: any) => 
        new Date(b['타임스탬프'] || 0).getTime() - new Date(a['타임스탬프'] || 0).getTime()
      );
      setDataList(sorted);
    }
    
    // 2. 최신 데이터 백그라운드 로드
    loadData();
  }, [type]);

  const loadData = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const data = await fetchSheetData(type, force);
      // Sort by timestamp descending (newest first) for board
      const sorted = data.sort((a: any, b: any) => 
        new Date(b['타임스탬프'] || 0).getTime() - new Date(a['타임스탬프'] || 0).getTime()
      );
      setDataList(sorted);
    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return dataList;
    const q = searchQuery.toLowerCase();
    return dataList.filter(item => 
      (item['제목'] || '').toLowerCase().includes(q) || 
      (item['메시지 내용'] || '').toLowerCase().includes(q) ||
      (item['작성자'] || '').toLowerCase().includes(q)
    );
  }, [dataList, searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData || !postTitle.trim() || !postContent.trim()) {
      return;
    }
    
    setLoading(true);
    const now = new Date();
    const timestamp = now.toISOString();
    const dateStr = now.toLocaleString('ko-KR');

    const payload: any = {
      type: type,
      mode: 'APPEND',
      제목: postTitle,
      작성자: userData.name,
      '메시지 내용': postContent,
      '미디어/사진': mediaPreview || "",
      작성일시: dateStr,
      이메일: userData.email,
      타임스탬프: timestamp,
      지사: userData.branch
    };

    try {
      if (await submitToGoogleSheets(payload)) {
        setPostTitle('');
        setPostContent('');
        setMediaFile(null);
        setMediaPreview(null);
        setViewMode('LIST');
        loadData(true);
      } else {
        throw new Error('전송 실패');
      }
    } catch (err) {
      console.error('Submit Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isImage = (url: string) => {
    return url && (url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png)$/) != null);
  };

  const isVideo = (url: string) => {
    return url && (url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg)$/) != null);
  };

  const startTest = () => {
    if (!testPatientName || !testPatientBirth) {
      alert("이름과 생년월일을 입력해주세요.");
      return;
    }
    setTestScore(0);
    setTestCurrentQuestion(0);
    setViewMode('TEST_RUN');
  };

  const handleTestAnswer = (score: number) => {
    const newScore = testScore + score;
    setTestScore(newScore);
    
    if (testCurrentQuestion < dementiaQuestions.length - 1) {
      setTestCurrentQuestion(testCurrentQuestion + 1);
    } else {
      // Finish test
      let resultStr = '';
      // Max score is 30 in this standard MMSE version
      if (newScore >= 24) resultStr = '정상';
      else if (newScore >= 20) resultStr = '주의 (인지저하 의심)';
      else resultStr = '정밀 검사 권고 (치매 의심)';
      
      setTestResult(resultStr);
      setViewMode('TEST_RESULT');
      submitTestResult(newScore, resultStr);
    }
  };

  const submitTestResult = async (score: number, resultStr: string) => {
    if (!userData) return;
    const now = new Date();
    
    // DEMENTIA 전용 시트에 단독 기록 (어르신 인지 변화 추이 관리용)
    const dementiaPayload: any = {
      type: 'DEMENTIA',
      mode: 'APPEND',
      '검사일자': now.toISOString().split('T')[0],
      '검사시간': now.toTimeString().split(' ')[0].substring(0, 5),
      '강사명': userData.name,
      '지사': userData.branch,
      '대상자 이름': testPatientName,
      '성별': testPatientGender,
      '생년월일': testPatientBirth,
      '총점': score,
      '검사 결과': resultStr,
      '타임스탬프': now.toISOString(),
    };

    try {
      // 전용 시트에만 데이터 전송
      await submitToGoogleSheets(dementiaPayload);
    } catch (e) {
      console.error("Failed to submit test result", e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 bg-white/90 backdrop-blur-xl flex items-center justify-between border-b border-gray-100 shadow-sm z-10 safe-top">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (viewMode === 'MENU') navigate('/home');
              else if (viewMode === 'LIST' || viewMode === 'TEST_FORM') setViewMode('MENU');
              else if (viewMode === 'TEST_RUN' || viewMode === 'TEST_RESULT') setViewMode('TEST_FORM');
              else setViewMode('LIST');
            }} 
            className="size-10 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all"
          >
            <span className="material-symbols-outlined font-bold">
              {viewMode === 'MENU' ? 'arrow_back' : 'arrow_back'}
            </span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">
              {viewMode === 'WRITE' ? '글쓰기' : viewMode === 'DETAIL' ? '상세보기' : viewMode === 'TEST_FORM' || viewMode === 'TEST_RUN' || viewMode === 'TEST_RESULT' ? '치매 테스트' : title}
            </h1>
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] mt-1">
              {viewMode === 'WRITE' ? 'Create New Post' : viewMode === 'TEST_FORM' || viewMode === 'TEST_RUN' || viewMode === 'TEST_RESULT' ? 'Cognitive Test' : 'Communication Hub'}
            </p>
          </div>
        </div>
        
        {viewMode === 'LIST' && (
          <button 
            onClick={() => setViewMode('WRITE')} 
            className="h-10 px-4 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            <span className="text-sm font-black">글쓰기</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'MENU' && (
          <div className="p-6 pb-44 space-y-8 flex flex-col items-center justify-center h-full animate-in fade-in duration-500">
            <div className="text-center space-y-2 mb-4">
              <div className="inline-flex items-center justify-center size-16 bg-emerald-100 text-emerald-500 rounded-full mb-2">
                <span className="material-symbols-outlined text-4xl">waving_hand</span>
              </div>
              <h2 className="text-2xl font-black text-[#0a1931]">환영합니다!</h2>
              <p className="text-gray-500 font-medium text-sm">원하시는 서비스를 선택해주세요.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <button 
                onClick={() => setViewMode('LIST')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 hover:shadow-md active:scale-95 transition-all group"
              >
                <div className="size-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl">forum</span>
                </div>
                <span className="font-black text-[#0a1931] text-lg">소통하기</span>
              </button>
              
              <button 
                onClick={() => setViewMode('TEST_FORM')}
                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4 hover:shadow-md active:scale-95 transition-all group"
              >
                <div className="size-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl">psychology</span>
                </div>
                <span className="font-black text-[#0a1931] text-lg">치매 테스트</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === 'TEST_FORM' && (
          <div className="p-6 pb-44 max-w-md mx-auto animate-in slide-in-from-right duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 space-y-6">
              <div className="text-center mb-6">
                <span className="material-symbols-outlined text-5xl text-rose-500 mb-2">clinical_notes</span>
                <h2 className="text-xl font-black text-[#0a1931]">간이 인지능력 검사</h2>
                <p className="text-xs text-gray-400 mt-1">어르신의 기본 정보를 입력해주세요.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black text-[#0a1931] mb-2 ml-2">성함</label>
                  <input 
                    type="text" 
                    value={testPatientName}
                    onChange={(e) => setTestPatientName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-[#0a1931] mb-2 ml-2">성별</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTestPatientGender('남성')}
                      className={`flex-1 h-14 rounded-2xl font-black transition-all ${testPatientGender === '남성' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >남성</button>
                    <button 
                      onClick={() => setTestPatientGender('여성')}
                      className={`flex-1 h-14 rounded-2xl font-black transition-all ${testPatientGender === '여성' ? 'bg-rose-500 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                    >여성</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-[#0a1931] mb-2 ml-2">생년월일</label>
                  <input 
                    type="date" 
                    value={testPatientBirth}
                    onChange={(e) => setTestPatientBirth(e.target.value)}
                    className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-rose-500/20 transition-all font-bold"
                  />
                </div>
              </div>

              <button 
                onClick={startTest}
                className="w-full h-16 bg-rose-500 text-white text-lg font-black rounded-2xl shadow-xl shadow-rose-500/20 active:scale-[0.98] transition-all mt-4"
              >
                검사 시작하기
              </button>
            </div>
          </div>
        )}

        {viewMode === 'TEST_RUN' && (
          <div className="p-6 pb-44 max-w-md mx-auto animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-gray-400">문항 {testCurrentQuestion + 1} / {dementiaQuestions.length}</span>
                <div className="w-1/2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${((testCurrentQuestion + 1) / dementiaQuestions.length) * 100}%` }}></div>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-[#0a1931] leading-relaxed mb-8">
                Q. {dementiaQuestions[testCurrentQuestion].q}
              </h3>

              <div className="space-y-3">
                {dementiaQuestions[testCurrentQuestion].type === 'choice' ? (
                  dementiaQuestions[testCurrentQuestion].options?.map((opt, idx) => {
                    const score = dementiaQuestions[testCurrentQuestion].scores ? dementiaQuestions[testCurrentQuestion].scores![idx] : (idx === 0 ? 1 : 0);
                    return (
                      <button 
                        key={idx}
                        onClick={() => handleTestAnswer(score)}
                        className="w-full p-4 text-left bg-gray-50 hover:bg-rose-50 rounded-2xl font-bold text-[#0a1931] hover:text-rose-600 transition-colors border border-transparent hover:border-rose-200"
                      >
                        {opt}
                      </button>
                    );
                  })
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold text-sm">
                      💡 정답 예시: {dementiaQuestions[testCurrentQuestion].answer || '상황에 맞는 적절한 대답'}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleTestAnswer(1)} className="p-4 bg-emerald-500 text-white rounded-2xl font-black shadow-md active:scale-95 transition-transform">정답</button>
                      <button onClick={() => handleTestAnswer(0)} className="p-4 bg-gray-200 text-gray-600 rounded-2xl font-black active:scale-95 transition-transform">오답 / 모름</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'TEST_RESULT' && (
          <div className="p-6 pb-44 max-w-md mx-auto animate-in zoom-in-95 duration-500">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 text-center space-y-6">
              <div className={`size-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                testResult === '정상' ? 'bg-emerald-100 text-emerald-500' : 
                testResult === '주의' ? 'bg-amber-100 text-amber-500' : 'bg-rose-100 text-rose-500'
              }`}>
                <span className="material-symbols-outlined text-5xl">
                  {testResult === '정상' ? 'sentiment_very_satisfied' : testResult === '주의' ? 'sentiment_neutral' : 'sentiment_very_dissatisfied'}
                </span>
              </div>
              
              <div>
                <h2 className="text-2xl font-black text-[#0a1931] mb-2">{testPatientName} 어르신</h2>
                <p className="text-gray-500 font-medium">검사 결과 요약</p>
              </div>

              <div className={`py-4 px-6 rounded-2xl font-black text-2xl ${
                testResult === '정상' ? 'bg-emerald-50 text-emerald-600' : 
                testResult === '주의' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {testResult}
              </div>

              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                이 결과는 간이 검사 결과이며, 의학적 진단을 대신할 수 없습니다.<br/>
                결과 데이터는 관리자 통계방으로 전송되었습니다.
              </p>

              <button 
                onClick={() => setViewMode('MENU')}
                className="w-full h-16 bg-gray-100 text-[#0a1931] text-lg font-black rounded-2xl active:scale-[0.98] transition-all mt-4"
              >
                메인으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {viewMode === 'LIST' && (
          <div className="p-4 space-y-4 pb-44">
            <AdBanner slot="4444444444" className="mt-0 mb-4" />
            
            {/* Search Bar */}
            <div className="relative mb-6">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input 
                type="text" 
                placeholder="제목, 내용, 작성자 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all text-sm font-medium"
              />
            </div>

            {isRefreshing && dataList.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="size-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm font-bold">목록을 불러오는 중...</p>
              </div>
            ) : filteredList.length > 0 ? (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                {filteredList.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      setSelectedPost(item);
                      setViewMode('DETAIL');
                    }}
                    className="w-full p-5 flex flex-col items-start gap-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-wider">
                        {item['지사'] || '본사'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">{item['작성일시']}</span>
                    </div>
                    <h3 className="text-[#0a1931] font-bold text-base line-clamp-1 leading-tight">
                      {item['제목'] || item['메시지 내용']?.split('\n')[0] || '제목 없음'}
                    </h3>
                    <div className="flex items-center justify-between w-full mt-1">
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {item['작성자']}
                      </span>
                      {item['미디어/사진'] && (
                        <span className="material-symbols-outlined text-gray-300 text-lg">image</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center opacity-20">
                <span className="material-symbols-outlined text-6xl mb-2">find_in_page</span>
                <p className="font-bold">게시글이 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'DETAIL' && selectedPost && (
          <div className="p-6 pb-44 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">
                    {selectedPost['지사'] || '본사'}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{selectedPost['작성일시']}</span>
                </div>
                <h2 className="text-2xl font-black text-[#0a1931] leading-tight">
                  {selectedPost['제목'] || selectedPost['메시지 내용']?.split('\n')[0] || '제목 없음'}
                </h2>
                <div className="flex items-center gap-3 py-4 border-y border-gray-50">
                  <div className="size-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#0a1931]">{selectedPost['작성자']}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{selectedPost['이메일']}</p>
                  </div>
                </div>
              </div>

              {selectedPost['미디어/사진'] && (
                <div className="mb-8 rounded-3xl overflow-hidden bg-gray-50 border border-gray-100">
                  {isImage(selectedPost['미디어/사진']) ? (
                    <img 
                      src={selectedPost['미디어/사진']} 
                      alt="Post Media" 
                      className="w-full h-auto object-contain max-h-[500px]" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : isVideo(selectedPost['미디어/사진']) ? (
                    <video src={selectedPost['미디어/사진']} controls className="w-full h-auto" />
                  ) : null}
                </div>
              )}

              <div className="text-[#0a1931] text-base leading-relaxed whitespace-pre-wrap font-medium">
                {selectedPost['메시지 내용']}
              </div>
            </div>
            
            <button 
              onClick={() => setViewMode('LIST')}
              className="w-full h-14 bg-gray-100 text-gray-600 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined">list</span>
              목록으로 돌아가기
            </button>
          </div>
        )}

        {viewMode === 'WRITE' && (
          <div className="p-6 pb-44">
            <form onSubmit={handleSubmitPost} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-sm font-black text-[#0a1931] mb-3 ml-2">제목</label>
                <input 
                  type="text" 
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-bold text-[#0a1931]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-[#0a1931] mb-3 ml-2">내용</label>
                <textarea 
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="내용을 상세히 입력해주세요..."
                  className="w-full min-h-[250px] p-6 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium text-[#0a1931] resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-black text-[#0a1931] mb-3 ml-2">사진/영상 첨부 (선택)</label>
                <div className="flex flex-wrap gap-4">
                  {mediaPreview ? (
                    <div className="relative group">
                      <div className="size-32 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                        {mediaFile?.type.startsWith('image') ? (
                          <img src={mediaPreview} className="size-full object-cover" alt="Preview" />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-gray-50">
                            <span className="material-symbols-outlined text-gray-300 text-4xl">videocam</span>
                          </div>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                        className="absolute -top-2 -right-2 size-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => document.getElementById('board-file-input')?.click()}
                      className="size-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:border-emerald-200 hover:text-emerald-500 transition-all"
                    >
                      <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Add Media</span>
                    </button>
                  )}
                </div>
                <input 
                  id="board-file-input"
                  type="file" 
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-emerald-500 text-white text-lg font-black rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <div className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    게시글 등록하기
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Navigation */}
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
          <button onClick={() => navigate('/forum')} className="flex flex-col items-center justify-center gap-1.5 text-emerald-500">
            <span className="material-symbols-outlined text-[26px] fill-1">forum</span>
            <span className="text-[10px] font-black">소통방</span>
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

export default ForumPage;
