// =================================================================
// 전역 설정 (ID 입력 불필요)
// =================================================================

// 프론트엔드에서 사용하는 시트 타입과 실제 시트 이름을 매핑합니다.
const SHEET_MAP = {
  'USER': 'USER',
  'NOTICE': 'NOTICE',
  'REPORT': 'REPORT',
  'RESOURCE': 'RESOURCE',
  'FORUM': 'FORUM',
  'STATS': 'STATS',
  'CENTER_LIST': 'CENTER',
  'DEMENTIA': 'DEMENTIA', // 치매 테스트 전용 시트 매핑
  'PROPS_OFF': 'PROPS_OFF' // [추가됨] 교구&오프 시트 매핑
};

// 현재 연결된 스프레드시트를 자동으로 가져오는 함수
function getActiveSheetByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("활성화된 스프레드시트를 찾을 수 없습니다. 구글 시트 메뉴에서 '확장 프로그램 > Apps Script'를 통해 열었는지 확인하세요.");
  }
  return ss.getSheetByName(name);
}

// =================================================================
// GET 요청 처리 (데이터 조회 및 슬라이드 페이지 조회)
// =================================================================
function doGet(e) {
  try {
    // 파라미터가 없는 경우 방어 로직
    if (!e || !e.parameter) {
      return createJsonResponse({ result: "error", message: "파라미터가 없습니다." });
    }
    
    const type = e.parameter.type;

    // --- 구글 슬라이드 페이지 ID 목록 가져오기 ---
    if (type === 'SLIDE_PAGES') {
      const presentationId = e.parameter.presentationId;
      if (!presentationId) {
        return createJsonResponse({ result: "error", message: "presentationId가 없습니다." });
      }
      
      try {
        const presentation = SlidesApp.openById(presentationId);
        const slides = presentation.getSlides();
        const pageIds = [];
        
        for (let i = 0; i < slides.length; i++) {
          pageIds.push(slides[i].getObjectId());
        }
        
        return createJsonResponse(pageIds);
      } catch (error) {
        // 권한이 없거나 오류 발생 시 기본 첫 페이지('p') 반환
        return createJsonResponse(['p']);
      }
    }

    // --- 구글 슬라이드 특정 페이지 이미지(Base64) 가져오기 ---
    if (type === 'SLIDE_IMAGE') {
      const presentationId = e.parameter.presentationId;
      const pageId = e.parameter.pageId;
      
      if (!presentationId || !pageId) {
        return createJsonResponse({ result: "error", message: "presentationId 또는 pageId가 없습니다." });
      }

      try {
        // 권한 자동 부여를 위한 더미 코드 (최초 실행 시 Drive 접근 권한을 요구하게 만듦)
        DriveApp.getFileById(presentationId); 
        
        const url = "https://docs.google.com/presentation/d/" + presentationId + "/export/png?id=" + presentationId + "&pageid=" + pageId;
        const options = {
          headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true
        };
        const response = UrlFetchApp.fetch(url, options);
        const blob = response.getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        
        return createJsonResponse({
          result: "success",
          base64: "data:image/png;base64," + base64
        });
      } catch (error) {
        return createJsonResponse({ result: "error", message: error.toString() });
      }
    }

    // --- 구글 슬라이드 특정 페이지 비디오 URL 가져오기 ---
    if (type === 'SLIDE_VIDEOS') {
      const presentationId = e.parameter.presentationId;
      const pageId = e.parameter.pageId;
      
      if (!presentationId || !pageId) {
        return createJsonResponse({ result: "error", message: "presentationId 또는 pageId가 없습니다." });
      }

      try {
        const presentation = SlidesApp.openById(presentationId);
        const slides = presentation.getSlides();
        const videoUrls = [];
        
        for (let i = 0; i < slides.length; i++) {
          if (slides[i].getObjectId() === pageId) {
            const videos = slides[i].getVideos();
            for (let j = 0; j < videos.length; j++) {
              videoUrls.push(videos[j].getUrl());
            }
            break;
          }
        }
        return createJsonResponse({
          result: "success",
          videos: videoUrls
        });
      } catch (error) {
        return createJsonResponse({ result: "error", message: error.toString() });
      }
    }
    // --------------------------------------------------------

    if (!type || !SHEET_MAP[type]) {
      return createJsonResponse({ result: "error", message: "Invalid sheet type" });
    }

    const sheetName = SHEET_MAP[type];
    const sheet = getActiveSheetByName(sheetName);
    if (!sheet) {
      return createJsonResponse({ result: "error", message: `Sheet '${sheetName}' not found` });
    }
    
    const data = sheet.getDataRange().getValues();
    
    // 데이터가 없는 빈 시트일 경우 에러 방지
    if (!data || data.length === 0) {
      return createJsonResponse([]);
    }
    
    const headers = data.shift() || [];
    const jsonData = data.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return createJsonResponse(jsonData);

  } catch (error) {
    return createJsonResponse({ result: "error", message: error.message });
  }
}

