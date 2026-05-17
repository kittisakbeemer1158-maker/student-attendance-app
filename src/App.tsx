import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { fetchInitialData } from './api';
import type { Student, AttendanceLog } from './types';
import CheckIn from './components/CheckIn';
import Report from './components/Report';
import Status from './components/Status';
import Stats from './components/Stats';
import StudentManager from './components/StudentManager';
import { ClipboardList, FileText, CheckCircle2, BarChart3, Users, School } from 'lucide-react';

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState('โรงเรียนบ้านคลองสารเพชร');
  const [teacherName, setTeacherName] = useState('ครูชลดา ไชยโยธา');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchInitialData();
        if (data.status === 'success') {
          // Normalize keys by trimming spaces to prevent issues from Google Sheets
          const normalizedStudents = (data.students || []).map((student: any) => {
            const normalized: any = {};
            for (const key in student) {
              const trimmedKey = key.trim();
              
              // Map Thai and English column names to expected interface properties
              const lowerKey = trimmedKey.toLowerCase();
              if (lowerKey === 'studentid' || lowerKey === 'id' || lowerKey === 'รหัสนักเรียน' || lowerKey === 'รหัส' || lowerKey === 'เลขประจำตัว') {
                normalized['ID'] = student[key];
              } else if (lowerKey === 'name' || lowerKey === 'ชื่อ-สกุล' || lowerKey === 'ชื่อ-นามสกุล' || lowerKey === 'ชื่อ') {
                normalized['Name'] = student[key];
              } else if (lowerKey === 'grade' || lowerKey === 'ชั้น' || lowerKey === 'ระดับชั้น') {
                normalized['Grade'] = student[key];
              } else if (lowerKey === 'room' || lowerKey === 'ห้อง' || lowerKey === 'ห้องเรียน') {
                normalized['Room'] = student[key];
              } else {
                normalized[trimmedKey] = student[key];
              }
            }
            // Fallback for empty strings if the object properties don't exist
            if (normalized['ID'] === undefined) normalized['ID'] = '';
            if (normalized['Name'] === undefined) normalized['Name'] = '';
            if (normalized['Grade'] === undefined) normalized['Grade'] = '';
            if (normalized['Room'] === undefined) normalized['Room'] = '';
            
            return normalized;
          });
          
          const normalizedAttendance = (data.attendance || []).map((log: any) => {
            const normalized: any = {};
            for (const key in log) {
              normalized[key.trim()] = log[key];
            }
            return normalized;
          });

          setStudents(normalizedStudents);
          setAttendanceLogs(normalizedAttendance);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-pink-50 text-gray-800 font-sans">
        {/* Header */}
        <header className="bg-white border-b border-pink-100 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-pink-500 tracking-tight flex items-center">
                  <School className="mr-2 w-6 h-6 md:w-8 md:h-8" /> ระบบเช็คชื่อออนไลน์
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 md:mt-2">
                  <input 
                    type="text" 
                    value={schoolName} 
                    onChange={e => setSchoolName(e.target.value)}
                    className="bg-transparent border-none text-xs md:text-sm text-gray-500 focus:ring-0 p-0 hover:text-pink-400 transition-colors w-auto min-w-[120px]"
                    placeholder="ชื่อโรงเรียน"
                  />
                  <input 
                    type="text" 
                    value={teacherName} 
                    onChange={e => setTeacherName(e.target.value)}
                    className="bg-transparent border-none text-xs md:text-sm text-gray-500 focus:ring-0 p-0 hover:text-pink-400 transition-colors w-auto min-w-[100px]"
                    placeholder="ชื่อครูผู้สอน"
                  />
                </div>
              </div>
            </div>
            
            <nav className="flex overflow-x-auto gap-1 md:gap-2 p-1 bg-pink-50 rounded-2xl no-scrollbar">
              <Link to="/" className="flex items-center px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-white hover:text-pink-500 transition-all whitespace-nowrap">
                <ClipboardList className="w-4 h-4 mr-1.5" /> เช็คชื่อ
              </Link>
              <Link to="/report" className="flex items-center px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-white hover:text-pink-500 transition-all whitespace-nowrap">
                <FileText className="w-4 h-4 mr-1.5" /> รายงาน
              </Link>
              <Link to="/status" className="flex items-center px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-white hover:text-pink-500 transition-all whitespace-nowrap">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> สถานะ
              </Link>
              <Link to="/stats" className="flex items-center px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-white hover:text-pink-500 transition-all whitespace-nowrap">
                <BarChart3 className="w-4 h-4 mr-1.5" /> สถิติ
              </Link>
              <Link to="/manage" className="flex items-center px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-white hover:text-pink-500 transition-all whitespace-nowrap">
                <Users className="w-4 h-4 mr-1.5" /> จัดการ
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<CheckIn students={students} attendanceLogs={attendanceLogs} onSaveSuccess={() => window.location.reload()} />} />
            <Route path="/report" element={<Report students={students} />} />
            <Route path="/status" element={<Status attendanceLogs={attendanceLogs} />} />
            <Route path="/stats" element={<Stats attendanceLogs={attendanceLogs} />} />
            <Route path="/manage" element={<StudentManager students={students} setStudents={setStudents} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
