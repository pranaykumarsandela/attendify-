import React, { useState } from 'react';
import { KeyRound, X, Loader2 } from 'lucide-react';
import client from '../api/client';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 1) {
      setError("Password cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const role = localStorage.getItem('role');
      const profileStr = localStorage.getItem('profile');
      if (!profileStr) throw new Error("Profile not found");
      
      const profile = JSON.parse(profileStr);
      // For HOD, email is in profile.email
      const email = profile.email || profile.student_email || profile.parent_email;

      await client.post('/api/auth/change-password', {
        email,
        role,
        old_password: oldPassword,
        new_password: newPassword
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
              <KeyRound className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Change Password</h2>
              <p className="text-sm text-white/50">Update your account password</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="py-8 text-center text-emerald-400">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <KeyRound className="w-8 h-8" />
              </div>
              <p className="font-bold">Password successfully updated!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Current Password</label>
                <input 
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">New Password</label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
