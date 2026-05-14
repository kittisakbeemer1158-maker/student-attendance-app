import { useState, useMemo } from 'react';
import type { Student } from '../types';
import { fetchFilteredAttendance } from '../api';
import * as XLSX from 'xlsx';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';
import { Search, Loader2, Printer } from 'lucide-react';

interface Props {
  students: Student[];
}

const Report = ({ students }: Props) => {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Extract unique rooms for the dropdown
  const uniqueRooms = Array.from(new Set(students.map(s => `${s.Grade || ''} ${s.Room || ''}`.trim()))).filter(Boolean);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const result = await fetchFilteredAttendance({
        room: selectedRoom,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (result.status === 'success') {
        setLogs(result.logs || []);
      } else {
        alert('ดึงข้อมูลล้มเหลว: ' + result.message);
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Process data for the table and charts
  const processedLogs = useMemo(() => {
    return logs.map(log => {
      // Find Student ID
      let foundId = null;
      Object.keys(log).forEach(key => {
        const tk = key.trim().toLowerCase();
        if (tk.includes('studentid') || tk === 'id' || tk.includes('รหัส') || tk.includes('เลข')) {
          foundId = log[key];
        }
      });
      const cleanFoundId = String(foundId).replace(/[^a-zA-Z0-9]/g, '');

      // Match student to get Name and Room
      const student = students.find(s => String(s.ID).replace(/[^a-zA-Z0-9]/g, '') === cleanFoundId);
      
      let subject = '';
      let status = '';
      let remark = '';

      Object.keys(log).forEach(key => {
        const tk = key.trim().toLowerCase();
        if (tk.includes('subject') || tk.includes('วิชา')) subject = String(log[key] || '').trim();
        if (tk.includes('status') || tk.includes('สถานะ')) status = String(log[key] || '').trim();
        if (tk.includes('remark') || tk.includes('เหตุ')) remark = String(log[key] || '').trim();
      });

      return {
        date: log.normalizedDate || log.Date || log['วันที่'] || '',
        studentId: foundId,
        studentName: student ? student.Name : `ไม่พบชื่อ (ID: ${foundId})`,
        roomKey: student ? `${student.Grade || ''} ${student.Room || ''}`.trim() : 'ไม่ระบุห้อง',
        subject,
        status,
        remark,
        raw: log
      };
    });
  }, [logs, students]);

  // 2. Data for Dashboard
  const pieData = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;
    processedLogs.forEach(log => {
      if (log.status === 'มา') present++;
      else if (log.status === 'สาย') late++;
      else if (log.status === 'ลา') leave++;
      else if (log.status === 'ขาด') absent++;
    });
    
    return [
      { name: 'มา', value: present, color: '#22c55e' },
      { name: 'สาย', value: late, color: '#eab308' },
      { name: 'ลา', value: leave, color: '#3b82f6' },
      { name: 'ขาด', value: absent, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [processedLogs]);

  const trendData = useMemo(() => {
    const dateMap: Record<string, { total: number; present: number }> = {};
    processedLogs.forEach(log => {
      const d = log.date;
      if (!d) return;
      if (!dateMap[d]) dateMap[d] = { total: 0, present: 0 };
      dateMap[d].total++;
      if (log.status === 'มา' || log.status === 'สาย') {
        dateMap[d].present++;
      }
    });

    return Object.keys(dateMap).sort().map(date => {
      const percentage = (dateMap[date].present / dateMap[date].total) * 100;
      return {
        date,
        'มาเรียน (%)': Math.round(percentage)
      };
    });
  }, [processedLogs]);

  const atRiskStudents = useMemo(() => {
    const studentStats: Record<string, { name: string; room: string; total: number; present: number }> = {};
    processedLogs.forEach(log => {
      if (!log.studentName || log.studentName.includes('ไม่พบชื่อ')) return;
      const key = log.studentId || log.studentName;
      
      if (!studentStats[key]) {
        studentStats[key] = { name: log.studentName, room: log.roomKey, total: 0, present: 0 };
      }
      studentStats[key].total++;
      if (log.status === 'มา' || log.status === 'สาย') {
        studentStats[key].present++;
      }
    });

    return Object.values(studentStats)
      .map(stat => ({
        ...stat,
        percentage: (stat.present / stat.total) * 100
      }))
      .filter(stat => stat.percentage < 80)
      .sort((a, b) => a.percentage - b.percentage);
  }, [processedLogs]);

  // Exports
  const exportToExcel = () => {
    if (processedLogs.length === 0) return alert('ไม่มีข้อมูลสำหรับส่งออก');
    const dataToExport = processedLogs.map(log => ({
      'วันที่': log.date,
      'ห้องเรียน': log.roomKey,
      'ชื่อ-นามสกุล': log.studentName,
      'วิชา': log.subject,
      'สถานะ': log.status,
      'หมายเหตุ': log.remark
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance_report.xlsx");
  };

  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:pb-0 print:space-y-4">
      {/* FILTER SECTION */}
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-pink-100 print:hidden">
        <h2 className="text-2xl font-bold text-pink-600 mb-6 flex items-center">
          <Search className="w-6 h-6 mr-2" /> ค้นหารายงาน (Server-Side)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกห้องเรียน</label>
            <select 
              value={selectedRoom} 
              onChange={e => setSelectedRoom(e.target.value)} 
              className="w-full rounded-xl border-gray-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 transition-colors"
            >
              <option value="">-- ทุกห้องเรียน --</option>
              {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ตั้งแต่วันที่</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="w-full rounded-xl border-gray-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ถึงวันที่</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-full rounded-xl border-gray-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 transition-colors"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleSearch} 
              disabled={isLoading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2.5 rounded-xl font-bold shadow-md shadow-pink-200 transition-all flex items-center justify-center disabled:opacity-70 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
              {isLoading ? 'กำลังโหลด...' : 'ค้นหาข้อมูล'}
            </button>
          </div>
        </div>
      </div>

      {/* PRINT HEADER (ONLY VISIBLE ON PRINT) */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-black text-black">รายงานสรุปการเช็คชื่อนักเรียน</h1>
        <p className="text-sm text-gray-700 mt-2">
          {selectedRoom ? `ห้องเรียน: ${selectedRoom}` : 'ทุกห้องเรียน'} 
          {(startDate || endDate) && ` | วันที่: ${startDate || '-'} ถึง ${endDate || '-'}`}
        </p>
      </div>

      {hasSearched && !isLoading && processedLogs.length === 0 && (
        <div className="p-10 bg-white rounded-2xl shadow-sm border border-pink-100 text-center text-gray-500 text-lg print:hidden">
          ไม่พบข้อมูลในช่วงเวลาหรือห้องเรียนที่คุณเลือก
        </div>
      )}

      {processedLogs.length > 0 && (
        <>
          <div className="flex justify-end gap-3 print:hidden">
            <button onClick={exportToPDF} className="flex items-center bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
              <Printer className="w-4 h-4 mr-2" /> พิมพ์ / ส่งออก PDF
            </button>
            <button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95">
              📊 ส่งออก Excel
            </button>
          </div>

          {/* PART 1: RAW DATA TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 print:rounded-none print:shadow-none print:border-none">
            <div className="p-6 border-b border-gray-100 print:p-0 print:border-none print:mb-4">
              <h3 className="text-xl font-bold text-gray-800 print:text-black">📋 ข้อมูลการเช็คชื่อรายบุคคล</h3>
              <p className="text-sm text-gray-500 mt-1 print:hidden">แสดงผลข้อมูลดิบทั้งหมดตามเงื่อนไขที่คุณเลือก</p>
            </div>
            
            {/* 
              print:overflow-visible removes the scrollbar in PDF so no rows are hidden 
              print:max-h-none removes the 500px limit
            */}
            <div className="overflow-x-auto overflow-y-auto max-h-[500px] print:overflow-visible print:max-h-none p-0 sm:p-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80 sticky top-0 print:static print:bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider print:text-black print:border-b-2 print:border-gray-400">วันที่</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider print:text-black print:border-b-2 print:border-gray-400">ชื่อ-สกุล</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider print:text-black print:border-b-2 print:border-gray-400">ห้องเรียน</th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider print:text-black print:border-b-2 print:border-gray-400">สถานะ</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider print:text-black print:border-b-2 print:border-gray-400">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 print:divide-gray-300">
                  {processedLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors print:break-inside-avoid">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 print:text-black">{log.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 print:text-black">{log.studentName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 print:text-black">{log.roomKey}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold print:border print:bg-transparent ${
                          log.status === 'มา' ? 'bg-green-100 text-green-700 print:border-green-500 print:text-green-800' :
                          log.status === 'สาย' ? 'bg-yellow-100 text-yellow-700 print:border-yellow-500 print:text-yellow-800' :
                          log.status === 'ลา' ? 'bg-blue-100 text-blue-700 print:border-blue-500 print:text-blue-800' :
                          'bg-red-100 text-red-700 print:border-red-500 print:text-red-800'
                        }`}>
                          {log.status || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black">{log.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PART 2: DASHBOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-12 print:mt-12">
            {/* PIE CHART */}
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 print:border-none print:shadow-none break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-800 mb-6 text-center print:text-black">ภาพรวมการเข้าเรียน</h3>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LINE CHART */}
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 print:border-none print:shadow-none break-inside-avoid">
              <h3 className="text-lg font-bold text-gray-800 mb-6 text-center print:text-black">สถิติและแนวโน้มการมาเรียน (%)</h3>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="99%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="มาเรียน (%)" stroke="#ec4899" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AT-RISK STUDENTS TABLE */}
          {atRiskStudents.length > 0 && (
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-red-200 bg-red-50/50 print:p-0 print:bg-white print:border-none print:mt-12 break-inside-avoid">
              <h3 className="text-xl font-bold text-red-600 mb-4 print:text-black flex items-center print:border-b-2 print:border-gray-800 print:pb-2">
                ⚠️ รายชื่อนักเรียนที่ต้องติดตามดูแล (มาเรียนต่ำกว่า 80%)
              </h3>
              <div className="overflow-x-auto bg-white rounded-xl border border-red-100 print:border-none print:overflow-visible">
                <table className="min-w-full divide-y divide-red-100 print:divide-gray-300">
                  <thead className="bg-red-50/80 print:bg-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-red-800 uppercase print:text-black">ชื่อ-สกุล</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-red-800 uppercase print:text-black">ห้องเรียน</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-red-800 uppercase print:text-black">มาเรียน / ทั้งหมด</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-red-800 uppercase print:text-black">เปอร์เซ็นต์ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50 print:divide-gray-200">
                    {atRiskStudents.map((stat, i) => (
                      <tr key={i} className="print:break-inside-avoid">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 print:text-black">{stat.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 print:text-black">{stat.room}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-700 print:text-black">
                          {stat.present} / {stat.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 print:border print:border-gray-400 print:bg-transparent print:text-black">
                            {stat.percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Report;