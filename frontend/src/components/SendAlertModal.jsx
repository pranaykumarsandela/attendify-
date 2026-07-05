import React, { useState } from 'react';
import { Send, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import client from '../api/client';

export default function SendAlertModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('all'); // 'all' or roll_no
  const [recipientType, setRecipientType] = useState('both'); // 'student', 'parent', 'both'
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', text: '' }

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await client.post('/api/alerts/custom', {
        title,
        message,
        recipient,
        recipient_type: recipientType
      });
      
      const targetEmails = res.data.emails_to_send || [];
      if (targetEmails.length > 0) {
        setStatus({ type: 'success', text: `Sending to ${targetEmails.length} recipients...` });
        
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx50Ah9t-LG_DR7eE_-JcjgYgqtRdwyXGAsqAcukZYV122W00DuotCCmvizeVb0Pxq_/exec";
        
        for (const email of targetEmails) {
          try {
            await fetch(SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                to: email,
                subject: title,
                message: `<div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <h2 style="color: #0f172a; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">FRAS Notification System</h2>
                    <p style="font-size: 16px;">${message.replace(/\\n/g, '<br>')}</p>
                    <br>
                    <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                        This is an automated message from the Face Recognition Attendance System. Please do not reply directly to this email.
                    </p>
                </div>`
              })
            });
          } catch(e) {
            console.error("Failed to send email to", email, e);
          }
        }
      }

      setStatus({ type: 'success', text: res.data.message });
      setTimeout(() => {
        onClose();
        setStatus(null);
        setTitle('');
        setMessage('');
        setRecipient('all');
        setRecipientType('both');
      }, 2000);
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.detail || 'Failed to send alert.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
            <Send className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Send Custom Alert</h2>
            <p className="text-xs font-medium text-white/50">Notify students and/or parents instantly</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1">Target Audience</label>
              <select 
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="all">Entire College/Class</option>
                {/* Normally we'd fetch a list of students here. For now, they can type it in or use 'all' */}
              </select>
            </div>
            
            {recipient !== 'all' && (
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Student Roll No</label>
                <input 
                  type="text" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="e.g. 100523733091"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}
            {recipient === 'all' && (
              <div>
                <label className="block text-xs font-bold text-white/70 mb-1">Specific Roll No</label>
                <button type="button" onClick={() => setRecipient('')} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-2.5 text-sm text-white/70 transition-colors">
                  Specify Student
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Send To</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10 bg-black/50">
              {['student', 'parent', 'both'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRecipientType(type)}
                  className={`flex-1 py-2 text-xs font-bold capitalize transition-colors ${
                    recipientType === type ? 'bg-amber-500/20 text-amber-400' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Alert Title</label>
            <input 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upcoming Internal Exams"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Message Body</label>
            <textarea 
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          {status && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-bold ${
              status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {status.text}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Send Alert via Email'}
              <Send className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