// =================================================================
// POST 요청 처리 (데이터 쓰기/수정/인증)
// =================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const mode = data.mode || data.type;

    switch (mode) {
      case 'LOGIN':
        return handleLogin(data);
      case 'SIGNUP':
        return handleSignup(data);
      case 'APPEND':
        return handleAppend(data);
      case 'UPDATE':
        return handleUpdate(data);
      case 'DELETE':
        return handleDelete(data);
      case 'UPDATE_USER':
        return handleUpdateUser(data);
      default:
        return createJsonResponse({ result: "error", message: "Invalid mode" });
    }
  } catch (error) {
    return createJsonResponse({ result: "error", message: error.message });
  }
}

// =================================================================
// CORS 에러 방지용 OPTIONS 요청 처리 (추가됨)
// =================================================================
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

// -----------------------------------------------------------------
// POST 핸들러 함수들
// -----------------------------------------------------------------

function handleUpdateUser(data) {
  const userSheet = getActiveSheetByName(SHEET_MAP['USER']);
  if (!userSheet) return createJsonResponse({ result: "error", message: "USER sheet not found" });

  const sheetData = userSheet.getDataRange().getValues();
  const headers = sheetData[0];
  const emailIndex = headers.indexOf('이메일');
  const statusIndex = headers.indexOf('승인상태');

  if (emailIndex === -1 || statusIndex === -1) {
    return createJsonResponse({ result: "error", message: "이메일 or 승인상태 column not found" });
  }

  const rowIndex = sheetData.findIndex(row => row[emailIndex] === data.email);

  if (rowIndex > 0) {
    userSheet.getRange(rowIndex + 1, statusIndex + 1).setValue(data.status);
    return createJsonResponse({ result: "success", message: "User status updated" });
  } else {
    return createJsonResponse({ result: "error", message: "User not found" });
  }
}

function handleLogin(data) {
  const { email, password } = data;
  const userSheet = getActiveSheetByName(SHEET_MAP['USER']);
  if (!userSheet) return createTextResponse("USER sheet not found");

  const users = sheetToJSON(userSheet);
  const user = users.find(u => u['이메일'] === email && u['비밀번호'] === password);

  if (user) {
    delete user['비밀번호'];
    return createTextResponse(JSON.stringify({ result: "success", user: user }));
  } else {
    return createTextResponse(JSON.stringify({ result: "error", message: "Invalid credentials" }));
  }
}

function handleSignup(data) {
  const userSheet = getActiveSheetByName(SHEET_MAP['USER']);
  if (!userSheet) return createTextResponse("USER sheet not found");
  
  const users = sheetToJSON(userSheet);
  const emailExists = users.some(u => u['이메일'] === data.email);

  if (emailExists) {
    return createTextResponse(JSON.stringify({ result: "error", message: "Email already exists" }));
  }
  
  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => data[header.toLowerCase()] || ""); 
  userSheet.appendRow(newRow);

  return createTextResponse(JSON.stringify({ result: "success" }));
}

