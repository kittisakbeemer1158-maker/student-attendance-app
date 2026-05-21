import { useState } from 'react';
import type { Student } from '../types';
import { updateStudentsOnServer } from '../api';
import { Trash2, UserPlus, Save, X } from 'lucide-react';

interface Props {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const StudentManager = ({ students, setStudents }: Props) => {
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [isAddingNewRoom, setIsAddingNewRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');

  // Extract unique rooms
  const uniqueRooms = Array.from(new Set(students.map(s => `${s.Grade || ''} ${s.Room || ''}`.trim()))).filter(Boolean);

  const handleRoomSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ADD_NEW') {
      setIsAddingNewRoom(true);
      setSelectedRoom('');
      setNewGrade('');
      setNewRoom('');
    } else {
      setIsAddingNewRoom(false);
      setSelectedRoom(val);
      if (val) {
        const parts = val.split(' ');
        setNewGrade(parts[0] || '');
        setNewRoom(parts.slice(1).join(' ') || '');
      } else {
        setNewGrade('');
        setNewRoom('');
      }
    }
  };

  const handleAdd = () => {
    if (!newName) return alert('กรุณากรอกชื่อนักเรียน');
    if (!newGrade) return alert('กรุณาระบุห้องเรียน');
    
    const newStudent: Student = {
      ID: Date.now().toString(),
      Name: newName,
      Grade: newGrade,
      Room: newRoom
    };
    setStudents([...students, newStudent]);
    setNewName('');
    
    // Auto-select the newly added room if it was a new room
    if (isAddingNewRoom) {
      setIsAddingNewRoom(false);
      setSelectedRoom(`${newGrade} ${newRoom}`.trim());
    }
  };

  const handleRemove = (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบนักเรียนคนนี้?')) {
      setStudents(students.filter(s => s.ID !== id));
    }
  };

  const handleBatchSave = async () => {
    try {
      await updateStudentsOnServer(students);
      alert('บันทึกรายชื่อนักเรียนลง Google Sheets เรียบร้อยแล้ว');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Group students by Room
  const groupedStudents = students.reduce((acc, student) => {
    const roomKey = `${student.Grade} ${student.Room}`.trim() || 'ไม่ระบุห้อง';
    if (!acc[roomKey]) {
      acc[roomKey] = [];
    }
    acc[roomKey].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Sort room keys
  const sortedRooms = Object.keys(groupedStudents).sort();

  return (
    <div className="p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-xl md:text-2xl font-bold text-pink-600 mb-6 flex items-center">👤 จัดการรายชื่อนักเรียน</h2>
      
      <div className="mb-8 bg-pink-50 p-4 md:p-6 rounded-2xl border border-pink-100">
        <h3 className="font-bold text-pink-700 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> เพิ่มนักเรียนใหม่
        </h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="ชื่อ-นามสกุล" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              className="rounded-xl border-pink-200 focus:border-pink-500 focus:ring-pink-500 text-sm py-2.5" 
            />
            
            {!isAddingNewRoom ? (
              <select 
                value={selectedRoom} 
                onChange={handleRoomSelect} 
                className="rounded-xl border-pink-200 focus:border-pink-500 focus:ring-pink-500 text-sm py-2.5"
              >
                <option value="">-- เลือกห้องเรียน --</option>
                {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="ADD_NEW" className="font-bold text-pink-600">+ สร้างห้องเรียนใหม่...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="ชั้น (เช่น ม.1)" 
                  value={newGrade} 
                  onChange={e => setNewGrade(e.target.value)} 
                  className="w-full rounded-xl border-pink-200 focus:border-pink-500 focus:ring-pink-500 text-sm py-2.5" 
                />
                <input 
                  type="text" 
                  placeholder="ห้อง (เช่น /1)" 
                  value={newRoom} 
                  onChange={e => setNewRoom(e.target.value)} 
                  className="w-full rounded-xl border-pink-200 focus:border-pink-500 focus:ring-pink-500 text-sm py-2.5" 
                />
                <button 
                  onClick={() => setIsAddingNewRoom(false)} 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <button 
              onClick={handleAdd} 
              className="bg-pink-500 text-white rounded-xl flex items-center justify-center font-bold hover:bg-pink-600 transition-colors shadow-md shadow-pink-100 py-2.5 active:scale-95"
            >
              เพิ่มเข้าห้อง
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        {sortedRooms.map(room => (
          <div key={room} className="border border-pink-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-pink-50 px-4 md:px-6 py-3 border-b border-pink-100 flex justify-between items-center">
              <h3 className="text-sm md:text-md font-bold text-pink-700">ห้องเรียน: {room}</h3>
              <span className="text-[10px] md:text-xs text-pink-500 bg-white px-3 py-1 rounded-full font-black border border-pink-200">
                {groupedStudents[room].length} คน
              </span>
            </div>
            
            <div className="divide-y divide-pink-50">
              {groupedStudents[room].map(student => (
                <div key={student.ID} className="px-4 md:px-6 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                  <span className="text-sm font-medium text-gray-700">{student.Name}</span>
                  <button 
                    onClick={() => handleRemove(student.ID)} 
                    className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-xl transition-all active:scale-90"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {sortedRooms.length === 0 && (
          <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            ไม่มีข้อมูลนักเรียน
          </div>
        )}
      </div>

      <button 
        onClick={handleBatchSave} 
        className="w-full bg-blue-500 text-white py-4 rounded-2xl font-black hover:bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100 transition-all active:scale-[0.98] uppercase tracking-wider text-sm"
      >
        <Save className="w-5 h-5 mr-2" /> บันทึกข้อมูลลง Google Sheets
      </button>
    </div>
  );
};

export default StudentManager;
