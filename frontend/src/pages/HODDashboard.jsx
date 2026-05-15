import { useState, useEffect } from 'react';
import { Building2, AlertTriangle, Search, ChevronRight, Mail, UserX, BarChart3 } from 'lucide-react';
import client from '../api/client';

export default function HODDashboard() {
  const [profile] = useState(JSON.parse(localStorage.getItem('profile') || '{}'));
  const [overview, setOverview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    client.get('/api/hod/department/overview').then(res => setOverview(res.data)).catch(console.error);
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    const res = await client.get(`/api/hod/students/search?q=${searchQuery}`);
    setSearchResults(res.data);
    setSelectedStudent(null);
  };

  const viewStudent = async (roll_no) => {
    const res = await client.get(`/api/hod/student/${roll_no}/full-report`);
    setSelectedStudent(res.data);
  };

  const handleNotifyParent = async () => {
    if (!selectedStudent) return;
    setNotifying(true);
    try {
      await client.post(`/api/alerts/notify-parent/${selectedStudent.student.roll_no}`);
      alert(`Notification successfully sent to ${selectedStudent.student.name}'s parent.`);
    } catch (err) {
      console.error(err);
      alert("Failed to send notification.");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Profile Card */}
      <div className="bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl shadow-2xl border border-white/20 flex justify-between items-center relative">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(251,191,36,0.4)]">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">
              HOD Dashboard
            </h1>
            <p className="font-semibold mt-1 flex items-center gap-2 text-sm">
              <span className="text-white/80">{profile.name}</span>
              <span className="text-white/30">•</span>
              <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-500/30 shadow-inner">
                Department of {profile.department}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Overview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl shadow-inner">
                <BarChart3 className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="font-heading font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300 tracking-tight">Overview</h2>
            </div>
            
            {overview && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-cyan-600 to-blue-800 p-4 rounded-2xl text-center shadow-[0_0_20px_rgba(6,182,212,0.3)] border border-cyan-500/50 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="font-heading text-4xl font-black text-white drop-shadow-lg">{overview.total_students || 0}</div>
                      <div className="text-[10px] font-bold text-cyan-200 uppercase mt-1 tracking-[0.1em]">Students</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-fuchsia-600 to-purple-800 p-4 rounded-2xl text-center shadow-[0_0_20px_rgba(217,70,239,0.3)] border border-fuchsia-500/50 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="font-heading text-4xl font-black text-white drop-shadow-lg">{overview.total_faculty || 0}</div>
                      <div className="text-[10px] font-bold text-fuchsia-200 uppercase mt-1 tracking-[0.1em]">Faculty</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Recently Added</h3>
                  <div className="space-y-3">
                    {overview.recent_students?.map((s, i) => (
                      <div key={'s'+i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 shadow-inner">
                        <span className="font-bold text-white/80 text-sm">{s.name}</span>
                        <span className="px-2 py-1 text-[10px] font-black rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">Student</span>
                      </div>
                    ))}
                    {overview.recent_faculty?.map((f, i) => (
                      <div key={'f'+i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 shadow-inner">
                        <span className="font-bold text-white/80 text-sm">{f.name}</span>
                        <span className="px-2 py-1 text-[10px] font-black rounded-lg bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 uppercase">Faculty</span>
                      </div>
                    ))}
                    {!overview.recent_students?.length && !overview.recent_faculty?.length && (
                      <div className="text-center text-white/30 text-xs font-bold py-4">No users registered yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Search & Drilldown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-5 md:p-6 min-h-[400px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-xl shadow-inner">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="font-heading font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 tracking-tight">Student Lookup</h2>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-3 relative">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-white/30" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search by Name or Roll No..." 
                  className="w-full pl-11 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl font-bold text-white placeholder-white/30 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all shadow-inner text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 transition-all flex items-center gap-1.5">
                Search
              </button>
            </form>

            {searchResults.length > 0 && !selectedStudent && (
              <div className="mt-6 border border-white/10 rounded-2xl overflow-hidden shadow-inner bg-black/20 animate-in fade-in slide-in-from-bottom-4">
                <table className="w-full text-left">
                  <thead className="bg-black/40 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em]">Roll No</th>
                      <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em]">Name</th>
                      <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em]">Sem/Sec</th>
                      <th className="px-6 py-4 font-bold text-white/50 text-[10px] uppercase tracking-[0.2em] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {searchResults.map(s => (
                      <tr key={s.roll_no} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-bold text-cyan-300/70 text-sm">{s.roll_no}</td>
                        <td className="px-6 py-4 font-heading font-bold text-sm text-white">{s.name}</td>
                        <td className="px-6 py-4 font-bold text-white/50 text-xs">Sem {s.semester} • {s.section}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => viewStudent(s.roll_no)}
                            className="inline-flex items-center gap-1 text-cyan-300 font-bold hover:text-cyan-200 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 px-3 py-1.5 rounded-lg transition-all shadow-sm text-xs"
                          >
                            Report <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedStudent && (
              <div className="mt-6 p-6 border border-white/20 rounded-2xl bg-black/40 shadow-inner relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                    <h3 className="font-heading text-2xl font-black text-white">{selectedStudent.student.name}</h3>
                    <p className="text-white/60 font-bold mt-1.5 flex items-center gap-2 text-xs">
                      <span className="bg-white/10 border border-white/20 px-2 py-0.5 rounded-md shadow-inner text-white/90">{selectedStudent.student.roll_no}</span>
                      <span className="text-white/20">•</span>
                      <span>Sem {selectedStudent.student.semester}</span>
                      <span className="text-white/20">•</span>
                      <span>Sec {selectedStudent.student.section}</span>
                    </p>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="text-white/50 hover:text-white font-bold text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg shadow-sm transition-colors hover:bg-white/10">
                    Close View
                  </button>
                </div>
                
                <h4 className="font-bold text-white/40 mb-3 text-[10px] uppercase tracking-[0.2em] relative z-10">Subject Attendance Report</h4>
                <div className="space-y-2.5 relative z-10">
                  {selectedStudent.attendance.map(sub => (
                    <div key={sub.subject_id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner hover:bg-white/10 transition-colors">
                      <div>
                        <div className="font-heading font-bold text-sm text-white/90">{sub.subject_name}</div>
                        <div className="text-xs font-bold text-white/40 mt-0.5 uppercase tracking-wider">{sub.present} / {sub.total} classes</div>
                      </div>
                      <span className={`px-3 py-1.5 text-xs font-black rounded-lg border shadow-sm ${
                        sub.percentage >= 75 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {sub.percentage}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-4 relative z-10">
                  <button className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-sm py-2.5 rounded-xl hover:scale-[1.02] shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warning Letter
                  </button>
                  <button 
                    onClick={handleNotifyParent}
                    disabled={notifying}
                    className="flex-1 bg-white/5 border-2 border-white/10 text-white/90 font-black text-sm py-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 shadow-inner disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    {notifying ? 'Sending...' : 'Notify Parent'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
