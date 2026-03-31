import React, { useEffect, useState } from 'react';
import { fetchSheetData } from '../services/googleSheets';

const PropsReminder: React.FC = () => {
  const [showAlarm, setShowAlarm] = useState(false);

  useEffect(() => {
    const checkReminder = async () => {
      const userDataStr = localStorage.getItem('userData');
      if (!userDataStr) return;
      const userData = JSON.parse(userDataStr);
      
      // 관리자나 부관리자는 알림 제외 (필요시 제거 가능)
      if (userData.role === '관리자' || userData.role === '부관리자') return;

      const now = new Date();
      const day = now.getDay(); // 0: 일, 1: 월, ..., 5: 금
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // 금요일(5) 16시 50분 이후 (16:50 ~ 23:59)
      if (day === 5 && (hours > 16 || (hours === 16 && minutes >= 50))) {
        // 5분 단위인지 확인 (0, 5, 10, ..., 50, 55)
        if (minutes % 5 === 0) {
          const currentMinuteStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hours}:${minutes}`;
          const lastShown = sessionStorage.getItem('lastPropsReminder');
          
          // 이미 이번 분에 알림을 띄웠다면 무시
          if (lastShown === currentMinuteStr) return;

          try {
            const dataList = await fetchSheetData('PROPS_OFF', false);
            
            // 이번 주 월요일 00:00:00 구하기
            const today = new Date();
            const dayOfWeek = today.getDay() || 7; // 1(월) ~ 7(일)
            const monday = new Date(today);
            monday.setDate(today.getDate() - dayOfWeek + 1);
            monday.setHours(0, 0, 0, 0);

            // 이번 주에 교구 사용 내역을 등록했는지 확인
            const hasSubmittedThisWeek = dataList.some((item: any) => {
              if (item['이메일'] !== userData.email) return false;
              if (!item['교구명']) return false; // 쉬는 날 등록은 제외, 교구명이 있어야 함
              
              const itemDate = new Date(item['타임스탬프']);
              return itemDate >= monday;
            });

            if (!hasSubmittedThisWeek) {
              setShowAlarm(true);
              sessionStorage.setItem('lastPropsReminder', currentMinuteStr);
            }
          } catch (error) {
            console.error('Failed to check props submission:', error);
          }
        }
      }
    };

    // 30초마다 시간 체크
    const interval = setInterval(checkReminder, 30000);
    checkReminder(); // 초기 로드 시 한 번 체크

    return () => clearInterval(interval);
  }, []);

  if (!showAlarm) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4 text-rose-500">
          <span className="material-symbols-outlined text-3xl animate-bounce">notifications_active</span>
          <h3 className="text-lg font-black text-[#111318]">교구 사용 내역 알림</h3>
        </div>
        <p className="text-[#4a5568] font-medium leading-relaxed mb-6">
          이번 주 교구 사용 내역이 아직 작성되지 않았습니다.<br/>
          <span className="font-bold text-rose-500">주간 교구 사용 내역을 최신화 해주세요!</span>
        </p>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAlarm(false)}
            className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-[#111318] font-black rounded-2xl transition-colors active:scale-[0.98]"
          >
            닫기
          </button>
          <button 
            onClick={() => {
              setShowAlarm(false);
              window.location.hash = '#/props-off';
            }}
            className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-colors active:scale-[0.98] shadow-lg shadow-rose-500/30"
          >
            작성하러 가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropsReminder;