function handleAppend(data) {
  const sheetName = SHEET_MAP[data.type];
  if (!sheetName) return createJsonResponse({ result: "error", message: "Invalid sheet type for APPEND" });

  const sheet = getActiveSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ result: "error", message: `${sheetName} sheet not found` });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
      if (header === '타임스탬프') return data['타임스탬프'] || data.timestamp || new Date();
      
      // 프론트엔드에서 한글 키값(예: '주차', '교구명', '정상수량', '파손수량', '분실수량')을 그대로 보낸 경우 우선 적용
      if (data[header] !== undefined) return data[header];

      // 영문 키값으로 보낸 경우 매핑 (기존 호환성 유지)
      const keyMap = {
        '이름': 'userName', '날짜': 'date', '시간': 'time', '요일': 'dayOfWeek',
        '센터': 'center', '과목': 'subject', '지사': 'branch', '이메일': 'email',
        '부서': 'department'
      };
      return data[keyMap[header]] !== undefined ? data[keyMap[header]] : "";
  });
  
  sheet.appendRow(newRow);
  return createJsonResponse({ result: "success", message: "APPEND Success" });
}

function handleUpdate(data) {
  const sheetName = SHEET_MAP[data.type];
  if (!sheetName) return createJsonResponse({ result: "error", message: "Invalid sheet type for UPDATE" });

  const sheet = getActiveSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ result: "error", message: `${sheetName} sheet not found` });

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const timestampIndex = headers.indexOf('타임스탬프');

  if (timestampIndex === -1) {
    return createJsonResponse({ result: "error", message: "타임스탬프 column not found" });
  }

  // [개선됨] ISOString 비교 시 발생할 수 있는 밀리초 오차를 방지하기 위해 getTime()으로 비교
  const targetTimestamp = data['타임스탬프'] || data.timestamp;
  const rowIndex = sheetData.findIndex(row => {
    if (!row[timestampIndex]) return false;
    
    // 문자열 그대로 일치하는지 먼저 확인
    if (row[timestampIndex] === targetTimestamp) return true;
    
    // Date 객체로 변환하여 시간(ms) 단위로 일치하는지 확인
    try {
      const sheetTime = new Date(row[timestampIndex]).getTime();
      const targetTime = new Date(targetTimestamp).getTime();
      return sheetTime === targetTime;
    } catch (e) {
      return false;
    }
  });

  if (rowIndex > 0) { 
    const newRow = headers.map(header => {
      // 한글 키값 직접 매핑 추가 (정상수량, 파손수량, 분실수량 등 모두 자동 처리됨)
      if (data[header] !== undefined) return data[header];

      const keyMap = {
        '이름': 'userName', '날짜': 'date', '시간': 'time', '요일': 'dayOfWeek',
        '센터': 'center', '과목': 'subject', '지사': 'branch', '이메일': 'email',
        '부서': 'department', '타임스탬프': 'timestamp'
      };
      return data[keyMap[header]] !== undefined ? data[keyMap[header]] : sheetData[rowIndex][headers.indexOf(header)];
    });
    sheet.getRange(rowIndex + 1, 1, 1, newRow.length).setValues([newRow]);
    return createJsonResponse({ result: "success", message: "UPDATE Success" });
  } else {
    return createJsonResponse({ result: "error", message: "Row to update not found" });
  }
}

function handleDelete(data) {
  const sheetName = SHEET_MAP[data.type];
  if (!sheetName) return createJsonResponse({ result: "error", message: "Invalid sheet type for DELETE" });

  const sheet = getActiveSheetByName(sheetName);
  if (!sheet) return createJsonResponse({ result: "error", message: `${sheetName} sheet not found` });

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const timestampIndex = headers.indexOf('타임스탬프');

  if (timestampIndex === -1) {
    return createJsonResponse({ result: "error", message: "타임스탬프 column not found" });
  }

  const targetTimestamp = data['타임스탬프'] || data.timestamp;
  const rowIndex = sheetData.findIndex(row => {
    if (!row[timestampIndex]) return false;
    if (row[timestampIndex] === targetTimestamp) return true;
    try {
      const sheetTime = new Date(row[timestampIndex]).getTime();
      const targetTime = new Date(targetTimestamp).getTime();
      return sheetTime === targetTime;
    } catch (e) {
      return false;
    }
  });

  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex + 1);
    return createJsonResponse({ result: "success", message: "DELETE Success" });
  } else {
    return createJsonResponse({ result: "error", message: "Row to delete not found" });
  }
}

// =================================================================
// 유틸리티 함수
// =================================================================

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createTextResponse(message) {
  return ContentService.createTextOutput(message);
}

function sheetToJSON(sheet) {
  const data = sheet.getDataRange().getValues();
  if (!data || data.length === 0) return [];
  
  const headers = data.shift() || [];
  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}
