import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, Mail, Users, GraduationCap, Building2, UserCircle, ArrowRight } from 'lucide-react';
import client from '../api/client';

export default function Login() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123'); // pre-fill for demo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await client.post('/api/auth/login', { email, password, role });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('profile', JSON.stringify(res.data.profile));
      navigate(`/${res.data.role}`);
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address to reset your password.');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post('/api/auth/forgot-password', { email, role });
      alert(res.data.message);
    } catch (err) {
      setError('Failed to send password reset link.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', icon: UserCircle },
    { id: 'parent', label: 'Parent', icon: Users },
    { id: 'teacher', label: 'Faculty', icon: GraduationCap },
    { id: 'hod', label: 'HOD', icon: Building2 },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden relative z-10">
        
        {/* Left Side: Branding / Info */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-cyan-900/40 to-fuchsia-900/40 p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden border-r border-white/10">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 rounded-xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(6,182,212,0.5)] group hover:scale-105 hover:rotate-3 transition-transform duration-300">
              <Fingerprint className="w-6 h-6 text-white group-hover:text-cyan-200 transition-colors" />
            </div>
            <h1 className="font-heading text-2xl lg:text-3xl font-black tracking-tight leading-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-300">
              Welcome to <br/><span className="text-white">FRAS Portal</span>
            </h1>
            <p className="text-cyan-100/80 font-medium text-sm leading-relaxed max-w-sm">
              The next generation Face Recognition Attendance System. Secure, fast, and seamless.
            </p>
          </div>

          <div className="relative z-10 mt-10 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-inner">
            <h3 className="font-heading font-bold text-lg text-white mb-1.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" /> Secure Login
            </h3>
            <p className="text-xs font-medium text-cyan-100/70">
              Your biometric data is protected with enterprise-grade encryption.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-7/12 p-8 lg:p-10 bg-black/40 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">
            <h2 className="font-heading text-xl font-black text-white mb-1.5">Sign in to your account</h2>
            <p className="text-white/50 text-sm font-bold mb-6">Select your role to continue</p>
            
            {/* Role Selector */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300 group ${
                      isActive 
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 transition-transform duration-300 ${isActive ? 'scale-110 text-cyan-400' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{r.label}</span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-lg text-xs font-bold mb-5 flex items-center gap-2 animate-pulse shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === 'student' ? "21CS047@college.edu" : "email@college.edu"}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider">Password</label>
                  <button type="button" onClick={handleForgotPassword} className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors">Forgot password?</button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-white/30 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type="password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all shadow-inner"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm py-3 px-4 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 mt-6"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
            
            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <div className="inline-block bg-white/5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white/50 border border-white/10 shadow-inner">
                Admin Credentials: venkat@college.edu / demo123 (HOD)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
