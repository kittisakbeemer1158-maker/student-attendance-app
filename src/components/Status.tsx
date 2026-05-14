import type { AttendanceLog } from '../types';
import { CheckCircle, Clock } from 'lucide-react';

interface Props {
  attendanceLogs: AttendanceLog[];
}

const Status = ({ attendanceLogs }: Props) => {
  // Group by date and subject to show "Completed" sessions
  const sessions = attendanceLogs.reduce((acc: any, log) => {
    const key = `${log.Date.split('T')[0]}_${log.Grade}_${log.Subject}`;
    if (!acc[key]) {
      acc[key] = {
        date: log.Date.split('T')[0],
        grade: log.Grade,
        subject: log.Subject,
        count: 0
      };
    }
    acc[key].count++;
    return acc;
  }, {});

  const sessionList = Object.values(sessions);

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-2xl font-bold text-pink-600 mb-6">✅ สถานะการบันทึก</h2>
      
      <div className="space-y-4">
        {sessionList.length === 0 ? (
          <p className="text-gray-500 text-center py-10">ยังไม่มีข้อมูลการบันทึก</p>
        ) : (
          sessionList.map((session: any, index: number) => (
            <div key={index} className="flex items-center p-4 bg-pink-50 rounded-xl border border-pink-100">
              <div className="bg-green-500 p-2 rounded-full mr-4">
                <CheckCircle className="text-white w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800">{session.subject} - {session.grade}</h3>
                <p className="text-sm text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" /> {session.date} | บันทึกแล้ว {session.count} คน
                </p>
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                สำเร็จ
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Status;
