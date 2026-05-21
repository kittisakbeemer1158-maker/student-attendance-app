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
    <div className="p-4 md:p-6 bg-white rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-xl md:text-2xl font-bold text-pink-600 mb-6 flex items-center">✅ สถานะการบันทึก</h2>
      
      <div className="space-y-3">
        {sessionList.length === 0 ? (
          <p className="text-gray-500 text-center py-10">ยังไม่มีข้อมูลการบันทึก</p>
        ) : (
          sessionList.map((session: any, index: number) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center p-4 bg-pink-50 rounded-2xl border border-pink-100 gap-3">
              <div className="flex items-center flex-1">
                <div className="bg-green-500 p-2 rounded-full mr-3 shrink-0">
                  <CheckCircle className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{session.subject} - {session.grade}</h3>
                  <p className="text-xs text-gray-500 flex items-center mt-0.5">
                    <Clock className="w-3 h-3 mr-1" /> {session.date} | บันทึกแล้ว {session.count} คน
                  </p>
                </div>
              </div>
              <div className="flex sm:block justify-end">
                <span className="text-[10px] font-black text-green-600 bg-white px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest">
                  สำเร็จ
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Status;
