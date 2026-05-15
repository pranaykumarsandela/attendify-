import { useState, useEffect } from 'react';
import { Users, AlertTriangle, Video, Clock, CheckCircle2 } from 'lucide-react';
import CameraFeed from '../components/CameraFeed';
import client from '../api/client';
import useWebSocket from '../hooks/useWebSocket';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('roll');
  const [profile] = useState(JSON.parse(localStorage.getItem('profile') || '{}'));
  const [subjectId, setSubjectId] = useState(() => {
    if (Array.isArray(profile.subjects) && profile.subjects.length > 0) return profile.subjects[0].id;
    return null;
  });
  const [todaysRoll, setTodaysRoll] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [finalizing, setFinalizing] = useState(false);
  const { subscribe } = useWebSocket('ws://localhost:8000/api/camera/stream');

  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      if (data.type === 'marked' && String(data.subject_id) === String(subjectId)) {
        setTodaysRoll(prev => {
          // Update time if already exists
          const exists = prev.find(r => r.roll_no === data.roll_no);
          if (exists) {
            return prev.map(r => 
              r.roll_no === data.roll_no 
                ? { ...r, marked_at: data.timestamp } 
                : r
            );
          }
          return [{
            roll_no: data.roll_no,
            name: data.name,
            marked_at: data.timestamp,
            status: data.status
          }, ...prev];
        });
      }
    });
    return unsubscribe;
  }, [subscribe, subjectId]);

  useEffect(() => {
    const fetchAtRisk = async () => {
      try {
        const res = await client.get(`/api/teacher/at-risk?subject_id=${subjectId}`);
        setAtRisk(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    
    if (activeTab === 'at-risk') fetchAtRisk();
  }, [activeTab, subjectId]);

  const handleFinalize = async () => {
    if (!window.confirm("Are you sure you want to end the session? This will mark all un-recognized students as absent and notify their parents immediately.")) return;
    setFinalizing(true);
    try {
      const res = await client.post(`/api/alerts/finalize-daily-attendance/${subjectId}`);
      alert(`Session ended. ${res.data.absent_count} absence alerts sent to parents.`);
      setTodaysRoll([]); // Clear the live log on session close
      // Refresh at risk stats
      if (activeTab === 'at-risk') {
        const arRes = await client.get(`/api/teacher/at-risk?subject_id=${subjectId}`);
        setAtRisk(arRes.data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to finalize attendance.");
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Profile Card */}
      <div className="bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl shadow-2xl border border-white/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xl font-heading font-black shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            {profile.name?.charAt(0) || 'T'}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
              Welcome back, {profile.name}
            </h1>
            <p className="font-semibold mt-1 flex items-center gap-1.5 text-cyan-300 text-xs">
              <Users className="w-3.5 h-3.5" /> Faculty Dashboard
            </p>
          </div>
        </div>
        <div className="w-full md:w-auto">
          <select 
            value={subjectId || ''}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            className="bg-black/40 border-2 border-white/10 text-cyan-100 font-bold text-xs rounded-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 block w-full md:w-56 p-2.5 transition-all shadow-inner outline-none"
          >
            {Array.isArray(profile.subjects) && profile.subjects.map(s => (
              <option key={s.id} value={s.id} className="bg-slate-900">
                {s.name} (Sem {s.semester})
              </option>
            ))}
            {(!Array.isArray(profile.subjects) || profile.subjects.length === 0) && (
              <option value="" disabled className="bg-slate-900">No Subjects Assigned</option>
            )}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-xl rounded-xl shadow-inner border border-white/10 w-full md:w-fit">
        {[
          { id: 'roll', label: "Live Session", icon: Video },
          { id: 'at-risk', label: 'At-Risk Students', icon: AlertTriangle }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : ''}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 md:p-6 min-h-[400px]">
        {activeTab === 'roll' && (
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Camera Column */}
            <div className="w-full xl:w-[600px] flex-shrink-0">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  Camera Feed
                </h3>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-black/50 relative">
                <CameraFeed subjectId={subjectId} />
              </div>
            </div>
            
            {/* Today's Roll Table */}
            <div className="flex-1 flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-heading font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300 flex items-center gap-2">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  </div>
                  Live Log
                </h3>
                <div className="flex gap-2">
                  <span className="text-[10px] font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)] flex items-center">
                    {todaysRoll.length} Present
                  </span>
                  <button onClick={handleFinalize} disabled={finalizing} className="text-[10px] font-black bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 px-3 py-1 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    <AlertTriangle className="w-3 h-3" /> {finalizing ? 'Sending...' : 'End & Alert'}
                  </button>
                </div>
              </div>
              
              <div className="border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col shadow-inner bg-black/20">
                <div className="overflow-y-auto max-h-[380px]">
                  <table className="w-full text-left">
                    <thead className="bg-black/40 sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-5 py-3 font-bold text-white/50 uppercase tracking-[0.2em] text-[10px]">Student</th>
                        <th className="px-5 py-3 font-bold text-white/50 uppercase tracking-[0.2em] text-[10px]">Status</th>
                        <th className="px-5 py-3 font-bold text-white/50 uppercase tracking-[0.2em] text-[10px] text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {todaysRoll.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center py-16">
                            <div className="flex flex-col items-center justify-center text-white/30">
                              <Users className="w-12 h-12 mb-3 opacity-20" />
                              <p className="font-heading text-lg font-bold">No attendance marked yet.</p>
                              <p className="text-xs mt-1">Start the camera to begin recognizing faces.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        todaysRoll.map((rec, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-3">
                              <div className="font-heading font-bold text-sm text-white">{rec.name}</div>
                              <div className="text-[10px] font-bold text-cyan-300/70 mt-0.5 uppercase tracking-wider">{rec.roll_no}</div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold shadow-sm">
                                <CheckCircle2 className="w-3 h-3" />
                                Present
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="inline-flex items-center gap-1.5 text-white/60 font-bold bg-black/30 px-2.5 py-1 rounded-lg border border-white/5 text-xs">
                                <Clock className="w-3 h-3 text-cyan-400" />
                                {new Date(rec.marked_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'at-risk' && (
          <div className="animate-in fade-in duration-300">
            <h3 className="font-heading font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Below 75% Attendance
            </h3>
            <div className="border border-white/10 rounded-2xl overflow-hidden shadow-inner bg-black/20">
              <table className="w-full text-left">
                <thead className="bg-black/40">
                  <tr>
                    <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em]">Student</th>
                    <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em]">Current</th>
                    <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em]">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {atRisk.map((s, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-heading font-bold text-sm text-white">{s.name}</div>
                        <div className="text-[10px] font-bold text-rose-300/70 mt-0.5 uppercase tracking-wider">{s.roll_no}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-[100px] bg-black/40 rounded-full h-2 border border-white/5 shadow-inner">
                            <div className="bg-gradient-to-r from-rose-600 to-orange-500 h-full rounded-full" style={{ width: `${s.percentage}%` }}></div>
                          </div>
                          <span className="text-rose-400 font-black text-sm">{s.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold shadow-sm shadow-amber-500/10">
                          Needs {s.classes_needed} consecutive classes
                        </span>
                      </td>
                    </tr>
                  ))}
                  {atRisk.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center py-16">
                         <div className="flex flex-col items-center justify-center text-white/30">
                            <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400/50 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                            <p className="font-heading text-lg font-black text-white/80">All Good!</p>
                            <p className="text-xs font-medium mt-1">No students are currently at risk.</p>
                          </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
