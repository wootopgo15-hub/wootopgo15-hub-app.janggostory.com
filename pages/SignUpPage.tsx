
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Department, UserData, UserRole } from '../types';
import { submitToGoogleSheets, fetchSheetData } from '../services/googleSheets';
import { hashPassword } from '../utils/crypto';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [centerList, setCenterList] = useState<any[]>([]);
  const [formData, setFormData] = useState<UserData>({
    name: '',
    email: '',
    password: '',
    department: '',
    phoneNumber: '',
    branch: '',
    address: '',
    joiningDate: '',
    role: UserRole.Teacher, // 기본값 강사
    status: '대기' // 초기 상태 설정
  });

  const branchList = ['천안', '세종', '평택', '서울'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 비밀번호 암호화 (해싱)
      const hashedPassword = await hashPassword(formData.password);

      // payload에 상태 및 생성일 명시
      const payload = {
        type: 'USER',
        mode: 'SIGNUP',
        email: formData.email, // 중복 검사용
        '이름': formData.name,
        '이메일': formData.email,
        '비밀번호': hashedPassword, // 암호화된 비밀번호 전송
        '부서': formData.department,
        '지사': formData.branch,
        '전화번호': formData.phoneNumber,
        '주소': formData.address,
        '입사일': formData.joiningDate,
        '등급': formData.role,
        '상태': formData.status,
        '생성일': new Date().toLocaleString()
      };

      const success = await submitToGoogleSheets(payload);
      
      if (success) {
        navigate('/login');
      } else {
        // Silent failure
      }
    } catch (error) {
      console.error('Signup Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout footerText="© 2026 Janggo Education Dev Institute.">
      <div className="glass-effect rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <button 
              className="size-10 rounded-full flex items-center justify-center bg-white/50 text-[#111318] hover:bg-white transition-colors" 
              onClick={() => navigate('/login')}
            >
              <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col items-end">
              <span className="text-primary font-black text-xl tracking-tight">Janggo 2026</span>
              <span className="text-[10px] text-[#4a5568] font-bold uppercase tracking-widest">Awaiting Approval</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-white text-2xl">person_add</span>
            </div>
            <div>
              <h1 className="text-[#111318] text-xl font-black">회원가입 신청</h1>
              <p className="text-[#4a5568] text-xs font-bold leading-tight">가입 후 관리자가 승인해야 접속 가능합니다.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <form id="signup-form" className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">이름</label>
              <input name="name" value={formData.name} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none" placeholder="실명을 입력하세요" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">이메일 (ID)</label>
              <input name="email" value={formData.email} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none" placeholder="example@janggo.com" required type="email" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">비밀번호</label>
              <input name="password" value={formData.password} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none" placeholder="6자 이상 입력하세요" required type={showPassword ? 'text' : 'password'} minLength={6} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">부서</label>
              <select name="department" value={formData.department} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none appearance-none" required>
                <option value="" disabled>부서 선택</option>
                {Object.values(Department).map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">지사</label>
              <select name="branch" value={formData.branch} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none appearance-none" required>
                <option value="" disabled>지사 선택</option>
                {branchList.map((branch, index) => <option key={`branch-${index}`} value={branch}>{branch}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">전화번호</label>
              <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none" placeholder="010-0000-0000" required pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}" title="010-0000-0000 형식으로 입력해주세요" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">주소</label>
              <input name="address" value={formData.address} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none" placeholder="거주지 주소를 입력하세요" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">입사일</label>
              <input name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none" type="date" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111318] mb-1.5 ml-3">등급 (권한)</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full h-12 px-5 rounded-2xl border-none input-glass focus:bg-white transition-all outline-none appearance-none" required>
                {Object.values(UserRole)
                  .filter(role => role !== UserRole.Admin)
                  .map(role => <option key={role} value={role}>{role}</option>)
                }
              </select>
            </div>
          </form>
        </div>

        <div className="p-6 pt-4 border-t border-white/20">
          <button form="signup-form" className="w-full h-14 bg-primary text-white text-lg font-black rounded-2xl shadow-xl active:scale-[0.98] disabled:opacity-50" type="submit" disabled={loading}>
            {loading ? "전송 중..." : "가입 신청하기"}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default SignUpPage;
