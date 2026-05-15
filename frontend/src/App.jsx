import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Fingerprint, LogOut, UserPlus } from 'lucide-react';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import HODDashboard from './pages/HODDashboard';
import Register from './pages/Register';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('profile');
    navigate('/');
  };

  const isLogin = location.pathname === '/';

  return (
    <div className={`min-h-screen relative overflow-hidden bg-slate-950`}>
      {/* Dynamic Animated Colorful Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/30 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-600/30 blur-[150px] mix-blend-screen" />
        <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full bg-amber-500/20 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10">
        {!isLogin && (
          <nav className="bg-slate-900/40 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-4">
                  <Link to={`/${role}`} className="font-heading font-black text-xl tracking-tight flex items-center gap-2.5 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Fingerprint className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 animate-gradient-x">
                      FRAS
                    </span>
                  </Link>
                </div>
                <div className="flex items-center gap-5">
                  {role === 'hod' && (
                    <Link 
                      to="/register" 
                      className="flex items-center gap-2 text-xs font-bold text-fuchsia-300 hover:text-fuchsia-200 transition-colors bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/20 hover:border-fuchsia-500/40 px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(217,70,239,0.15)]"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Admin Portal
                    </Link>
                  )}
                  <div className="h-5 w-px bg-white/10"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs font-bold text-rose-300 hover:text-rose-200 px-3 py-2 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all duration-300 group"
                  >
                    <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main className={isLogin ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in zoom-in-95 duration-500'}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/hod" element={<HODDashboard />} />
            <Route path="/register" element={role === 'hod' ? <Register /> : <div className="text-white text-center mt-10">Access Denied. Only HOD can register faces.</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
