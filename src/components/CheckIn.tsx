import { useState, useEffect } from 'react';
import type { Student, AttendanceRecord, AttendanceLog } from '../types';
import { saveAttendance, fetchLogs, saveLogs } from '../api';
import { Droplet, Sparkles, Check, X } from 'lucide-react';

interface Props {
  students: Student[];
  attendanceLogs: AttendanceLog[];
  onSaveSuccess: () => void;
}

const CheckIn = ({ students, attendanceLogs, onSaveSuccess }: Props) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const month = date.substring(0, 7);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [subject, setSubject] = useState('');
  
  const [attendance, setAttendance] = useState<Record<string, 'มา' | 'สาย' | 'ลา' | 'ขาด'>>({});
  const [milkStatuses, setMilkStatuses] = useState<Record<string, string>>({});
  const [toothStatuses, setToothStatuses] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  
  const [milkLogs, setMilkLogs] = useState<any[]>([]);
  const [toothLogs, setToothLogs] = useState<any[]>([]);

  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Extract unique rooms
  const uniqueRooms = Array.from(new Set(students.map(s => `${s.Grade || ''} ${s.Room || ''}`.trim()))).filter(Boolean);

  const filteredStudents = selectedRoom 
    ? students.filter(s => `${s.Grade || ''} ${s.Room || ''}`.trim() === selectedRoom)
    : [];

  useEffect(() => {
    const loadExtraLogs = async () => {
      setLoadingExtra(true);
      try {
        const [mRes, tRes] = await Promise.all([
          fetchLogs('getMilkLogs', { month }),
          fetchLogs('getToothbrushLogs', { month })
        ]);
        setMilkLogs(mRes.logs || []);
        setToothLogs(tRes.logs || []);
      } catch (error) {
        console.error('Failed to fetch milk/toothbrush logs', error);
      } finally {
        setLoadingExtra(false);
      }
    };
    if (selectedRoom) {
      loadExtraLogs();
    }
  }, [month, selectedRoom]);

  // Effect to load existing attendance data when date, room, or logs change
  useEffect(() => {
    if (!selectedRoom || loadingExtra) {
      if (!selectedRoom) {
        setHasCheckedInToday(false);
        setIsEditMode(true);
        setAttendance({});
        setMilkStatuses({});
        setToothStatuses({});
        setRemarks({});
      }
      return;
    }

    const newAttendance: Record<string, 'มา' | 'สาย' | 'ลา' | 'ขาด'> = {};
    const newMilk: Record<string, string> = {};
    const newTooth: Record<string, string> = {};
    const newRemarks: Record<string, string> = {};
    let foundAny = false;

    filteredStudents.forEach(student => {
      // 1. Attendance Log
      const attLog = attendanceLogs.find(l => {
        let logDateRaw = '';
        Object.keys(l).forEach(key => {
          const tk = key.trim().toLowerCase();
          if (tk.includes('date') || tk.includes('วัน')) logDateRaw = String(l[key as keyof typeof l] || '');
        });

        let logDate = logDateRaw;
        if (logDate.includes('T')) {
          logDate = new Date(logDate).toLocaleDateString('en-CA'); 
        } else {
          logDate = logDate.split('T')[0];
        }
        
        let foundId = null;
        Object.keys(l).forEach(key => {
          const tk = key.trim().toLowerCase();
          if (tk.includes('studentid') || tk === 'id' || tk.includes('รหัส') || tk.includes('เลข')) {
            foundId = l[key as keyof typeof l];
          }
        });

        return logDate === date && String(foundId).trim() === String(student.ID).trim();
      });

      if (attLog) {
        foundAny = true;
        let status = '';
        let remark = '';
        Object.keys(attLog).forEach(key => {
          const tk = key.trim().toLowerCase();
          if (tk === 'status' || tk === 'สถานะ') status = String(attLog[key as keyof typeof attLog] || '').trim();
          if (tk === 'remark' || tk === 'หมายเหตุ') remark = String(attLog[key as keyof typeof attLog] || '').trim();
        });
        if (['มา', 'สาย', 'ลา', 'ขาด'].includes(status)) {
          newAttendance[student.ID] = status as any;
        }
        newRemarks[student.ID] = remark;
      }

      // 2. Milk Log
      const mLog = milkLogs.find(l => l.Date === date && String(l.StudentID).trim() === String(student.ID).trim());
      if (mLog) {
        foundAny = true;
        newMilk[student.ID] = mLog.Status;
      } else {
        newMilk[student.ID] = 'ดื่ม'; // Default
      }

      // 3. Toothbrush Log
      const tLog = toothLogs.find(l => l.Date === date && String(l.StudentID).trim() === String(student.ID).trim());
      if (tLog) {
        foundAny = true;
        newTooth[student.ID] = tLog.Status;
      } else {
        newTooth[student.ID] = 'แปรง'; // Default
      }
    });

    if (foundAny) {
      setHasCheckedInToday(true);
      setIsEditMode(false);
      setAttendance(newAttendance);
      setMilkStatuses(newMilk);
      setToothStatuses(newTooth);
      setRemarks(newRemarks);
    } else {
      setHasCheckedInToday(false);
      setIsEditMode(true);
      
      const defaultAtt: Record<string, 'มา' | 'สาย' | 'ลา' | 'ขาด'> = {};
      const defaultMilk: Record<string, string> = {};
      const defaultTooth: Record<string, string> = {};
      filteredStudents.forEach(s => {
        defaultAtt[s.ID] = 'มา';
        defaultMilk[s.ID] = 'ดื่ม';
        defaultTooth[s.ID] = 'แปรง';
      });
      setAttendance(defaultAtt);
      setMilkStatuses(defaultMilk);
      setToothStatuses(defaultTooth);
      setRemarks({});
    }
  }, [date, selectedRoom, attendanceLogs, milkLogs, toothLogs, students, loadingExtra]);

  const handleAttStatusChange = (studentId: string, status: 'มา' | 'สาย' | 'ลา' | 'ขาด') => {
    if (!isEditMode) return;
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMilkChange = (studentId: string, status: string) => {
    if (!isEditMode) return;
    setMilkStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleToothChange = (studentId: string, status: string) => {
    if (!isEditMode) return;
    setToothStatuses(prev => ({ ...prev, [studentId]: status }));
  };

  const handleUnlockAll = () => {
    setIsEditMode(true);
  };

  const handleRemarkChange = (studentId: string, remark: string) => {
    if (!isEditMode) return;
    setRemarks(prev => ({ ...prev, [studentId]: remark }));
  };

  const getStudentMilkTotal = (studentId: string) => {
    return milkLogs.filter(log => String(log.StudentID).trim() === String(studentId).trim() && log.Status === 'ดื่ม').length;
  };

  const getStudentToothTotal = (studentId: string) => {
    return toothLogs.filter(log => String(log.StudentID).trim() === String(studentId).trim() && log.Status === 'แปรง').length;
  };

  const handleSubmit = async () => {
    const attRecords: AttendanceRecord[] = Object.entries(attendance).map(([studentId, status]) => {
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

    if (attRecords.length === 0) return alert('กรุณาเช็คชื่อนักเรียนอย่างน้อย 1 คน (ในส่วนของการมาเรียน)');
    
    setSaving(true);
    try {
      const milkRecords = filteredStudents.map(s => ({
        Month: month,
        Date: date,
        StudentID: s.ID,
        Status: milkStatuses[s.ID] || 'ดื่ม'
      }));

      const toothRecords = filteredStudents.map(s => ({
        Month: month,
        Date: date,
        StudentID: s.ID,
        Status: toothStatuses[s.ID] || 'แปรง'
      }));

      await Promise.all([
        saveAttendance(attRecords),
        saveLogs('saveMilkLogs', milkRecords),
        saveLogs('saveToothbrushLogs', toothRecords)
      ]);

      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      onSaveSuccess(); // Trigger refresh
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-2xl font-bold text-pink-600 mb-6 flex items-center gap-2">
        <span>🌸</span> เช็คชื่อนักเรียน / ดื่มนม / แปรงฟัน
      </h2>
      
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
          {loadingExtra ? (
            <div className="text-center py-10 text-gray-500 flex justify-center items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
              กำลังโหลดข้อมูลการดื่มนมและแปรงฟัน...
            </div>
          ) : (
            <>
              {hasCheckedInToday && !isEditMode && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-green-800 font-bold text-lg">
                    ✅ วันนี้บันทึกข้อมูลเรียบร้อยแล้ว
                  </div>
                  <button 
                    onClick={handleUnlockAll} 
                    className="bg-white text-green-700 border border-green-300 px-4 py-2 rounded-lg font-bold hover:bg-green-100 transition-colors shadow-sm"
                  >
                    ✏️ แก้ไขข้อมูลใหม่
                  </button>
                </div>
              )}

              {/* Desktop Table View */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="min-w-full divide-y divide-pink-100 text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider">การมาเรียน</th>
                      <th className="px-4 py-3 text-center font-medium text-blue-500 uppercase tracking-wider flex justify-center items-center gap-1"><Droplet className="w-4 h-4"/> ดื่มนม</th>
                      <th className="px-4 py-3 text-center font-medium text-teal-500 uppercase tracking-wider flex justify-center items-center gap-1"><Sparkles className="w-4 h-4"/> แปรงฟัน</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-pink-50">
                    {filteredStudents.map(student => {
                      const attStatus = attendance[student.ID];
                      const milkStatus = milkStatuses[student.ID];
                      const toothStatus = toothStatuses[student.ID];
                      
                      let nameColorClass = 'text-gray-700 font-medium';
                      if (!isEditMode && attStatus) {
                        if (attStatus === 'มา') nameColorClass = 'text-green-600 font-bold';
                        if (attStatus === 'สาย') nameColorClass = 'text-yellow-600 font-bold';
                        if (attStatus === 'ลา') nameColorClass = 'text-blue-600 font-bold';
                        if (attStatus === 'ขาด') nameColorClass = 'text-red-600 font-bold';
                      }

                      return (
                        <tr key={student.ID}>
                          <td className={`px-4 py-4 whitespace-nowrap transition-colors duration-300 ${nameColorClass}`}>
                            {student.Name}
                          </td>
                          {/* Attendance */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {!isEditMode ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                attStatus === 'มา' ? 'bg-green-500 text-white' : 
                                attStatus === 'สาย' ? 'bg-yellow-500 text-white' : 
                                attStatus === 'ลา' ? 'bg-blue-500 text-white' : 
                                attStatus === 'ขาด' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {attStatus || 'ยังไม่เช็ค'}
                              </span>
                            ) : (
                              <div className="flex justify-center space-x-1">
                                <button onClick={() => handleAttStatusChange(student.ID, 'มา')} className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${attStatus === 'มา' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>มา</button>
                                <button onClick={() => handleAttStatusChange(student.ID, 'สาย')} className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${attStatus === 'สาย' ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>สาย</button>
                                <button onClick={() => handleAttStatusChange(student.ID, 'ลา')} className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${attStatus === 'ลา' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>ลา</button>
                                <button onClick={() => handleAttStatusChange(student.ID, 'ขาด')} className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${attStatus === 'ขาด' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>ขาด</button>
                              </div>
                            )}
                          </td>
                          {/* Milk */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex justify-center space-x-1">
                                <button
                                  onClick={() => handleMilkChange(student.ID, 'ดื่ม')}
                                  disabled={!isEditMode}
                                  className={`flex items-center px-2 py-1 rounded-lg font-medium text-xs transition-all ${
                                    milkStatus === 'ดื่ม' ? 'bg-blue-100 text-blue-700 border border-blue-400' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <Check className="w-3 h-3 mr-1" /> ดื่ม
                                </button>
                                <button
                                  onClick={() => handleMilkChange(student.ID, 'ไม่ดื่ม')}
                                  disabled={!isEditMode}
                                  className={`flex items-center px-2 py-1 rounded-lg font-medium text-xs transition-all ${
                                    milkStatus === 'ไม่ดื่ม' ? 'bg-red-100 text-red-700 border border-red-400' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <X className="w-3 h-3 mr-1" /> ไม่ดื่ม
                                </button>
                              </div>
                              <span className="text-[10px] text-blue-500">รวม: {getStudentMilkTotal(student.ID)}</span>
                            </div>
                          </td>
                          {/* Toothbrush */}
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                             <div className="flex flex-col items-center gap-1">
                              <div className="flex justify-center space-x-1">
                                <button
                                  onClick={() => handleToothChange(student.ID, 'แปรง')}
                                  disabled={!isEditMode}
                                  className={`flex items-center px-2 py-1 rounded-lg font-medium text-xs transition-all ${
                                    toothStatus === 'แปรง' ? 'bg-teal-100 text-teal-700 border border-teal-400' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <Check className="w-3 h-3 mr-1" /> แปรง
                                </button>
                                <button
                                  onClick={() => handleToothChange(student.ID, 'ไม่แปรง')}
                                  disabled={!isEditMode}
                                  className={`flex items-center px-2 py-1 rounded-lg font-medium text-xs transition-all ${
                                    toothStatus === 'ไม่แปรง' ? 'bg-red-100 text-red-700 border border-red-400' : 'bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <X className="w-3 h-3 mr-1" /> ไม่แปรง
                                </button>
                              </div>
                              <span className="text-[10px] text-teal-500">รวม: {getStudentToothTotal(student.ID)}</span>
                            </div>
                          </td>
                          {/* Remarks */}
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <input 
                              type="text" 
                              placeholder="หมายเหตุ..." 
                              value={remarks[student.ID] || ''} 
                              onChange={e => handleRemarkChange(student.ID, e.target.value)} 
                              disabled={!isEditMode}
                              className={`w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-xs ${!isEditMode ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} 
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Card View */}
              <div className="xl:hidden space-y-4">
                {filteredStudents.map(student => {
                  const attStatus = attendance[student.ID];
                  const milkStatus = milkStatuses[student.ID];
                  const toothStatus = toothStatuses[student.ID];
                  
                  let cardBorderClass = 'border-gray-200';
                  if (attStatus) {
                    if (attStatus === 'มา') cardBorderClass = 'border-green-300 bg-green-50/20';
                    if (attStatus === 'สาย') cardBorderClass = 'border-yellow-300 bg-yellow-50/20';
                    if (attStatus === 'ลา') cardBorderClass = 'border-blue-300 bg-blue-50/20';
                    if (attStatus === 'ขาด') cardBorderClass = 'border-red-300 bg-red-50/20';
                  }

                  return (
                    <div key={student.ID} className={`p-4 rounded-2xl border ${cardBorderClass} shadow-sm transition-all duration-300`}>
                      <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                        <span className="font-bold text-gray-800">{student.Name}</span>
                        {!isEditMode && attStatus && (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            attStatus === 'มา' ? 'bg-green-500 text-white' : 
                            attStatus === 'สาย' ? 'bg-yellow-500 text-white' : 
                            attStatus === 'ลา' ? 'bg-blue-500 text-white' : 
                            'bg-red-500 text-white'
                          }`}>
                            {attStatus}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        {/* Attendance Row */}
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">การมาเรียน</div>
                          {isEditMode ? (
                            <div className="grid grid-cols-4 gap-2">
                              <button onClick={() => handleAttStatusChange(student.ID, 'มา')} className={`py-2 rounded-xl text-xs font-bold transition-all ${attStatus === 'มา' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-700'}`}>มา</button>
                              <button onClick={() => handleAttStatusChange(student.ID, 'สาย')} className={`py-2 rounded-xl text-xs font-bold transition-all ${attStatus === 'สาย' ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-50 text-yellow-700'}`}>สาย</button>
                              <button onClick={() => handleAttStatusChange(student.ID, 'ลา')} className={`py-2 rounded-xl text-xs font-bold transition-all ${attStatus === 'ลา' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-700'}`}>ลา</button>
                              <button onClick={() => handleAttStatusChange(student.ID, 'ขาด')} className={`py-2 rounded-xl text-xs font-bold transition-all ${attStatus === 'ขาด' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-700'}`}>ขาด</button>
                            </div>
                          ) : (
                             <div className="text-sm font-medium text-gray-700">{attStatus || 'ยังไม่เช็ค'}</div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Milk Row */}
                          <div className="bg-blue-50/50 p-2 rounded-xl">
                             <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center justify-between">
                               <span className="flex items-center"><Droplet className="w-3 h-3 mr-1"/> ดื่มนม</span>
                               <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">รวม {getStudentMilkTotal(student.ID)}</span>
                             </div>
                             <div className="flex gap-1">
                                <button
                                  onClick={() => handleMilkChange(student.ID, 'ดื่ม')}
                                  disabled={!isEditMode}
                                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg font-medium text-xs transition-all ${
                                    milkStatus === 'ดื่ม' ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <Check className="w-3 h-3 mr-1" /> ดื่ม
                                </button>
                                <button
                                  onClick={() => handleMilkChange(student.ID, 'ไม่ดื่ม')}
                                  disabled={!isEditMode}
                                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg font-medium text-xs transition-all ${
                                    milkStatus === 'ไม่ดื่ม' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-500'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <X className="w-3 h-3 mr-1" /> ไม่
                                </button>
                             </div>
                          </div>

                          {/* Toothbrush Row */}
                          <div className="bg-teal-50/50 p-2 rounded-xl">
                             <div className="text-xs font-semibold text-teal-600 mb-1 flex items-center justify-between">
                               <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1"/> แปรงฟัน</span>
                               <span className="text-[10px] bg-teal-100 px-1.5 py-0.5 rounded">รวม {getStudentToothTotal(student.ID)}</span>
                             </div>
                             <div className="flex gap-1">
                                <button
                                  onClick={() => handleToothChange(student.ID, 'แปรง')}
                                  disabled={!isEditMode}
                                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg font-medium text-xs transition-all ${
                                    toothStatus === 'แปรง' ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-gray-500'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <Check className="w-3 h-3 mr-1" /> แปรง
                                </button>
                                <button
                                  onClick={() => handleToothChange(student.ID, 'ไม่แปรง')}
                                  disabled={!isEditMode}
                                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg font-medium text-xs transition-all ${
                                    toothStatus === 'ไม่แปรง' ? 'bg-red-500 text-white shadow-sm' : 'bg-white text-gray-500'
                                  } ${!isEditMode ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <X className="w-3 h-3 mr-1" /> ไม่
                                </button>
                             </div>
                          </div>
                        </div>

                        {/* Remarks Row */}
                        <div>
                           {isEditMode ? (
                             <input 
                                type="text" 
                                placeholder="หมายเหตุ (ถ้ามี)..." 
                                value={remarks[student.ID] || ''} 
                                onChange={e => handleRemarkChange(student.ID, e.target.value)} 
                                className="w-full rounded-xl border-gray-200 text-xs focus:border-pink-500 focus:ring-pink-500"
                              />
                           ) : (
                              remarks[student.ID] && (
                                <div className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg">
                                  หมายเหตุ: {remarks[student.ID]}
                                </div>
                              )
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {isEditMode && (
                <button disabled={saving} onClick={handleSubmit} className="mt-8 w-full bg-pink-500 text-white py-3 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-lg shadow-pink-200 active:scale-[0.99] disabled:opacity-50">
                  {saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลทั้งหมด (เช็คชื่อ/นม/แปรงฟัน)'}
                </button>
              )}
            </>
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
