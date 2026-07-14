import { useState, useMemo } from 'react';
import type { AttendanceLog } from '../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Calendar, ChevronDown } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Props {
  attendanceLogs: AttendanceLog[];
}

const Stats = ({ attendanceLogs }: Props) => {
  const [filterType, setFilterType] = useState<'all' | 'monthly'>('all');
  
  // Robust helper to extract YYYY-MM from various date formats
  const getMonthKey = (log: AttendanceLog) => {
    let dateStr = '';
    // Look for Date key case-insensitively
    Object.keys(log).forEach(key => {
      if (key.trim().toLowerCase() === 'date' || key.trim() === 'วันที่') {
        dateStr = String((log as any)[key]);
      }
    });

    if (!dateStr) return '';

    // Handle ISO string or YYYY-MM-DD
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length >= 2) return `${parts[0]}-${parts[1]}`;
    }
    
    // Handle DD/MM/YYYY or similar
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length >= 3) {
        // Assume DD/MM/YYYY or MM/DD/YYYY - we'll try to be smart
        // If the 3rd part is 4 digits, it's likely the year
        if (parts[2].length === 4) {
          // We'll use Date object as fallback if it's standard
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          }
        }
      }
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Get unique months available in data
  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(attendanceLogs.map(log => getMonthKey(log))))
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a)); // Newest first
    return months;
  }, [attendanceLogs]);

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');

  // Update selected month if it becomes empty but months are available
  if (!selectedMonth && availableMonths.length > 0) {
    setSelectedMonth(availableMonths[0]);
  }

  // Filter logs based on selection
  const filteredLogs = useMemo(() => {
    let logsToFilter = attendanceLogs;
    if (filterType === 'monthly' && selectedMonth) {
      logsToFilter = attendanceLogs.filter(log => getMonthKey(log) === selectedMonth);
    }
    
    // Deduplicate logs: keep only the latest log for each student on a specific date
    const latestLogsMap = new Map<string, AttendanceLog>();
    logsToFilter.forEach(log => {
      let dateStr = '';
      let studentId = '';
      Object.keys(log).forEach(key => {
        const tk = key.trim().toLowerCase();
        if (tk === 'date' || tk === 'วันที่' || tk === 'normalizeddate') {
          dateStr = String((log as any)[key]);
        }
        if (tk.includes('studentid') || tk === 'id' || tk.includes('รหัส') || tk.includes('เลข')) {
          studentId = String((log as any)[key]);
        }
      });
      
      const dateKey = getMonthKey(log) ? dateStr.split('T')[0] : dateStr; // simplify date string for key
      const uniqueKey = `${dateKey}_${studentId}`;
      latestLogsMap.set(uniqueKey, log); // Map preserves the last inserted (latest) value!
    });
    
    return Array.from(latestLogsMap.values());
  }, [attendanceLogs, filterType, selectedMonth]);

  const statusCounts = filteredLogs.reduce((acc: any, log) => {
    const status = log.Status?.trim();
    if (status === 'มา') acc['มา']++;
    else if (status === 'ป่วย' || status === 'ลาป่วย' || status === 'สาย') acc['ลาป่วย']++;
    else if (status === 'ลา' || status === 'ลากิจ') acc['ลากิจ']++;
    else if (status === 'ขาด') acc['ขาด']++;
    return acc;
  }, { 'มา': 0, 'ลาป่วย': 0, 'ลากิจ': 0, 'ขาด': 0 });

  const pieData = {
    labels: ['มา 🌸', 'ลาป่วย 🤒', 'ลากิจ ✉️', 'ขาด ❌'],
    datasets: [
      {
        data: [statusCounts['มา'], statusCounts['ลาป่วย'], statusCounts['ลากิจ'], statusCounts['ขาด']],
        backgroundColor: ['#22c55e', '#eab308', '#3b82f6', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const formatThaiMonth = (monthKey: string) => {
    if (!monthKey) return 'ไม่ระบุเดือน';
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-3xl shadow-sm border border-pink-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-pink-600 flex items-center gap-2">
            📊 สถิติการมาเรียน
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {filterType === 'all' ? 'แสดงข้อมูลทั้งหมดที่มีในระบบ' : `สรุปผลการเข้าเรียนประจำเดือน ${formatThaiMonth(selectedMonth)}`}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex p-1.5 bg-pink-50 rounded-2xl border border-pink-100">
            <button
              onClick={() => setFilterType('all')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                filterType === 'all' 
                  ? 'bg-white text-pink-500 shadow-md' 
                  : 'text-gray-400 hover:text-pink-400'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterType('monthly')}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                filterType === 'monthly' 
                  ? 'bg-white text-pink-500 shadow-md' 
                  : 'text-gray-400 hover:text-pink-400'
              }`}
            >
              รายเดือน
            </button>
          </div>

          {/* Month Selector */}
          {filterType === 'monthly' && (
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-12 pr-10 py-2.5 bg-white border-2 border-pink-100 rounded-2xl text-sm font-bold text-gray-700 hover:border-pink-300 focus:border-pink-500 focus:ring-4 focus:ring-pink-50 outline-none appearance-none transition-all min-w-[200px] cursor-pointer"
              >
                {availableMonths.length > 0 ? (
                  availableMonths.map(month => (
                    <option key={month} value={month}>
                      {formatThaiMonth(month)}
                    </option>
                  ))
                ) : (
                  <option value="">ไม่มีข้อมูล</option>
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-300 pointer-events-none">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart Card */}
        <div className="bg-gradient-to-br from-pink-50 to-white p-8 rounded-[2rem] border border-pink-100 flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
            📌 ภาพรวมสถานะ
          </h3>
          <div className="w-full max-w-[320px] aspect-square relative drop-shadow-xl">
            <Pie 
              data={pieData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      font: { weight: 'bold', family: 'sans-serif' }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Status Counts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="group p-5 bg-white border-2 border-green-50 rounded-2xl flex items-center justify-between hover:border-green-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🌸</div>
              <div>
                <p className="text-xs text-green-500 font-black uppercase tracking-widest">มาเรียน</p>
                <p className="text-3xl font-black text-green-600 leading-none mt-1">{statusCounts['มา']}</p>
              </div>
            </div>
            <div className="text-xs font-bold text-green-400 bg-green-50 px-3 py-1 rounded-full">
              {filteredLogs.length > 0 ? ((statusCounts['มา'] / filteredLogs.length) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="group p-5 bg-white border-2 border-yellow-50 rounded-2xl flex items-center justify-between hover:border-yellow-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">🤒</div>
              <div>
                <p className="text-xs text-yellow-500 font-black uppercase tracking-widest">ลาป่วย</p>
                <p className="text-3xl font-black text-yellow-600 leading-none mt-1">{statusCounts['ลาป่วย']}</p>
              </div>
            </div>
            <div className="text-xs font-bold text-yellow-400 bg-yellow-50 px-3 py-1 rounded-full">
              {filteredLogs.length > 0 ? ((statusCounts['ลาป่วย'] / filteredLogs.length) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="group p-5 bg-white border-2 border-blue-50 rounded-2xl flex items-center justify-between hover:border-blue-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">✉️</div>
              <div>
                <p className="text-xs text-blue-500 font-black uppercase tracking-widest">ลากิจ</p>
                <p className="text-3xl font-black text-blue-600 leading-none mt-1">{statusCounts['ลากิจ']}</p>
              </div>
            </div>
            <div className="text-xs font-bold text-blue-400 bg-blue-50 px-3 py-1 rounded-full">
              {filteredLogs.length > 0 ? ((statusCounts['ลากิจ'] / filteredLogs.length) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="group p-5 bg-white border-2 border-red-50 rounded-2xl flex items-center justify-between hover:border-red-200 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform">❌</div>
              <div>
                <p className="text-xs text-red-500 font-black uppercase tracking-widest">ขาดเรียน</p>
                <p className="text-3xl font-black text-red-600 leading-none mt-1">{statusCounts['ขาด']}</p>
              </div>
            </div>
            <div className="text-xs font-bold text-red-400 bg-red-50 px-3 py-1 rounded-full">
              {filteredLogs.length > 0 ? ((statusCounts['ขาด'] / filteredLogs.length) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
