import React, { useState, useEffect } from 'react';
import { fetchLogs, saveLogs } from '../api';
import type { Student } from '../types';
import { Activity, Save } from 'lucide-react';

interface Props {
  students: Student[];
}

const HealthCheck: React.FC<Props> = ({ students }) => {
  const [week, setWeek] = useState(() => {
    // Start of current week (Monday)
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });
  
  const [records, setRecords] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSavedThisWeek, setIsSavedThisWeek] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  const categories = [
    { key: 'Clothes', label: '1. เสื้อผ้า' },
    { key: 'Hair', label: '2. ผม' },
    { key: 'Nails', label: '3. เล็บ' },
    { key: 'Body', label: '4. ร่างกาย' },
    { key: 'Teeth', label: '5. เหงือกฟัน' },
  ];

  const loadData = async () => {
    if (students.length === 0) return;
    setLoading(true);
    try {
      const res = await fetchLogs('getHealthLogs', { week });
      const weekLogs = res.logs || [];
      
      const newRecords: Record<string, any> = {};
      let foundAnyThisWeek = false;
      
      students.forEach(s => {
        const existing = weekLogs.find((l: any) => String(l.StudentID).trim() === String(s.ID).trim());
        if (existing) {
          foundAnyThisWeek = true;
          newRecords[s.ID] = {
            Clothes: existing.Clothes || '3',
            Hair: existing.Hair || '3',
            Nails: existing.Nails || '3',
            Body: existing.Body || '3',
            Teeth: existing.Teeth || '3',
            Remark: existing.Remark || ''
          };
        } else {
          newRecords[s.ID] = {
            Clothes: '3', Hair: '3', Nails: '3', Body: '3', Teeth: '3', Remark: ''
          };
        }
      });
      
      setRecords(newRecords);
      if (foundAnyThisWeek) {
        setIsSavedThisWeek(true);
        setIsEditMode(false);
      } else {
        setIsSavedThisWeek(false);
        setIsEditMode(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [week, students]);

  const handleChange = (studentId: string, field: string, value: string) => {
    if (!isEditMode) return;
    setRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const logsToSave = students.map(s => ({
        Week: week,
        StudentID: s.ID,
        ...records[s.ID]
      }));
      await saveLogs('saveHealthLogs', logsToSave);
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
      setIsSavedThisWeek(true);
      setIsEditMode(false);
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
          <Activity className="w-6 h-6 mr-2 text-green-500" />
          บันทึกการตรวจสุขภาพประจำสัปดาห์
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">สัปดาห์ของวันที่:</label>
            <input
              type="date"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              className="rounded-xl border-gray-200 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
            />
          </div>
          {isEditMode && (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          )}
        </div>
      </div>

      {isSavedThisWeek && !isEditMode && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-green-800 font-bold text-lg">
            ✅ สัปดาห์นี้บันทึกแล้ว
          </div>
          <button 
            onClick={() => setIsEditMode(true)} 
            className="bg-white text-green-700 border border-green-300 px-4 py-2 rounded-lg font-bold hover:bg-green-100 transition-colors shadow-sm"
          >
            ✏️ บันทึกใหม่
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm text-center">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-600">เลขที่/รหัส</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-left">ชื่อ-สกุล</th>
              {categories.map(c => (
                <th key={c.key} className="px-2 py-3 font-semibold text-gray-600">{c.label}</th>
              ))}
              <th className="px-4 py-3 font-semibold text-gray-600 text-left">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูลนักเรียน</td>
              </tr>
            ) : (
              students.map((student, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{student.ID}</td>
                  <td className="px-4 py-3 text-left font-medium text-gray-900">{student.Name}</td>
                  
                  {categories.map(c => (
                    <td key={c.key} className="px-2 py-3">
                      <select
                        value={records[student.ID]?.[c.key] || '3'}
                        onChange={(e) => handleChange(student.ID, c.key, e.target.value)}
                        disabled={!isEditMode}
                        className={`text-xs rounded-lg border-gray-200 shadow-sm focus:ring-green-500 focus:border-green-500 font-medium
                          ${records[student.ID]?.[c.key] === '3' ? 'text-green-600' : ''}
                          ${records[student.ID]?.[c.key] === '2' ? 'text-yellow-600' : ''}
                          ${records[student.ID]?.[c.key] === '1' ? 'text-red-600' : ''}
                          ${!isEditMode ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}
                        `}
                      >
                        <option value="3">3 = ดี</option>
                        <option value="2">2 = พอใช้</option>
                        <option value="1">1 = แก้ไข</option>
                      </select>
                    </td>
                  ))}
                  
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="หมายเหตุ..."
                      value={records[student.ID]?.Remark || ''}
                      onChange={(e) => handleChange(student.ID, 'Remark', e.target.value)}
                      disabled={!isEditMode}
                      className={`w-full text-xs rounded-lg border-gray-200 shadow-sm focus:border-green-500 focus:ring-green-500 ${!isEditMode ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-xs text-gray-500 flex gap-4">
        <span><strong className="text-green-600">3</strong> = ดี</span>
        <span><strong className="text-yellow-600">2</strong> = พอใช้</span>
        <span><strong className="text-red-600">1</strong> = แก้ไข</span>
      </div>
    </div>
  );
};

export default HealthCheck;
