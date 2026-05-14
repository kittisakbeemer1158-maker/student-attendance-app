import { useState, useEffect } from 'react';
import type { Student, AttendanceRecord, AttendanceLog } from '../types';
import { saveAttendance } from '../api';

interface Props {
  students: Student[];
  attendanceLogs: AttendanceLog[];
  onSaveSuccess: () => void;
}

const CheckIn = ({ students, attendanceLogs, onSaveSuccess }: Props) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [subject, setSubject] = useState('');
  
  const [attendance, setAttendance] = useState<Record<string, 'มา' | 'สาย' | 'ลา' | 'ขาด'>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  // Extract unique rooms
  const uniqueRooms = Array.from(new Set(students.map(s => `${s.Grade || ''} ${s.Room || ''}`.trim()))).filter(Boolean);

  const filteredStudents = selectedRoom 
    ? students.filter(s => `${s.Grade || ''} ${s.Room || ''}`.trim() === selectedRoom)
    : [];

  // Effect to load existing attendance data when date or room changes
  useEffect(() => {
    if (!selectedRoom) {
      setHasCheckedInToday(false);
      setIsEditMode(true);
      setAttendance({});
      setRemarks({});
      return;
    }

    const newAttendance: Record<string, 'มา' | 'สาย' | 'ลา' | 'ขาด'> = {};
    const newRemarks: Record<string, string> = {};
    let foundAny = false;

    filteredStudents.forEach(student => {
      // Find if this student has a log for the selected date
      const log = attendanceLogs.find(l => {
        // Match Date robustly
        let logDateRaw = '';
        Object.keys(l).forEach(key => {
          const tk = key.trim().toLowerCase();
          if (tk.includes('date') || tk.includes('วัน')) logDateRaw = String(l[key as keyof typeof l] || '');
        });

        let logDate = logDateRaw;
        if (logDate.includes('T')) {
          logDate = new Date(logDate).toLocaleDateString('en-CA'); // Converts to local YYYY-MM-DD
        } else {
          logDate = logDate.split('T')[0];
        }
        
        // Match Student ID robustly
        let foundId = null;
        Object.keys(l).forEach(key => {
          const tk = key.trim().toLowerCase();
          if (tk.includes('studentid') || tk === 'id' || tk.includes('รหัส') || tk.includes('เลข')) {
            foundId = l[key as keyof typeof l];
          }
        });

        return logDate === date && String(foundId).trim() === String(student.ID).trim();
      });

      if (log) {
        foundAny = true;
        let status = '';
        let remark = '';
        
        Object.keys(log).forEach(key => {
          const tk = key.trim().toLowerCase();
          if (tk === 'status' || tk === 'สถานะ') status = String(log[key as keyof typeof log] || '').trim();
          if (tk === 'remark' || tk === 'หมายเหตุ') remark = String(log[key as keyof typeof log] || '').trim();
        });

        if (['มา', 'สาย', 'ลา', 'ขาด'].includes(status)) {
          newAttendance[student.ID] = status as any;
        }
        newRemarks[student.ID] = remark;
      }
    });

    if (foundAny) {
      setHasCheckedInToday(true);
      setIsEditMode(false);
      setAttendance(newAttendance);
      setRemarks(newRemarks);
    } else {
      setHasCheckedInToday(false);
      setIsEditMode(true);
      setAttendance({});
      setRemarks({});
    }
  }, [date, selectedRoom, attendanceLogs, students]);

  const handleStatusChange = (studentId: string, status: 'มา' | 'สาย' | 'ลา' | 'ขาด') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleUnlockAll = () => {
    setIsEditMode(true);
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: remark }));
  };

  const handleSubmit = async () => {
    const records: AttendanceRecord[] = Object.entries(attendance).map(([studentId, status]) => {
      const student = students.find(s => s.ID === studentId);
      return {
        date,
        grade: student ? student.Grade : '',
        subject,
        studentId,
        status,
        remark: remarks[studentId] || ''
      };
    });

    if (records.length === 0) return alert('กรุณาเช็คชื่อนักเรียนอย่างน้อย 1 คน');
    
    try {
      await saveAttendance(records);
      alert('บันทึกข้อมูลเรียบร้อยแล้ว ข้อมูลใหม่ถูกบันทึกทับข้อมูลเดิมสำเร็จ');
      onSaveSuccess(); // Trigger refresh
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-2xl font-bold text-pink-600 mb-6">🌸 เช็คชื่อนักเรียน</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">วันที่</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ห้องเรียน (โปรดเลือกเพื่อดูรายชื่อ)</label>
          <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500">
            <option value="">-- เลือกห้องเรียน --</option>
            {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">รายวิชา</label>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="เช่น คณิตศาสตร์" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500" />
        </div>
      </div>

      {selectedRoom ? (
        <>
          {hasCheckedInToday && !isEditMode && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-green-800 font-bold text-lg">
                ✅ วันนี้ได้เช็คชื่อเรียบร้อยแล้ว
              </div>
              <button 
                onClick={handleUnlockAll} 
                className="bg-white text-green-700 border border-green-300 px-4 py-2 rounded-lg font-bold hover:bg-green-100 transition-colors shadow-sm"
              >
                ✏️ เช็คชื่อใหม่ (แก้ไขทั้งหมด)
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-pink-100">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-pink-50">
                {filteredStudents.map(student => {
                  const currentStatus = attendance[student.ID];

                  let nameColorClass = 'text-gray-700 font-medium';
                  if (!isEditMode && currentStatus) {
                    if (currentStatus === 'มา') nameColorClass = 'text-green-600 font-bold';
                    if (currentStatus === 'สาย') nameColorClass = 'text-yellow-600 font-bold';
                    if (currentStatus === 'ลา') nameColorClass = 'text-blue-600 font-bold';
                    if (currentStatus === 'ขาด') nameColorClass = 'text-red-600 font-bold';
                  }

                  return (
                    <tr key={student.ID}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${nameColorClass}`}>
                        {student.Name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {!isEditMode ? (
                          <div className="flex justify-center items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                              currentStatus === 'มา' ? 'bg-green-500 text-white' : 
                              currentStatus === 'สาย' ? 'bg-yellow-500 text-white' : 
                              currentStatus === 'ลา' ? 'bg-blue-500 text-white' : 
                              currentStatus === 'ขาด' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {currentStatus || 'ยังไม่เช็ค'}
                            </span>
                          </div>
                        ) : (
                          <div className="space-x-2">
                            <button onClick={() => handleStatusChange(student.ID, 'มา')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${currentStatus === 'มา' ? 'bg-green-500 text-white shadow-md' : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-sm'}`}>มา</button>
                            <button onClick={() => handleStatusChange(student.ID, 'สาย')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${currentStatus === 'สาย' ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 hover:shadow-sm'}`}>สาย</button>
                            <button onClick={() => handleStatusChange(student.ID, 'ลา')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${currentStatus === 'ลา' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-sm'}`}>ลา</button>
                            <button onClick={() => handleStatusChange(student.ID, 'ขาด')} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${currentStatus === 'ขาด' ? 'bg-red-500 text-white shadow-md' : 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-sm'}`}>ขาด</button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <input 
                          type="text" 
                          placeholder="หมายเหตุ (ถ้ามี)..." 
                          value={remarks[student.ID] || ''} 
                          onChange={e => handleRemarkChange(student.ID, e.target.value)} 
                          disabled={!isEditMode}
                          className={`w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm ${!isEditMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isEditMode && (
            <button onClick={handleSubmit} className="mt-8 w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-200 active:scale-[0.99]">
              บันทึกข้อมูล
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-10 text-gray-500">
          กรุณาเลือกห้องเรียนเพื่อแสดงรายชื่อนักเรียน
        </div>
      )}
    </div>
  );
};

export default CheckIn;
