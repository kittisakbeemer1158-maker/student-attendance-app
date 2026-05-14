import type { AttendanceLog } from '../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Props {
  attendanceLogs: AttendanceLog[];
}

const Stats = ({ attendanceLogs }: Props) => {
  const statusCounts = attendanceLogs.reduce((acc: any, log) => {
    acc[log.Status] = (acc[log.Status] || 0) + 1;
    return acc;
  }, { 'มา': 0, 'สาย': 0, 'ลา': 0, 'ขาด': 0 });

  const pieData = {
    labels: ['มา 🌸', 'สาย ⏳', 'ลา ✉️', 'ขาด ❌'],
    datasets: [
      {
        data: [statusCounts['มา'], statusCounts['สาย'], statusCounts['ลา'], statusCounts['ขาด']],
        backgroundColor: ['#22c55e', '#eab308', '#3b82f6', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-pink-100">
      <h2 className="text-2xl font-bold text-pink-600 mb-6">📊 สถิติการมาเรียน</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-pink-50 p-6 rounded-2xl flex flex-col items-center">
          <h3 className="text-lg font-bold text-gray-700 mb-4">ภาพรวมสถานะ</h3>
          <div className="w-64 h-64">
            <Pie data={pieData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
            <p className="text-sm text-green-600 font-bold uppercase">มาเรียนทั้งหมด</p>
            <p className="text-3xl font-black text-green-700">{statusCounts['มา']}</p>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
            <p className="text-sm text-yellow-600 font-bold uppercase">สายทั้งหมด</p>
            <p className="text-3xl font-black text-yellow-700">{statusCounts['สาย']}</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600 font-bold uppercase">ขาดทั้งหมด</p>
            <p className="text-3xl font-black text-red-700">{statusCounts['ขาด']}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
