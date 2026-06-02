import React, { useState, useEffect } from 'react';
import { fetchLogs, fetchFilteredAttendance, saveLogs } from '../api';
import type { Student } from '../types';
import { Calendar, Save, RefreshCw } from 'lucide-react';

interface Props {
  students: Student[];
}

const AttendanceSummary: React.FC<Props> = ({ students }) => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [threshold, setThreshold] = useState(80); // 80% default threshold

  const loadSummary = async () => {
    setLoading(true);
    try {
      // 1. Fetch saved summary
      await fetchLogs('getAttendanceSummary', { month });
      
      // 2. Fetch raw attendance for the month to calculate
      const [yearStr, monthStr] = month.split('-');
      const startDate = `${yearStr}-${monthStr}-01`;
      const lastDay = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
      const endDate = `${yearStr}-${monthStr}-${lastDay}`;
      
      const rawRaw = await fetchFilteredAttendance({ startDate, endDate });
      const rawLogs = rawRaw.logs || [];

      // Calculate logic
      const calculated = students.map(student => {
        let present = 0;
        let sick = 0;
        let leave = 0;
        let absent = 0;

        rawLogs.forEach((log: any) => {
          if (String(log.StudentID).trim() === String(student.ID).trim()) {
            const status = log.Status;
            if (status === 'มา' || status === 'สาย') present++;
            else if (status === 'ป่วย' || status === 'ลาป่วย') sick++;
            else if (status === 'ลา' || status === 'ลากิจ') leave++;
            else if (status === 'ขาด') absent++;
          }
        });

        const totalDays = present + sick + leave + absent;
        const percentage = totalDays > 0 ? ((present / totalDays) * 100).toFixed(2) : '0.00';
        const assessment = parseFloat(percentage) >= threshold ? 'ผ่าน' : 'ไม่ผ่าน';

        // Check if we have a saved version to merge any manual overrides (optional), but here we just recalculate based on raw data to be accurate
        
        return {
          Month: month,
          StudentID: student.ID,
          Name: student.Name,
          Present: present,
          Sick: sick,
          Leave: leave,
          Absent: absent,
          Percentage: percentage,
          Assessment: assessment
        };
      });

      setSummaryData(calculated);
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (students.length > 0) {
      loadSummary();
    }
  }, [month, students, threshold]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = summaryData.map(d => ({
        Month: d.Month,
        StudentID: d.StudentID,
        Present: d.Present,
        Sick: d.Sick,
        Leave: d.Leave,
        Absent: d.Absent,
        Percentage: d.Percentage,
        Assessment: d.Assessment
      }));
      await saveLogs('saveAttendanceSummary', records);
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-pink-100 p-4 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
          <Calendar className="w-6 h-6 mr-2 text-pink-500" />
          สรุปการมาเรียน
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
             <label className="text-sm font-medium text-gray-600">เกณฑ์ผ่าน (%):</label>
             <input 
               type="number" 
               value={threshold} 
               onChange={(e) => setThreshold(Number(e.target.value))}
               className="w-20 rounded-xl border-gray-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
             />
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border-gray-200 shadow-sm focus:border-pink-500 focus:ring-pink-500 text-sm"
          />
          <button
            onClick={loadSummary}
            className="flex items-center px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-semibold hover:bg-pink-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> โหลดใหม่
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || summaryData.length === 0}
            className="flex items-center px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-semibold hover:bg-pink-600 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกสรุป'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-center">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600 text-left">ชื่อ-สกุล</th>
              <th className="px-4 py-3 font-semibold text-green-600">มาเรียน</th>
              <th className="px-4 py-3 font-semibold text-yellow-600">ป่วย</th>
              <th className="px-4 py-3 font-semibold text-blue-600">ลา</th>
              <th className="px-4 py-3 font-semibold text-red-600">ขาด</th>
              <th className="px-4 py-3 font-semibold text-gray-600">ร้อยละ (%)</th>
              <th className="px-4 py-3 font-semibold text-gray-600">ผลการประเมิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex justify-center items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                    กำลังโหลดข้อมูล...
                  </div>
                </td>
              </tr>
            ) : summaryData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลนักเรียน</td>
              </tr>
            ) : (
              summaryData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-left font-medium text-gray-900">{row.Name}</td>
                  <td className="px-4 py-3 text-green-600">{row.Present}</td>
                  <td className="px-4 py-3 text-yellow-600">{row.Sick}</td>
                  <td className="px-4 py-3 text-blue-600">{row.Leave}</td>
                  <td className="px-4 py-3 text-red-600">{row.Absent}</td>
                  <td className="px-4 py-3 font-semibold">{row.Percentage}%</td>
                  <td className={`px-4 py-3 font-bold ${row.Assessment === 'ผ่าน' ? 'text-green-500' : 'text-red-500'}`}>
                    {row.Assessment}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceSummary;
