import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle2, XCircle, AlertTriangle, GraduationCap, Target, CalendarDays, Activity } from 'lucide-react';
import client from '../api/client';

export default function StudentDashboard() {
  const [profile, setProfile] = useState(JSON.parse(localStorage.getItem('profile') || '{}'));
  const [attendance, setAttendance] = useState([]);
  const [calendar, setCalendar] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, calRes] = await Promise.all([
          client.get(`/api/students/${profile.roll_no}/attendance`),
          client.get(`/api/students/${profile.roll_no}/attendance/calendar`)
        ]);
        setAttendance(attRes.data);
        setCalendar(calRes.data);
      } catch (err) {
        console.error("Failed to load attendance", err);
      } finally {
        setLoading(false);
      }
    };
    if (profile.roll_no) fetchData();
  }, [profile.roll_no]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
    </div>
  );

  const totalClasses = attendance.reduce((acc, curr) => acc + curr.total, 0);
  const totalPresent = attendance.reduce((acc, curr) => acc + curr.present, 0);
  const overallPercentage = totalClasses ? ((totalPresent / totalClasses) * 100).toFixed(1) : 0;
  const atRiskCount = attendance.filter(a => a.percentage < 75).length;

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl shadow-2xl border border-white/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(217,70,239,0.4)]">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
              {profile.name}
            </h1>
            <p className="font-semibold mt-1 flex items-center gap-2 text-xs">
              <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/30">{profile.roll_no}</span>
              <span className="text-white/40">•</span>
              <span className="text-fuchsia-300">Sem {profile.semester}</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300">Sec {profile.section}</span>
            </p>
          </div>
        </div>
        
        <div className="text-right bg-black/20 border border-white/10 px-5 py-3 rounded-2xl shadow-inner">
          <div className="flex items-baseline gap-1.5 justify-end">
            <span className="font-heading text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">{overallPercentage}</span>
            <span className="text-lg font-bold text-emerald-300/50">%</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 mt-1 flex items-center gap-1.5 justify-end">
            <Target className="w-3 h-3" /> Overall Attendance
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Progress', value: `${overallPercentage}%`, icon: Activity, color: 'text-cyan-300', from: 'from-cyan-500/20', border: 'border-cyan-500/30' },
          { label: 'Classes Attended', value: totalPresent, icon: CheckCircle2, color: 'text-emerald-300', from: 'from-emerald-500/20', border: 'border-emerald-500/30' },
          { label: 'Classes Missed', value: totalClasses - totalPresent, icon: XCircle, color: 'text-rose-300', from: 'from-rose-500/20', border: 'border-rose-500/30' },
          { label: 'At-Risk Subjects', value: atRiskCount, icon: AlertTriangle, color: 'text-amber-300', from: 'from-amber-500/20', border: 'border-amber-500/30' }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className={`p-5 rounded-2xl backdrop-blur-xl bg-gradient-to-br ${m.from} to-white/5 border ${m.border} flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-lg`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/20 border border-white/10 ${m.color} shadow-inner`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className={`font-heading text-2xl font-black ${m.color}`}>{m.value}</div>
                <div className="text-xs font-bold text-white/60 tracking-wider uppercase mt-0.5">{m.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* At-Risk Danger Box */}
      {atRiskCount > 0 && (
        <div className="bg-gradient-to-r from-rose-600/80 to-orange-600/80 backdrop-blur-md p-5 rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.3)] border border-rose-500/50 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-white">
          <div className="p-3 bg-black/20 rounded-xl border border-white/10 shadow-inner">
            <AlertTriangle className="w-6 h-6 text-rose-200" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-black text-white">Critical Attendance Warning</h3>
            <p className="text-rose-100 mt-1 text-sm">
              You are falling below the mandatory 75% in <strong className="text-white font-black px-1.5 bg-black/20 rounded">{atRiskCount} subject(s)</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Subject Table */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <h2 className="font-heading font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-cyan-300 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-fuchsia-400" /> Subject Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3 text-center">Classes</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 w-2/5">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attendance.map((sub, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-heading font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">{sub.subject_name}</div>
                    <div className="text-xs font-bold text-fuchsia-300/70 mt-0.5 uppercase tracking-wider">{sub.code}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 font-bold text-cyan-100 bg-cyan-900/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg text-xs">
                      <CalendarDays className="w-3 h-3 text-cyan-400" />
                      {sub.present} / {sub.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[3.5rem] px-2.5 py-1 text-xs font-black rounded-lg border shadow-sm ${
                      sub.percentage >= 75 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      sub.percentage >= 60 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 
                      'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {sub.percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                          sub.percentage >= 75 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' :
                          sub.percentage >= 60 ? 'bg-gradient-to-r from-amber-500 to-fuchsia-400' : 
                          'bg-gradient-to-r from-rose-500 to-orange-400'
                        }`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      >
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
