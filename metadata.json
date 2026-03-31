// =================================================================
// 전역 설정 (ID 입력 불필요)
// =================================================================

// 프론트엔드에서 사용하는 시트 타입과 실제 시트 이름을 매핑합니다.
const SHEET_MAP = {
  'USER': 'USER',
  'NOTICE': 'NOTICE',
  'REPORT': 'REPORT', // ★ 중요: 구글 시트 하단의 탭 이름이 정확히 'REPORT'여야 합니다.
  'RESOURCE': 'RESOURCE',
  'FORUM': 'FORUM',
  'STATS': 'STATS',
  'CENTER_LIST': 'CENTER',
  'DEMENTIA': 'DEMENTIA',
  'PROPS_OFF': 'PROPS_OFF',
  'CLASS_MATERIALS': 'CLASS_MATERIALS'
};

// 현재 연결된 스프레드시트를 자동으로 가져오는 함수
function getActiveSheetByName(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("활성화된 스프레드시트를 찾을 수 없습니다.");
  }
  return ss.getSheetByName(name);
}

// 실제 데이터가 있는 마지막 행을 찾는 함수 (빈 행 건너뛰기)
function getRealLastRow(sheet) {
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].join("").trim().length > 0) {
      return i + 1;
    }
  }
  return 1;
}

// =================================================================
// GET 요청 처리 (데이터 조회 및 슬라이드 페이지 조회)
// =================================================================
function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return createJsonResponse({ result: "error", message: "파라미터가 없습니다." });
    }
    
    const type = e.parameter.type;

    // --- 구글 슬라이드 로직 생략 (기존과 동일) ---
    if (type === 'SLIDE_PAGES') {
      const presentationId = e.parameter.presentationId;
      if (!presentationId) return createJsonResponse({ result: "error", message: "presentationId가 없습니다." });
      try {
        const presentation = SlidesApp.openById(presentationId);
        const slides = presentation.getSlides();
        const pageIds = [];
        for (let i = 0; i < slides.length; i++) pageIds.push(slides[i].getObjectId());
        return createJsonResponse(pageIds);
      } catch (error) {
        return createJsonResponse(['p']);
      }
    }

    if (type === 'SLIDE_IMAGE') {
      const presentationId = e.parameter.presentationId;
      const pageId = e.parameter.pageId;
      if (!presentationId || !pageId) return createJsonResponse({ result: "error", message: "presentationId 또는 pageId가 없습니다." });
      try {
        DriveApp.getFileById(presentationId); 
        const url = "https://docs.google.com/presentation/d/" + presentationId + "/export/png?id=" + presentationId + "&pageid=" + pageId;
        const options = { headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
        const response = UrlFetchApp.fetch(url, options);
        const blob = response.getBlob();
        const base64 = Utilities.base64Encode(blob.getBytes());
        return createJsonResponse({ result: "success", base64: "data:image/png;base64," + base64 });
      } catch (error) {
        return createJsonResponse({ result: "error", message: error.toString() });
      }
    }

    if (type === 'SLIDE_VIDEOS') {
      const presentationId = e.parameter.presentationId;
      const pageId = e.parameter.pageId;
      if (!presentationId || !pageId) return createJsonResponse({ result: "error", message: "presentationId 또는 pageId가 없습니다." });
      try {
        const presentation = SlidesApp.openById(presentationId);
        const slides = presentation.getSlides();
        const videoUrls = [];
        for (let i = 0; i < slides.length; i++) {
          if (slides[i].getObjectId() === pageId) {
            const videos = slides[i].getVideos();
            for (let j = 0; j < videos.length; j++) videoUrls.push(videos[j].getUrl());
            break;
          }
        }
        return createJsonResponse({ result: "success", videos: videoUrls });
      } catch (error) {
        return createJsonResponse({ result: "error", message: error.toString() });
      }
    }

    if (!type || !SHEET_MAP[type]) {
      return createJsonResponse({ result: "error", message: "Invalid sheet type" });
    }

    const sheetName = SHEET_MAP[type];
    const sheet = getActiveSheetByName(sheetName);
    if (!sheet) {
      return createJsonResponse({ result: "error", message: `Sheet '${sheetName}' not found` });
    }
    
    // 실제 데이터가 있는 범위까지만 가져오기
    const lastRow = getRealLastRow(sheet);
    const lastCol = sheet.getLastColumn();
    if (lastRow === 0 || lastCol === 0) return createJsonResponse([]);
    
    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    if (!data || data.length === 0) return createJsonResponse([]);
    
    const headers = data.shift() || [];
    const jsonData = data.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[String(header).trim()] = row[index];
      });
      return obj;
    });

    return createJsonResponse(jsonData);

  } catch (error) {
    return createJsonResponse({ result: "error", message: error.message });
  }
}

