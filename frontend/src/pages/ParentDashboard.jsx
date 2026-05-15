import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, BellRing, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import client from '../api/client';

export default function ParentDashboard() {
  const [profile] = useState(JSON.parse(localStorage.getItem('profile') || '{}'));
  const [attendance, setAttendance] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    if (profile.student_roll_no) {
      client.get(`/api/students/${profile.student_roll_no}/attendance`)
        .then(res => setAttendance(res.data))
        .catch(console.error);
        
      client.get(`/api/alerts/${profile.student_roll_no}`)
        .then(res => setAlerts(res.data))
        .catch(console.error);
    }
  }, [profile.student_roll_no]);

  const mockTrends = [
    { month: 'Jan', attendance: 85 },
    { month: 'Feb', attendance: 78 },
    { month: 'Mar', attendance: 82 },
    { month: 'Apr', attendance: 71 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Profile Card */}
      <div className="bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl shadow-2xl border border-white/20 flex justify-between items-center relative">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
              Hello, {profile.name}
            </h1>
            <p className="font-semibold mt-1 flex items-center gap-2">
              <span className="bg-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-lg border border-fuchsia-500/30 text-xs shadow-inner">
                Ward: {profile.student_name} ({profile.student_roll_no})
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Trend Chart */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 md:p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-xl shadow-inner">
              <TrendingUp className="w-4 h-4 text-fuchsia-400" />
            </div>
            <h2 className="font-heading font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-rose-300 tracking-tight">Monthly Trends</h2>
          </div>
          <div className="h-56 w-full flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTrends}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 700}} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 700}} domain={[0, 100]} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 12px -3px rgba(0,0,0,0.5)', padding: '10px'}} 
                  itemStyle={{color: '#fff', fontWeight: '900', fontFamily: 'Outfit', fontSize: '14px'}}
                />
                <Bar dataKey="attendance" fill="url(#colorUv)" radius={[6, 6, 0, 0]} barSize={35} />
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Alerts */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl shadow-inner relative">
              <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <BellRing className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="font-heading font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300 tracking-tight">Recent Alerts</h2>
          </div>
          
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-10 text-white/40 font-bold text-xs">
                No new alerts. Your ward is doing great!
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`group border p-4 rounded-2xl flex gap-4 hover:scale-[1.02] transition-transform duration-300 shadow-lg ${
                  alert.type === 'absence' ? 'bg-gradient-to-r from-orange-900/40 to-black/20 border-orange-500/30 shadow-orange-500/10' :
                  'bg-gradient-to-r from-rose-900/40 to-black/20 border-rose-500/30 shadow-rose-500/10'
                }`}>
                  <div className="mt-1">
                    {alert.type === 'absence' ? 
                      <AlertCircle className="w-6 h-6 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" /> : 
                      <AlertCircle className="w-6 h-6 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    }
                  </div>
                  <div>
                    <h4 className={`font-heading text-sm font-black ${alert.type === 'absence' ? 'text-orange-200' : 'text-rose-200'}`}>{alert.title}</h4>
                    <p className="text-xs font-bold text-white/60 mt-1">{alert.message}</p>
                    <span className={`inline-block mt-2 bg-black/40 border px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      alert.type === 'absence' ? 'text-orange-400 border-orange-500/20' : 'text-rose-400 border-rose-500/20'
                    }`}>
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Subject Table */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 bg-black/20 flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-fuchsia-400" />
          <h2 className="font-heading font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-rose-300">Subject Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40 text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4 text-center">Classes Attended</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attendance.map((sub, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-heading font-bold text-sm text-white group-hover:text-fuchsia-300 transition-colors">{sub.subject_name}</td>
                  <td className="px-6 py-4 text-center text-xs font-black text-white/70">
                    <span className="bg-black/30 border border-white/10 px-3 py-1.5 rounded-lg shadow-inner">
                      {sub.present} / {sub.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[3.5rem] px-3 py-1.5 text-xs font-black rounded-lg border shadow-sm ${
                      sub.percentage >= 75 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10' :
                      sub.percentage >= 60 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10' : 
                      'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/10'
                    }`}>
                      {sub.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center py-16 text-white/40 font-bold text-sm">
                    No records found for this ward.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
