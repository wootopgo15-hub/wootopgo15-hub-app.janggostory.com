
export interface UserData {
  id?: string;
  name: string;
  email: string;
  password?: string;
  department: string;
  phoneNumber: string;
  branch: string;
  address: string;
  joiningDate: string;
  role: UserRole; // 등급 추가
  status?: '대기' | '승인'; // 관리자 승인 상태 추가
}

export enum UserRole {
  Admin = '관리자',
  SubAdmin = '부관리자',
  Teacher = '강사'
}

export interface ReportData {
  type: 'REPORT';
  userName: string;
  date: string;
  time: string;
  center: string;
  department: string;
  branch: string;
  email: string;
  dayOfWeek: string;
  timestamp: string;
}

export enum Department {
  Music = '음악',
  Gymnastics = '체조',
  Folklore = '전래',
  Cognition = '인지',
  Song = '노래'
}

export enum Branch {
  Cheonan = '천안',
  Sejong = '세종',
  Pyeongtaek = '평택',
  Ready = '준비중'
}
