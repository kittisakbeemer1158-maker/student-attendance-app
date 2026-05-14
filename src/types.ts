export interface Student {
  ID: string;
  Name: string;
  Grade: string;
  Room: string;
}

export interface AttendanceRecord {
  date: string;
  grade: string;
  subject: string;
  studentId: string;
  status: 'มา' | 'สาย' | 'ลา' | 'ขาด';
  remark?: string;
}

export interface AttendanceLog {
  Timestamp: string;
  Date: string;
  Grade: string;
  Subject: string;
  StudentID: string;
  Status: string;
  Remark?: string;
}
