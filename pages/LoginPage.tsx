
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { fetchSheetData, submitToGoogleSheets } from '../services/googleSheets';
import { hashPassword } from '../utils/crypto';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userList, setUserList] = useState<any[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<Record<string, number>>({});

  // Auto-login check
  React.useEffect(() => {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  // Pre-fetch user list for auto-login check
  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        const users = await fetchSheetData('USER');
        setUserList(users);
      } catch (error) {
        console.error('Failed to pre-fetch users:', error);
      }
    };
    loadUsers();
  }, []);

  const performLogin = (foundUser: any) => {
    const status = foundUser['상태'] || foundUser['status'];
    
    if (status !== '승인') {
      setModalMessage('계정이 대기 상태이거나 승인되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    localStorage.setItem('userData', JSON.stringify({
      name: foundUser['이름'],
      email: foundUser['이메일'],
      branch: foundUser['지사'] || '본사',
      department: foundUser['부서'],
      role: foundUser['등급'] || foundUser['role']
    }));
    localStorage.setItem('userName', foundUser['이름']);
    localStorage.setItem('userRole', foundUser['등급'] || foundUser['role']);
    
    navigate('/home');
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hashedPassword = await hashPassword(password.trim());
      
      // 1. 먼저 미리 불러온 userList에서 확인 (빠른 로그인)
      let foundUser = userList.find((u: any) => 
        String(u['이메일']).trim() === email.trim() && 
        String(u['비밀번호']).trim() === hashedPassword
      );

      // 2. 없으면 최신 데이터를 다시 불러와서 확인
      let latestUsers = userList;
      if (!foundUser) {
        latestUsers = await fetchSheetData('USER', true); // true를 추가하여 강제 새로고침
        setUserList(latestUsers);
        
        foundUser = latestUsers.find((u: any) => 
          String(u['이메일']).trim() === email.trim() && 
          String(u['비밀번호']).trim() === hashedPassword
        );
      }

      if (foundUser) {
        setFailedAttempts(prev => ({ ...prev, [email.trim()]: 0 }));
        performLogin(foundUser);
      } else {
        const userExists = latestUsers.find((u: any) => String(u['이메일']).trim() === email.trim());
        
        if (userExists) {
          const currentFails = (failedAttempts[email.trim()] || 0) + 1;
          setFailedAttempts(prev => ({ ...prev, [email.trim()]: currentFails }));
          
          if (currentFails >= 5) {
            await submitToGoogleSheets({
              type: 'UPDATE_USER',
              email: email.trim(),
              status: '대기'
            });
            setModalMessage('비밀번호 5회 오류로 계정이 대기 상태로 전환되었습니다. 관리자에게 문의하세요.');
          } else {
            setModalMessage(`비밀번호가 일치하지 않습니다. (실패 횟수: ${currentFails}/5)`);
          }
        } else {
          setModalMessage('이메일 또는 비밀번호가 일치하지 않습니다.');
        }
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      setModalMessage('로그인 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout footerText="© 2026 Janggo Education Dev Institute.">
      <div className="shadow-2xl flex flex-col overflow-hidden rounded-[3rem] glass-effect">
        <div className="p-8 sm:p-10 pb-6 flex flex-col items-center relative">
          <button 
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 size-10 bg-white/50 hover:bg-white/80 rounded-full flex items-center justify-center text-gray-600 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          <div className="size-20 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20 mt-4">
            <span className="material-symbols-outlined text-white text-5xl">school</span>
          </div>
          <h1 className="text-[#111318] text-[2.25rem] font-black tracking-tighter text-center leading-tight">
            장고교육개발원
          </h1>
          <p className="text-[#4a5568] text-center text-sm font-bold mt-2">Portal Access</p>
        </div>

        <div className="p-8 sm:p-10 pt-4 flex flex-col">

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[0.95rem] font-bold text-[#111318] mb-2 ml-4">이메일 아이디</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#616f89]">mail</span>
              <input className="w-full h-14 pl-14 pr-4 rounded-full border-none input-glass focus:bg-white transition-all outline-none" placeholder="example@janggo.com" type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-[0.95rem] font-bold text-[#111318] mb-2 ml-4">비밀번호</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#616f89]">lock</span>
              <input className="w-full h-14 pl-14 pr-14 rounded-full border-none input-glass focus:bg-white transition-all outline-none" placeholder="••••••••" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => handlePasswordChange(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#616f89]">
                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          <button className="w-full h-16 bg-primary text-white text-xl font-black rounded-3xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4" type="submit" disabled={loading}>
            {loading ? <div className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "로그인"}
          </button>
        </form>

        <div className="mt-4">
          <Link to="/signup" className="w-full h-14 bg-white/20 text-[#111318] font-black rounded-3xl transition-all flex items-center justify-center gap-2 border border-white/30 active:scale-[0.98]">
            <span className="material-symbols-outlined">person_add</span>
            <span>신규 회원가입 신청</span>
          </Link>
        </div>
        </div>
      </div>

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
    </Layout>
  );
};

export default LoginPage;