// =================================================================
// POST 요청 처리 (데이터 쓰기/수정/삭제/인증)
// =================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const mode = data.mode;

    switch (mode) {
      case 'LOGIN': return handleLogin(data);
      case 'SIGNUP': return handleSignup(data);
      case 'APPEND': return handleAppend(data);
      case 'UPDATE': return handleUpdate(data);
      case 'DELETE': return handleDelete(data); // ★ DELETE 모드 추가
      default: return createTextResponse("Invalid mode");
    }
  } catch (error) {
    return createTextResponse("Error: " + error.message);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

// -----------------------------------------------------------------
// POST 핸들러 함수들
// -----------------------------------------------------------------

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

  if (emailExists) return createTextResponse(JSON.stringify({ result: "error", message: "Email already exists" }));
  
  const headers = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => data[String(header).trim().toLowerCase()] || ""); 
  
  const lastRow = getRealLastRow(userSheet);
  userSheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);

  return createTextResponse(JSON.stringify({ result: "success" }));
}

function handleAppend(data) {
  const sheetName = SHEET_MAP[data.type];
  if (!sheetName) return createTextResponse("Invalid sheet type for APPEND");

  const sheet = getActiveSheetByName(sheetName);
  if (!sheet) return createTextResponse(`${sheetName} sheet not found`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => {
      const header = String(h).trim(); // 공백 제거 (예: "이름 " -> "이름")
      
      if (header === '타임스탬프') return data['타임스탬프'] || data.timestamp || new Date();
      if (data[header] !== undefined) return data[header];

      const keyMap = {
        '이름': 'userName', '날짜': 'date', '시간': 'time', '요일': 'dayOfWeek',
        '센터': 'center', '과목': 'subject', '지사': 'branch', '이메일': 'email',
        '부서': 'department'
      };
      return data[keyMap[header]] !== undefined ? data[keyMap[header]] : "";
  });
  
  // 빈 행을 건너뛰고 실제 데이터가 있는 마지막 행 바로 아래에 추가
  const lastRow = getRealLastRow(sheet);
  sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
  
  return createTextResponse("APPEND Success");
}

function handleUpdate(data) {
  const sheetName = SHEET_MAP[data.type];
  if (!sheetName) return createTextResponse("Invalid sheet type for UPDATE");

  const sheet = getActiveSheetByName(sheetName);
  if (!sheet) return createTextResponse(`${sheetName} sheet not found`);

  const lastRow = getRealLastRow(sheet);
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return createTextResponse("Sheet is empty");

  const sheetData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = sheetData[0].map(h => String(h).trim());
  const timestampIndex = headers.indexOf('타임스탬프');

  if (timestampIndex === -1) return createTextResponse("타임스탬프 column not found");

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
    const newRow = headers.map(header => {
      if (data[header] !== undefined) return data[header];
      const keyMap = {
        '이름': 'userName', '날짜': 'date', '시간': 'time', '요일': 'dayOfWeek',
        '센터': 'center', '과목': 'subject', '지사': 'branch', '이메일': 'email',
        '부서': 'department', '타임스탬프': 'timestamp'
      };
      return data[keyMap[header]] !== undefined ? data[keyMap[header]] : sheetData[rowIndex][headers.indexOf(header)];
    });
    sheet.getRange(rowIndex + 1, 1, 1, newRow.length).setValues([newRow]);
    return createTextResponse("UPDATE Success");
  } else {
    return createTextResponse("Row to update not found");
  }
}

// ★ 새로 추가된 DELETE 핸들러 함수
function handleDelete(data) {
  const sheetName = SHEET_MAP[data.type];
  if (!sheetName) return createTextResponse("Invalid sheet type for DELETE");

  const sheet = getActiveSheetByName(sheetName);
  if (!sheet) return createTextResponse(`${sheetName} sheet not found`);

  const lastRow = getRealLastRow(sheet);
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return createTextResponse("Sheet is empty");

  const sheetData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = sheetData[0].map(h => String(h).trim());
  const timestampIndex = headers.indexOf('타임스탬프');

  if (timestampIndex === -1) return createTextResponse("타임스탬프 column not found");

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

  // rowIndex가 0보다 크다는 것은 헤더(0번 인덱스)가 아닌 실제 데이터 행을 찾았다는 뜻
  if (rowIndex > 0) { 
    sheet.deleteRow(rowIndex + 1); // 배열 인덱스는 0부터, 시트 행은 1부터 시작하므로 +1
    return createTextResponse("DELETE Success");
  } else {
    return createTextResponse("Row to delete not found");
  }
}

// =================================================================
// 유틸리티 함수
// =================================================================

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function createTextResponse(message) {
  return ContentService.createTextOutput(message);
}

function sheetToJSON(sheet) {
  const lastRow = getRealLastRow(sheet);
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return [];
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data.shift() || [];
  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[String(header).trim()] = row[index];
    });
    return obj;
  });
}
