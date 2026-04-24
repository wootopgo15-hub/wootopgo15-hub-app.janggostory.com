
import { UserData, ReportData } from '../types';

// 사용자가 제공한 최종 배포 URL
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyXuTg8tPqXQa2jLhVzBYxUae69F9015Mrff0N4TmtUN2zYFKeb53YCgfSQU8Btcht_/exec';

// 시트 이름과 실제 시트 이름을 매핑합니다. (필요에 따라 수정)
const SHEET_MAP: Record<string, string> = {
  'USER': 'USER',
  'NOTICE': 'NOTICE',
  'REPORT': 'REPORT',
  'RESOURCE': 'RESOURCE',
  'FORUM': 'FORUM',
  'STATS': 'STATS',
  'STATISTICS': 'STATISTICS', // 통계 시트 추가
  'CENTER_LIST': 'REPORT', // 보고방 데이터 리스트 (백엔드에서는 REPORT로 인식)
  'CENTER': 'CENTER_LIST', // 센터 리스트 (백엔드에서는 CENTER_LIST로 인식)
  'PROPS_OFF': 'PROPS_OFF', // 교구&오프 시트
  'CLASS_MATERIALS': 'CLASS_MATERIALS', // 수업준비 영상 자료 시트
  'MAIL': 'MAIL' // 업무 메일 시트
};

/**
 * 데이터를 구글 시트로 전송 (쓰기)
 */
export const submitToGoogleSheets = async (data: any): Promise<boolean> => {
  try {
    // 백엔드에서 인식하는 시트 타입으로 변환
    const payload = { ...data };
    if (payload.type && SHEET_MAP[payload.type]) {
      payload.type = SHEET_MAP[payload.type];
    }

    // POST는 시트 쓰기용
    let response;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        response = await fetch(WEB_APP_URL, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        break;
      } catch (err) {
        lastError = err;
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP Error: ${response?.status}`);
    }

    const text = await response.text();
    
    if (text.trim().startsWith('<!DOCTYPE html>')) {
      throw new Error('Apps Script 배포 권한을 "모든 사람(Anyone)"으로 설정했는지 확인하세요.');
    }

    let resultData;
    try {
      resultData = JSON.parse(text);
    } catch (e) {
      console.warn('Failed to parse response as JSON:', text);
      // JSON이 아니더라도 에러 메시지가 포함되어 있는지 확인
      if (text.toLowerCase().includes('error')) {
        throw new Error(`Apps Script Error: ${text}`);
      }
      return true; // 에러가 없었으면 성공으로 간주
    }

    if (resultData && resultData.result === 'error') {
      throw new Error(resultData.message || 'Apps Script 내부 에러');
    }

    return true;
  } catch (error: any) {
    console.error('Submit Error:', error);
    if (error.message === 'Failed to fetch') {
      throw new Error('네트워크 오류가 발생했습니다. 브라우저의 보안 설정(타사 쿠키 차단 등) 때문일 수 있습니다. 새 탭에서 열거나 광고 차단기를 일시 중지해주세요.');
    }
    throw error;
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
  const CACHE_DURATION = 1000 * 60 * 1; // 1분 캐시 유지

  // 백엔드에서 인식하는 시트 타입으로 변환
  const mappedType = SHEET_MAP[type] || type;

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
    console.log(`[Network Fetch] ${type} (mapped to ${mappedType})`);
    const fetchUrl = `${WEB_APP_URL}?type=${mappedType}&t=${Date.now()}`;
    
    let response;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        response = await fetch(fetchUrl, {
          method: 'GET',
          mode: 'cors',
          redirect: 'follow'
        });
        break; // 성공하면 루프 탈출
      } catch (err) {
        lastError = err;
        retries--;
        if (retries === 0) throw err;
        // 1초 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP Error: ${response?.status}`);
    }

    const text = await response.text();
    
    if (text.trim().startsWith('<!DOCTYPE html>')) {
      throw new Error('Apps Script 배포 권한을 "모든 사람(Anyone)"으로 설정했는지 확인하세요.');
    }

    const data = JSON.parse(text);
    if (data && data.result === "error") {
      if (data.message === "Invalid sheet type" || data.message?.includes("Invalid sheet")) {
        console.warn(`[Sheet Not Found] ${mappedType} 시트가 아직 생성되지 않았습니다. 빈 배열을 반환합니다.`);
        return [];
      }
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
    
    if (error.message === 'Failed to fetch') {
      throw new Error('네트워크 오류가 발생했습니다. 브라우저의 보안 설정(타사 쿠키 차단 등) 때문일 수 있습니다. 새 탭에서 열거나 광고 차단기를 일시 중지해주세요.');
    }
    
    throw error;
  }
};

/**
 * 프레젠테이션의 페이지 ID 목록을 가져옵니다.
 */
export const fetchSlidePages = async (presentationId: string): Promise<string[]> => {
  try {
    const fetchUrl = `${WEB_APP_URL}?type=SLIDE_PAGES&presentationId=${presentationId}&t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    const data = JSON.parse(text);

    if (data && data.result === "error") {
      throw new Error(data.message || "Apps Script 내부 에러");
    }

    return Array.isArray(data) ? data : ['p'];
  } catch (error: any) {
    console.error('Fetch Slide Pages Error:', error);
    if (error.message === 'Failed to fetch') {
      console.warn('네트워크 오류가 발생했습니다. 브라우저의 보안 설정(타사 쿠키 차단 등) 때문일 수 있습니다.');
    }
    return ['p']; // 에러 발생 시 기본 페이지 반환
  }
};

/**
 * Apps Script를 통해 특정 슬라이드의 이미지를 Base64 형태로 가져옵니다.
 */
export const fetchSlideImageBase64 = async (presentationId: string, pageId: string): Promise<string | null> => {
  try {
    const fetchUrl = `${WEB_APP_URL}?type=SLIDE_IMAGE&presentationId=${presentationId}&pageId=${pageId}&t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const data = await response.json();
    if (data.result === 'success') {
      return data.base64;
    }
    return null;
  } catch (error: any) {
    console.error('Fetch Slide Image Error:', error);
    if (error.message === 'Failed to fetch') {
      console.warn('네트워크 오류가 발생했습니다. 브라우저의 보안 설정(타사 쿠키 차단 등) 때문일 수 있습니다.');
    }
    return null;
  }
};

/**
 * Apps Script를 통해 특정 슬라이드에 포함된 비디오(유튜브) URL 목록을 가져옵니다.
 */
export const fetchSlideVideos = async (presentationId: string, pageId: string): Promise<string[]> => {
  try {
    const fetchUrl = `${WEB_APP_URL}?type=SLIDE_VIDEOS&presentationId=${presentationId}&pageId=${pageId}&t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    
    const data = await response.json();
    if (data.result === 'success' && Array.isArray(data.videos)) {
      return data.videos;
    }
    return [];
  } catch (error: any) {
    console.error('Fetch Slide Videos Error:', error);
    if (error.message === 'Failed to fetch') {
      console.warn('네트워크 오류가 발생했습니다. 브라우저의 보안 설정(타사 쿠키 차단 등) 때문일 수 있습니다.');
    }
    return [];
  }
};
