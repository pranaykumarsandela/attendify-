import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { Camera, CheckCircle2, ArrowRight, Building2, Search, Edit3 } from 'lucide-react';

export default function Register() {
  const [activeTab, setActiveTab] = useState('student'); // 'student', 'faculty', 'edit'
  const navigate = useNavigate();

  // FACULTY STATE
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facPass, setFacPass] = useState('');
  const [facSubs, setFacSubs] = useState('');
  const [facSemester, setFacSemester] = useState(1);
  const [facSuccess, setFacSuccess] = useState('');
  const [facError, setFacError] = useState('');
  const [isFacLoading, setIsFacLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [studentDetails, setStudentDetails] = useState({
    roll_no: '', name: '', semester: 5, section: 'A', branch: 'CSE', student_email: '', parent_email: '', parent_name: '', password: ''
  });
  const [studentError, setStudentError] = useState('');
  const [capturedBlobs, setCapturedBlobs] = useState([]);
  const [qualities, setQualities] = useState([]);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // EDIT STATE
  const [editType, setEditType] = useState('student'); // 'student' or 'faculty'
  const [searchQuery, setSearchQuery] = useState('');
  const [editData, setEditData] = useState(null);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Handle Faculty Submit
  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    setFacError('');
    setFacSuccess('');
    setIsFacLoading(true);
    try {
      await client.post('/api/admin/faculty', {
        name: facName,
        email: facEmail,
        password: facPass,
        subjects: facSubs,
        semester: facSemester
      });
      setFacSuccess("Faculty account created successfully!");
      setFacName(''); setFacEmail(''); setFacPass(''); setFacSubs(''); setFacSemester(1);
    } catch (err) {
      setFacError("Error creating faculty account.");
    } finally {
      setIsFacLoading(false);
    }
  };

  // Handle Student Detail Submit (Step 1)
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setStudentError('');
    try {
      await client.post('/api/admin/student', studentDetails);
      setStep(2);
    } catch (err) {
      setStudentError("Error creating student record. Roll number might already exist.");
    }
  };

  // STEP 2 - Camera Setup
  useEffect(() => {
    if (step === 2 && activeTab === 'student') {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          setStudentError("Cannot access camera");
        });
    }
    
    return () => {
      if (step !== 2 && step !== 3 && streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [step, activeTab]);

  // STEP 3 - Capture 5 photos
  const startCapture = async () => {
    setStep(3);
    setIsCapturing(true);
    setCapturedBlobs([]);
    setQualities([]);
    setCaptureProgress(0);

    let blobs = [];
    let quals = [];

    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 1500));
      
      if (!videoRef.current || !canvasRef.current) continue;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
      blobs.push(blob);
      
      const formData = new FormData();
      formData.append('file', blob, `preview.jpg`);
      
      try {
        const qRes = await client.post('/api/register/face/check-quality', formData);
        quals.push({
          blobUrl: URL.createObjectURL(blob),
          quality: qRes.data.quality
        });
      } catch (e) {
        quals.push({ blobUrl: URL.createObjectURL(blob), quality: 0 });
      }
      
      setCapturedBlobs([...blobs]);
      setQualities([...quals]);
      setCaptureProgress((i + 1) * 20);
    }
    
    setIsCapturing(false);
  };

  // STEP 4 - Submit Face
  const handleFaceSubmit = async () => {
    const goodPhotos = qualities.filter(q => q.quality > 0.4);
    if (goodPhotos.length < 3) {
      setStudentError("Please retake — move to better lighting");
      return;
    }
    
    const formData = new FormData();
    formData.append('roll_no', studentDetails.roll_no.toUpperCase());
    capturedBlobs.forEach((blob, i) => formData.append('files', blob, `photo_${i}.jpg`));
    
    try {
      const res = await client.post('/api/register/face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRegistrationResult(res.data);
      setStep(4);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      setStudentError(err.response?.data?.detail || "Error registering face");
    }
  };

  // Handle Edit Search
  const handleEditSearch = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditData(null);
    try {
      if (editType === 'student') {
        const res = await client.get(`/api/admin/student/${searchQuery}`);
        setEditData({ ...res.data, password: '' });
      } else {
        const res = await client.get(`/api/admin/faculty/${searchQuery}`);
        setEditData({ ...res.data, password: '' });
      }
    } catch (err) {
      setEditError(`Record not found for the given ${editType === 'student' ? 'Roll No' : 'Email'}.`);
    }
  };

  // Handle Edit Update
  const handleEditUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setIsEditing(true);
    try {
      if (editType === 'student') {
        await client.put(`/api/admin/student/${editData.roll_no}`, editData);
      } else {
        await client.put(`/api/admin/faculty/${editData.email}`, editData);
      }
      setEditSuccess("Record updated successfully!");
    } catch (err) {
      setEditError("Failed to update record.");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Re-register Biometrics
  const handleReRegisterBiometrics = () => {
    setStudentDetails({
      roll_no: editData.roll_no,
      name: editData.name,
      semester: editData.semester,
      section: editData.section,
      branch: editData.branch,
      student_email: editData.student_email,
      parent_email: editData.parent_email,
      parent_name: editData.parent_name,
      password: ''
    });
    setActiveTab('student');
    setStep(2);
  };

  // Handle Edit Delete
  const handleEditDelete = async () => {
    if (!window.confirm(`Are you absolutely sure you want to delete this ${editType}? This action cannot be undone.`)) return;
    setEditError('');
    setEditSuccess('');
    setIsEditing(true);
    try {
      if (editType === 'student') {
        await client.delete(`/api/admin/student/${editData.roll_no}`);
      } else {
        await client.delete(`/api/admin/faculty/${editData.email}`);
      }
      setEditSuccess("Record deleted successfully!");
      setEditData(null);
    } catch (err) {
      setEditError("Failed to delete record.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-black/20">
          <h1 className="font-heading text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-300 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-cyan-400" /> Admin Registration Portal
          </h1>
          <p className="text-white/50 text-sm font-bold mt-2">Manage student and faculty records efficiently.</p>
        </div>

        {/* TABS */}
        <div className="flex border-b border-white/10 bg-black/40">
          <button 
            onClick={() => { setActiveTab('student'); setStep(1); }}
            className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'student' ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'}`}
          >
            Student Onboarding
          </button>
          <button 
            onClick={() => setActiveTab('faculty')}
            className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'faculty' ? 'border-fuchsia-400 text-fuchsia-300 bg-fuchsia-500/10' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'}`}
          >
            Faculty Onboarding
          </button>
          <button 
            onClick={() => { setActiveTab('edit'); setEditData(null); setEditSuccess(''); setEditError(''); }}
            className={`flex-1 py-4 text-xs lg:text-sm font-black uppercase tracking-wider transition-all border-b-2 ${activeTab === 'edit' ? 'border-amber-400 text-amber-300 bg-amber-500/10' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'}`}
          >
            Edit Records
          </button>
        </div>

        <div className="p-6 md:p-8">
          
          {/* FACULTY TAB */}
          {activeTab === 'faculty' && (
            <div className="max-w-md mx-auto space-y-6 animate-in fade-in">
              {facSuccess && <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-4 rounded-xl text-sm font-bold">{facSuccess}</div>}
              {facError && <div className="bg-rose-500/20 text-rose-300 border border-rose-500/40 p-4 rounded-xl text-sm font-bold">{facError}</div>}
              
              <form onSubmit={handleFacultySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Full Name</label>
                  <input type="text" required value={facName} onChange={e => setFacName(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 outline-none" placeholder="e.g. Dr. Anand" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <input type="email" required value={facEmail} onChange={e => setFacEmail(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 outline-none" placeholder="faculty@college.edu" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Password</label>
                  <input type="password" required value={facPass} onChange={e => setFacPass(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 outline-none" placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Assigned Subjects (Names, comma separated)</label>
                  <input type="text" required value={facSubs} onChange={e => setFacSubs(e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 outline-none" placeholder="e.g. Data Structures, Maths" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Semester for Subjects</label>
                  <input type="number" required value={facSemester} onChange={e => setFacSemester(parseInt(e.target.value))} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/30 outline-none" min="1" max="8" />
                </div>
                <button type="submit" disabled={isFacLoading} className="w-full bg-gradient-to-r from-fuchsia-500 to-rose-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)] disabled:opacity-50 mt-4">
                  {isFacLoading ? 'Creating...' : 'Create Faculty Account'}
                </button>
              </form>
            </div>
          )}

          {/* STUDENT TAB */}
          {activeTab === 'student' && (
            <div className="space-y-6">
              {/* Stepper */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-cyan-400' : 'text-white/30'} font-bold text-xs uppercase tracking-wider`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/20 bg-black/20'}`}>1</div> Details
                </div>
                <div className={`h-px w-10 ${step >= 2 ? 'bg-cyan-400' : 'bg-white/20'}`}></div>
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-cyan-400' : 'text-white/30'} font-bold text-xs uppercase tracking-wider`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/20 bg-black/20'}`}>2</div> Biometrics
                </div>
              </div>

              {studentError && <div className="bg-rose-500/20 text-rose-300 border border-rose-500/40 p-4 rounded-xl text-sm font-bold animate-pulse">{studentError}</div>}

              {/* STEP 1: Details */}
              {step === 1 && (
                <form onSubmit={handleStudentSubmit} className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input type="text" required value={studentDetails.name} onChange={e => setStudentDetails({...studentDetails, name: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Roll No</label>
                    <input type="text" required value={studentDetails.roll_no} onChange={e => setStudentDetails({...studentDetails, roll_no: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500 uppercase" placeholder="e.g. 21CS047" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Branch</label>
                    <input type="text" required value={studentDetails.branch} onChange={e => setStudentDetails({...studentDetails, branch: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" placeholder="e.g. CSE" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Semester</label>
                    <input type="number" required value={studentDetails.semester} onChange={e => setStudentDetails({...studentDetails, semester: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" min="1" max="8" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Section</label>
                    <input type="text" required value={studentDetails.section} onChange={e => setStudentDetails({...studentDetails, section: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500 uppercase" placeholder="e.g. A" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Student Email</label>
                    <input type="email" required value={studentDetails.student_email} onChange={e => setStudentDetails({...studentDetails, student_email: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" placeholder="student@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Parent Email</label>
                    <input type="email" required value={studentDetails.parent_email} onChange={e => setStudentDetails({...studentDetails, parent_email: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" placeholder="parent@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Parent Name</label>
                    <input type="text" required value={studentDetails.parent_name} onChange={e => setStudentDetails({...studentDetails, parent_name: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" placeholder="e.g. Robert Doe" />
                  </div>
                  <div className="md:col-span-2 mb-4">
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Student Password</label>
                    <input type="password" required value={studentDetails.password} onChange={e => setStudentDetails({...studentDetails, password: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500" placeholder="••••••••" />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2">
                      Continue to Biometrics <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2 & 3: Camera */}
              {(step === 2 || step === 3) && (
                <div className="space-y-6 animate-in slide-in-from-right">
                  <div className="bg-black/40 p-4 rounded-xl flex justify-between items-center border border-white/10 shadow-inner">
                    <div>
                      <p className="font-heading font-bold text-lg text-white">{studentDetails.name}</p>
                      <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Roll No: {studentDetails.roll_no} • Sem: {studentDetails.semester}</p>
                    </div>
                  </div>

                  <div className="relative bg-black rounded-2xl overflow-hidden flex justify-center items-center h-[400px] border border-white/20 shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline muted className="h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#hole)" />
                      <mask id="hole">
                        <rect width="100%" height="100%" fill="white" />
                        <ellipse cx="50%" cy="50%" rx="120" ry="160" fill="black" />
                      </mask>
                      <ellipse cx="50%" cy="50%" rx="120" ry="160" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="8,4" className="animate-pulse" />
                    </svg>
                    
                    <div className="absolute top-4 bg-cyan-900/80 backdrop-blur-md text-cyan-100 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border border-cyan-500/50 shadow-lg">
                      Position face in the oval
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    {step === 2 && (
                      <button 
                        onClick={startCapture}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:scale-105 transition-all w-full md:w-auto flex items-center justify-center gap-2 mx-auto"
                      >
                        <Camera className="w-5 h-5" /> Start Capture Sequence
                      </button>
                    )}
                    
                    {step === 3 && isCapturing && (
                      <div className="w-full bg-black/40 p-4 rounded-xl border border-white/10 shadow-inner">
                        <p className="text-xs font-bold text-cyan-300 mb-2 uppercase tracking-wider">Capturing Sequence... {captureProgress}%</p>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{width: `${captureProgress}%`}}></div>
                        </div>
                      </div>
                    )}

                    {step === 3 && !isCapturing && (
                      <button 
                        onClick={handleFaceSubmit}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 transition-all w-full flex items-center justify-center gap-2"
                      >
                        Submit Registration
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 justify-center">
                    {qualities.map((q, i) => (
                      <div key={i} className="relative group">
                        <img src={q.blobUrl} className="w-20 h-20 object-cover rounded-xl shadow-lg border border-white/20 opacity-80 group-hover:opacity-100 transition-opacity" alt={`cap-${i}`} />
                        <div className="absolute -bottom-2 -right-2 text-xs bg-black/80 rounded-full p-1 border border-white/20 shadow-lg z-10">
                          {q.quality > 0.7 ? '🟢' : q.quality > 0.4 ? '🟡' : '🔴'}
                        </div>
                        <div className="text-[10px] text-center mt-2 font-black text-white/50 bg-black/40 rounded px-1 py-0.5">
                          {(q.quality * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Success */}
              {step === 4 && registrationResult && (
                <div className="text-center space-y-6 py-10 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="font-heading text-3xl font-black text-white">Registered Successfully!</h2>
                  <div className="bg-black/40 p-6 rounded-2xl inline-block text-left border border-white/10 shadow-inner max-w-sm w-full">
                    <p className="text-white/60 text-sm font-bold mb-2">
                      Student Name: <span className="text-white">{registrationResult.name}</span>
                    </p>
                    <p className="text-white/60 text-sm font-bold mb-2">
                      Quality score: <span className="text-emerald-400">{(registrationResult.quality_score * 100).toFixed(1)}%</span>
                    </p>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mt-4 border-t border-white/10 pt-4">
                      Embedding stored for {registrationResult.photos_processed} photos.<br/>
                      Total students in system: {registrationResult.total_registered}.
                    </p>
                  </div>
                  <div className="pt-4 flex justify-center gap-3">
                    <button 
                      onClick={() => { setStep(1); setStudentDetails({roll_no: '', name: '', semester: 5, section: 'A', branch: 'CSE', student_email: '', parent_email: '', parent_name: '', password: ''}); setRegistrationResult(null); }}
                      className="bg-cyan-500/20 text-cyan-300 font-black text-sm px-6 py-2.5 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors shadow-lg"
                    >
                      Register Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EDIT TAB */}
          {activeTab === 'edit' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl mb-6">
                <button onClick={() => setEditType('student')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${editType === 'student' ? 'bg-amber-500/20 text-amber-300' : 'text-white/50 hover:text-white'}`}>Student</button>
                <button onClick={() => setEditType('faculty')} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${editType === 'faculty' ? 'bg-amber-500/20 text-amber-300' : 'text-white/50 hover:text-white'}`}>Faculty</button>
              </div>

              <form onSubmit={handleEditSearch} className="flex gap-3 max-w-md mx-auto">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder={editType === 'student' ? "Enter Roll Number (e.g. 21CS047)" : "Enter Faculty Email"}
                  className="flex-1 px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" 
                  required 
                />
                <button type="submit" className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 px-4 py-2.5 rounded-xl transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              </form>

              {editError && <div className="max-w-md mx-auto bg-rose-500/20 text-rose-300 border border-rose-500/40 p-4 rounded-xl text-sm font-bold">{editError}</div>}
              {editSuccess && <div className="max-w-md mx-auto bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 p-4 rounded-xl text-sm font-bold">{editSuccess}</div>}

              {editData && editType === 'student' && (
                <form onSubmit={handleEditUpdate} className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
                  <h3 className="md:col-span-2 font-heading font-black text-xl text-white mb-2 flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-400" /> Edit Student</h3>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input type="text" required value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Roll No (Read Only)</label>
                    <input type="text" disabled value={editData.roll_no} className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm font-bold text-white/50 outline-none uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Branch</label>
                    <input type="text" required value={editData.branch} onChange={e => setEditData({...editData, branch: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Semester</label>
                    <input type="number" required value={editData.semester} onChange={e => setEditData({...editData, semester: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" min="1" max="8" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Section</label>
                    <input type="text" required value={editData.section} onChange={e => setEditData({...editData, section: e.target.value.toUpperCase()})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500 uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Student Email</label>
                    <input type="email" required value={editData.student_email} onChange={e => setEditData({...editData, student_email: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Parent Email</label>
                    <input type="email" required value={editData.parent_email} onChange={e => setEditData({...editData, parent_email: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Parent Name</label>
                    <input type="text" required value={editData.parent_name || ''} onChange={e => setEditData({...editData, parent_name: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div className="md:col-span-2 mb-4">
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">New Password (Leave blank to keep current)</label>
                    <input type="password" value={editData.password || ''} onChange={e => setEditData({...editData, password: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" placeholder="••••••••" />
                  </div>
                  <div className="md:col-span-2 mt-4 flex flex-col sm:flex-row gap-3">
                    <button type="submit" disabled={isEditing} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50">
                      {isEditing ? 'Updating...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={handleReRegisterBiometrics} disabled={isEditing} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 disabled:opacity-50">
                      <Camera className="w-5 h-5" /> Re-register Biometrics
                    </button>
                    <button type="button" onClick={handleEditDelete} disabled={isEditing} className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] disabled:opacity-50">
                      Delete Student
                    </button>
                  </div>
                </form>
              )}

              {editData && editType === 'faculty' && (
                <form onSubmit={handleEditUpdate} className="max-w-md mx-auto space-y-4 mt-8 pt-8 border-t border-white/10">
                  <h3 className="font-heading font-black text-xl text-white mb-2 flex items-center gap-2"><Edit3 className="w-5 h-5 text-amber-400" /> Edit Faculty</h3>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Full Name</label>
                    <input type="text" required value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Email (Read Only)</label>
                    <input type="email" disabled value={editData.email} className="w-full px-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm font-bold text-white/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Assigned Subjects (Names, comma separated)</label>
                    <input type="text" required value={editData.subjects} onChange={e => setEditData({...editData, subjects: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">Semester for Subjects (Only used if creating new subjects)</label>
                    <input type="number" value={editData.semester || 1} onChange={e => setEditData({...editData, semester: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" min="1" max="8" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-white/70 mb-1.5 uppercase tracking-wider">New Password (Leave blank to keep current)</label>
                    <input type="password" value={editData.password || ''} onChange={e => setEditData({...editData, password: e.target.value})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-amber-500" placeholder="••••••••" />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button type="submit" disabled={isEditing} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] disabled:opacity-50">
                      {isEditing ? 'Updating...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={handleEditDelete} disabled={isEditing} className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black py-3 rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] disabled:opacity-50">
                      Delete Faculty
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
