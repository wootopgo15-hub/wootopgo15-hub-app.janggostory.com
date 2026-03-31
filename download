
import { UserData, ReportData } from '../types';

// 사용자가 제공한 최종 배포 URL
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXuTg8tPqXQa2jLhVzBYxUae69F9015Mrff0N4TmtUN2zYFKeb53YCgfSQU8Btcht_/exec';

/**
 * 데이터를 구글 시트로 전송 (쓰기)
 */
export const submitToGoogleSheets = async (data: any): Promise<boolean> => {
  try {
    // POST는 시트 쓰기용 (no-cors 모드 사용)
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data),
    });

    // no-cors는 응답을 읽을 수 없으므로 성공으로 간주하고 약간의 딜레이를 줌
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    console.error('Submit Error:', error);
    return false;
  }
};

/**
 * 로컬 캐시된 데이터를 즉시 반환
 */
export const getCachedSheetData = (type: string): any[] => {
  const CACHE_KEY = `sheet_cache_${type}`;
  const cachedData = localStorage.getItem(CACHE_KEY);
  return cachedData ? JSON.parse(cachedData) : [];
};

/**
 * Apps Script를 통해 시트 데이터를 읽어옴 (읽기)
 * 캐싱 로직 추가: 로컬 스토리지에 데이터를 저장하여 재방문 시 속도 향상
 */
export const fetchSheetData = async (type: string = 'USER', forceRefresh: boolean = false): Promise<any[]> => {
  const CACHE_KEY = `sheet_cache_${type}`;
  const CACHE_TIME_KEY = `${CACHE_KEY}_time`;
  const CACHE_DURATION = 1000 * 60 * 10; // 10분 캐시 유지 (조금 더 늘림)

  try {
    // 1. 캐시 확인 (강제 새로고침이 아닐 때)
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      
      if (cachedData && cachedTime) {
        const isExpired = Date.now() - parseInt(cachedTime) > CACHE_DURATION;
        if (!isExpired) {
          console.log(`[Cache Hit] ${type}`);
          return JSON.parse(cachedData);
        }
      }
    }

    // 2. 네트워크 요청
    console.log(`[Network Fetch] ${type}`);
    const fetchUrl = `${WEB_APP_URL}?type=${type}&t=${Date.now()}`;
    const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    
    if (text.trim().startsWith('<!DOCTYPE html>')) {
      throw new Error('Apps Script 배포 권한을 "모든 사람(Anyone)"으로 설정했는지 확인하세요.');
    }

    const data = JSON.parse(text);
    if (data && data.result === "error") {
      throw new Error(data.message || "Apps Script 내부 에러");
    }

    const result = Array.isArray(data) ? data : [];

    // 3. 캐시 저장
    localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());

    return result;
  } catch (error: any) {
    console.error('Fetch Error:', error);
    
    // 에러 발생 시 만료된 캐시라도 있으면 반환 (오프라인 대응)
    const fallbackData = localStorage.getItem(CACHE_KEY);
    if (fallbackData) {
      console.log(`[Fallback Cache] ${type}`);
      return JSON.parse(fallbackData);
    }
    
    throw error;
  }
};
