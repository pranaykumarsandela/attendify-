import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting) e.target.classList.add('in');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    const tickers = [
      {name:'Geetha Nair',subj:'CN',conf:'92%',color:'#22c55e'},
      {name:'Harish Verma',subj:'CN',conf:'89%',color:'#22c55e'},
      {name:'Unknown face',subj:'—',conf:'38%',color:'#f87171'},
      {name:'Kiran Bhat',subj:'CN',conf:'95%',color:'#22c55e'}
    ];
    let tickerIdx = 0;
    const tInterval = setInterval(() => {
      const tickerContainer = document.querySelector('#role-teacher .dash-card:last-child');
      if(!tickerContainer) return;
      const t = tickers[tickerIdx % tickers.length];
      const row = document.createElement('div');
      row.className = 'ticker-item';
      row.style.cssText = 'opacity:0;transform:translateY(-8px);transition:all .4s';
      row.innerHTML = `<div class="tick-dot" style="background:${t.color}"></div><span class="tick-name">${t.name}</span><span class="tick-subj">${t.subj}</span><span class="tick-conf" style="color:${t.color}">${t.conf}</span><span class="tick-time">just now</span>`;
      tickerContainer.insertBefore(row, tickerContainer.children[1]);
      setTimeout(() => { row.style.opacity = '1'; row.style.transform = 'translateY(0)' }, 50);
      const items = tickerContainer.querySelectorAll('.ticker-item');
      if(items.length > 5) items[items.length - 1].remove();
      tickerIdx++;
    }, 3500);

    return () => clearInterval(tInterval);
  }, []);

  return (
    <div className="landing-page-wrapper">
      {/* Navbar replaced */}
      <nav id="navbar">
        <a href="#" className="nav-brand">
          <div className="nav-logo">
            <svg viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="1.5"/>
              <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          AttendIQ
        </a>
        <div className="nav-actions">
          <button className="btn-solid" onClick={() => navigate('/login')}>Sign in</button>
        </div>
      </nav>
      

{/* HERO */}
<section className="hero">
  <div className="hero-bg"></div>
  <div className="hero-grid"></div>
  <div className="hero-content">
    <div className="hero-eyebrow">
      <div className="hero-dot"></div>
      Real-time face recognition attendance system
    </div>
    <h1 className="hero-title">
      Attendance,<br />
      <em>reimagined</em>
      <span className="rule">by the camera.</span>
    </h1>
    <p className="hero-sub">
      CCTV-powered face recognition that identifies students the moment they walk in — marking attendance before they reach their seats.
    </p>
    <div className="hero-actions">
      <button className="btn-hero" >See it live ↓</button>
      <button className="btn-hero-ghost" >How it works</button>
    </div>
    <div className="hero-stats">
      <div className="stat-chip">
        <span className="stat-chip-val" id="cnt1">0</span>
        <span className="stat-chip-label">ms recognition</span>
      </div>
      <div className="stat-chip">
        <span className="stat-chip-val" id="cnt2">0</span>
        <span className="stat-chip-label">% accuracy</span>
      </div>
      <div className="stat-chip">
        <span className="stat-chip-val" id="cnt3">0</span>
        <span className="stat-chip-label">portals</span>
      </div>
      <div className="stat-chip">
        <span className="stat-chip-val" id="cnt4">0</span>
        <span className="stat-chip-label">subjects tracked</span>
      </div>
    </div>
  </div>
  <div className="hero-scroll">
    <span>SCROLL</span>
    <div className="scroll-line"></div>
  </div>
</section>

{/* DASHBOARD PREVIEW */}
<div className="preview-section" id="preview">
  <div className="preview-inner">
    <p className="section-label" style={{color: 'rgba(255,255,255,.3)', textAlign: 'center'}}>Live dashboards</p>
    <h2 className="preview-title">Four portals. One <em>system.</em></h2>
    <p className="preview-sub">Each role gets exactly the view they need — no more, no less.</p>
    <div className="role-selector">
      <button className="role-btn active" >Student</button>
      <button className="role-btn" >Teacher</button>
      <button className="role-btn" >HOD</button>
      <button className="role-btn" >Parent</button>
    </div>
  </div>

  <div className="dash-frame">
    <div className="dash-topbar">
      <div className="dash-dot" style={{background: '#ef4444'}}></div>
      <div className="dash-dot" style={{background: '#f59e0b', marginLeft: '4px'}}></div>
      <div className="dash-dot" style={{background: '#22c55e', marginLeft: '4px'}}></div>
      <div className="dash-topbar-title" id="dash-tab-label">STUDENT · Arjun Kumar · 21CS047</div>
    </div>

    {/* STUDENT */}
    <div className="dash-body active" id="role-student">
      <div className="dash-metrics">
        <div className="dash-metric"><div className="dm-label">Overall</div><div className="dm-val">82%</div><div className="dm-sub dm-green">▲ 3% this month</div></div>
        <div className="dash-metric"><div className="dm-label">Present</div><div className="dm-val">74</div><div className="dm-sub" style={{color: 'rgba(255,255,255,.3)', fontSize: '11px'}}>of 90 days</div></div>
        <div className="dash-metric"><div className="dm-label">Absent</div><div className="dm-val">16</div><div className="dm-sub dm-amber">4 pending</div></div>
        <div className="dash-metric"><div className="dm-label">At risk</div><div className="dm-val">1</div><div className="dm-sub dm-red">Needs attention</div></div>
      </div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dc-title">Subject attendance</div>
          <div className="subj-row"><span className="subj-name">Data Structures</span><div className="subj-bar-wrap"><div className="subj-bar mf-green" style={{width: '93%'}}></div></div><span className="subj-pct dm-green">93%</span><span className="badge-sm bg-green">Safe</span></div>
          <div className="subj-row"><span className="subj-name">DBMS</span><div className="subj-bar-wrap"><div className="subj-bar mf-green" style={{width: '80%'}}></div></div><span className="subj-pct dm-green">80%</span><span className="badge-sm bg-green">Safe</span></div>
          <div className="subj-row"><span className="subj-name">Computer Networks</span><div className="subj-bar-wrap"><div className="subj-bar mf-amber" style={{width: '70%'}}></div></div><span className="subj-pct dm-amber">70%</span><span className="badge-sm bg-amber">Low</span></div>
          <div className="subj-row"><span className="subj-name">OS Concepts</span><div className="subj-bar-wrap"><div className="subj-bar mf-green" style={{width: '87%'}}></div></div><span className="subj-pct dm-green">87%</span><span className="badge-sm bg-green">Safe</span></div>
          <div className="subj-row"><span className="subj-name">Software Engg.</span><div className="subj-bar-wrap"><div className="subj-bar" style={{width: '64%', background: 'linear-gradient(90deg,#b91c1c,#f87171)'}}></div></div><span className="subj-pct dm-red">64%</span><span className="badge-sm bg-red">Risk</span></div>
          <div className="subj-row"><span className="subj-name">Maths III</span><div className="subj-bar-wrap"><div className="subj-bar mf-green" style={{width: '89%'}}></div></div><span className="subj-pct dm-green">89%</span><span className="badge-sm bg-green">Safe</span></div>
        </div>
        <div className="dash-card">
          <div className="dc-title">Recent activity</div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#22c55e'}}></div><span className="tick-name">Marked present</span><span className="tick-subj">Data Structures</span><span className="tick-conf dm-green">94%</span><span className="tick-time">09:15</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#22c55e'}}></div><span className="tick-name">Marked present</span><span className="tick-subj">DBMS</span><span className="tick-conf dm-green">91%</span><span className="tick-time">10:20</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#f87171'}}></div><span className="tick-name">Absent</span><span className="tick-subj">Software Engg.</span><span className="tick-conf dm-red">—</span><span className="tick-time">Yesterday</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#fbbf24'}}></div><span className="tick-name">Late entry</span><span className="tick-subj">Computer Networks</span><span className="tick-conf dm-amber">+13m</span><span className="tick-time">Apr 18</span></div>
          <div style={{marginTop: '14px', padding: '12px', borderRadius: '8px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.15)'}}>
            <div style={{fontSize: '11px', color: '#f87171', fontWeight: '500'}}>⚠ Software Engg. at 64% — Need 8 more classes to reach 75%</div>
          </div>
        </div>
      </div>
    </div>

    {/* TEACHER */}
    <div className="dash-body" id="role-teacher">
      <div className="dash-metrics">
        <div className="dash-metric"><div className="dm-label">Total students</div><div className="dm-val">180</div><div className="dm-sub" style={{color: 'rgba(255,255,255,.3)', fontSize: '11px'}}>3 sections</div></div>
        <div className="dash-metric"><div className="dm-label">Today present</div><div className="dm-val">88%</div><div className="dm-sub dm-green">158 / 180</div></div>
        <div className="dash-metric"><div className="dm-label">At risk</div><div className="dm-val">12</div><div className="dm-sub dm-red">Below 75%</div></div>
        <div className="dash-metric"><div className="dm-label">Camera</div><div className="dm-val" style={{fontSize: '14px', color: '#22c55e', fontFamily: 'var(--ff-mono)'}}>LIVE</div><div className="dm-sub dm-green">30 FPS</div></div>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px'}}>
        <div className="cam-view">
          <div className="dc-title">Live camera feed — Computer Networks · Period 3</div>
          <div className="cam-feed">
            <div className="cam-scan-line"></div>
            <div className="cam-box cam-box-1">
              <div className="cam-label" style={{color: '#22c55e'}}>Arjun Kumar · 94%</div>
            </div>
            <div className="cam-box cam-box-2">
              <div className="cam-label" style={{color: '#eab308'}}>Identifying... 67%</div>
            </div>
            <div className="cam-crosshair" style={{top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: '.2'}}></div>
            <div style={{position: 'absolute', top: '8px', right: '8px', fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'rgba(255,255,255,.4)', background: 'rgba(0,0,0,.5)', padding: '3px 7px', borderRadius: '4px'}}>30 FPS</div>
            <div style={{position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '5px'}}>
              <div style={{width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', animation: 'pulse2 1s infinite'}}></div>
              <span style={{fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'rgba(255,255,255,.6)'}}>REC</span>
            </div>
          </div>
          <div className="cam-status">
            <div className="cam-live-dot"></div>
            <span className="cam-status-text">RTSP connected · 2 faces detected · 1 identified · 1 confirming</span>
          </div>
        </div>
        <div className="dash-card">
          <div className="dc-title">Live ticker</div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#22c55e'}}></div><span className="tick-name">Arjun Kumar</span><span className="tick-subj">CN</span><span className="tick-conf dm-green">94%</span><span className="tick-time">just now</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#22c55e'}}></div><span className="tick-name">Aanya Singh</span><span className="tick-subj">CN</span><span className="tick-conf dm-green">91%</span><span className="tick-time">2m ago</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#22c55e'}}></div><span className="tick-name">Bhavna Reddy</span><span className="tick-subj">CN</span><span className="tick-conf dm-green">88%</span><span className="tick-time">3m ago</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#f87171'}}></div><span className="tick-name">Unknown face</span><span className="tick-subj">—</span><span className="tick-conf dm-red">42%</span><span className="tick-time">4m ago</span></div>
          <div className="ticker-item"><div className="tick-dot" style={{background: '#22c55e'}}></div><span className="tick-name">Esha Mehta</span><span className="tick-subj">CN</span><span className="tick-conf dm-green">96%</span><span className="tick-time">5m ago</span></div>
        </div>
      </div>
    </div>

    {/* HOD */}
    <div className="dash-body" id="role-hod">
      <div className="dash-metrics">
        <div className="dash-metric"><div className="dm-label">Dept. students</div><div className="dm-val">480</div><div className="dm-sub" style={{color: 'rgba(255,255,255,.3)', fontSize: '11px'}}>Sem 3, 5, 7</div></div>
        <div className="dash-metric"><div className="dm-label">Dept. avg.</div><div className="dm-val">81%</div><div className="dm-sub dm-green">▲ 2% vs last month</div></div>
        <div className="dash-metric"><div className="dm-label">At risk</div><div className="dm-val">38</div><div className="dm-sub dm-red">Needs intervention</div></div>
        <div className="dash-metric"><div className="dm-label">Subjects</div><div className="dm-val">18</div><div className="dm-sub" style={{color: 'rgba(255,255,255,.3)', fontSize: '11px'}}>Active this sem.</div></div>
      </div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dc-title">Search any student</div>
          <div className="hod-search">
            <input className="hod-input" placeholder="Search name or roll no..." value="Arjun" />
            <select className="hod-select"><option>Sem 5</option></select>
            <select className="hod-select"><option>All sec.</option></select>
          </div>
          <table className="hod-table">
            <thead><tr><th>Roll</th><th>Name</th><th>Sec.</th><th>Avg %</th><th>Risk</th><th></th></tr></thead>
            <tbody>
              <tr><td>21CS047</td><td>Arjun Kumar</td><td>A</td><td><span className="badge-sm bg-amber">82%</span></td><td><span className="badge-sm bg-red">1</span></td><td><button className="view-btn">View</button></td></tr>
              <tr><td>21CS004</td><td>Dinesh Patel</td><td>A</td><td><span className="badge-sm bg-red">58%</span></td><td><span className="badge-sm bg-red">3</span></td><td><button className="view-btn">View</button></td></tr>
              <tr><td>21CS006</td><td>Faiz Khan</td><td>A</td><td><span className="badge-sm bg-red">61%</span></td><td><span className="badge-sm bg-red">2</span></td><td><button className="view-btn">View</button></td></tr>
            </tbody>
          </table>
        </div>
        <div className="dash-card">
          <div className="dc-title">Semester overview</div>
          <div className="subj-row" style={{marginBottom: '14px'}}><span className="subj-name" style={{color: 'rgba(255,255,255,.6)'}}>Semester 3</span><div className="subj-bar-wrap" style={{width: '100px'}}><div className="subj-bar mf-green" style={{width: '84%'}}></div></div><span className="subj-pct dm-green">84%</span><span className="badge-sm bg-amber" style={{fontSize: '9px'}}>8 at risk</span></div>
          <div className="subj-row" style={{marginBottom: '14px'}}><span className="subj-name" style={{color: 'rgba(255,255,255,.6)'}}>Semester 5</span><div className="subj-bar-wrap" style={{width: '100px'}}><div className="subj-bar mf-amber" style={{width: '79%'}}></div></div><span className="subj-pct dm-amber">79%</span><span className="badge-sm bg-amber" style={{fontSize: '9px'}}>14 at risk</span></div>
          <div className="subj-row"><span className="subj-name" style={{color: 'rgba(255,255,255,.6)'}}>Semester 7</span><div className="subj-bar-wrap" style={{width: '100px'}}><div className="subj-bar mf-amber" style={{width: '77%'}}></div></div><span className="subj-pct dm-amber">77%</span><span className="badge-sm bg-red" style={{fontSize: '9px'}}>16 at risk</span></div>
          <div style={{marginTop: '16px', borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '14px'}}>
            <div className="dc-title" style={{marginBottom: '10px'}}>Top defaulters</div>
            <div className="ticker-item"><div className="tick-dot" style={{background: '#f87171'}}></div><span className="tick-name">Dinesh Patel · 21CS004</span><span className="tick-conf dm-red">58%</span></div>
            <div className="ticker-item"><div className="tick-dot" style={{background: '#f87171'}}></div><span className="tick-name">Faiz Khan · 21CS006</span><span className="tick-conf dm-red">61%</span></div>
          </div>
        </div>
      </div>
    </div>

    {/* PARENT */}
    <div className="dash-body" id="role-parent">
      <div className="dash-metrics">
        <div className="dash-metric"><div className="dm-label">Ward attendance</div><div className="dm-val">82%</div><div className="dm-sub dm-green">Above minimum</div></div>
        <div className="dash-metric"><div className="dm-label">This week</div><div className="dm-val">4/5</div><div className="dm-sub" style={{color: 'rgba(255,255,255,.3)', fontSize: '11px'}}>days present</div></div>
        <div className="dash-metric"><div className="dm-label">Alerts</div><div className="dm-val">3</div><div className="dm-sub dm-amber">This month</div></div>
        <div className="dash-metric"><div className="dm-label">At risk</div><div className="dm-val">1</div><div className="dm-sub dm-red">Software Engg.</div></div>
      </div>
      <div className="dash-grid">
        <div className="dash-card">
          <div className="dc-title">Daily entry log — Arjun Kumar · 21CS047</div>
          <table className="hod-table">
            <thead><tr><th>Date</th><th>Entry</th><th>Exit</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>22 Apr</td><td>08:52 AM</td><td>04:10 PM</td><td><span className="badge-sm bg-green">Present</span></td></tr>
              <tr><td>21 Apr</td><td>09:01 AM</td><td>03:55 PM</td><td><span className="badge-sm bg-green">Present</span></td></tr>
              <tr><td>18 Apr</td><td>09:28 AM</td><td>03:45 PM</td><td><span className="badge-sm bg-amber">Late</span></td></tr>
              <tr><td>17 Apr</td><td>—</td><td>—</td><td><span className="badge-sm bg-red">Absent</span></td></tr>
              <tr><td>16 Apr</td><td>08:48 AM</td><td>04:05 PM</td><td><span className="badge-sm bg-green">Present</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="dash-card">
          <div className="dc-title">Notifications</div>
          <div className="ticker-item" style={{alignItems: 'flex-start'}}>
            <div className="tick-dot" style={{background: '#f87171', marginTop: '4px'}}></div>
            <div>
              <div style={{fontSize: '12px', color: 'rgba(255,255,255,.8)', fontWeight: '500'}}>Software Engg. — attendance at 64%</div>
              <div style={{fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '2px'}}>Below 75% minimum. 8 classes needed to reach threshold.</div>
              <div className="tick-time" style={{marginTop: '4px'}}>Today, 12:00 PM</div>
            </div>
          </div>
          <div className="ticker-item" style={{alignItems: 'flex-start'}}>
            <div className="tick-dot" style={{background: '#fbbf24', marginTop: '4px'}}></div>
            <div>
              <div style={{fontSize: '12px', color: 'rgba(255,255,255,.8)'}}>Late arrival on Apr 18</div>
              <div style={{fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '2px'}}>Arjun entered at 09:28 AM — 13 minutes late.</div>
              <div className="tick-time" style={{marginTop: '4px'}}>Apr 18, 9:28 AM</div>
            </div>
          </div>
          <div className="ticker-item" style={{alignItems: 'flex-start'}}>
            <div className="tick-dot" style={{background: '#fbbf24', marginTop: '4px'}}></div>
            <div>
              <div style={{fontSize: '12px', color: 'rgba(255,255,255,.8)'}}>Absent on Apr 17</div>
              <div style={{fontSize: '11px', color: 'rgba(255,255,255,.35)', marginTop: '2px'}}>Not detected in any class. Please confirm leave status.</div>
              <div className="tick-time" style={{marginTop: '4px'}}>Apr 17, 6:00 PM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

{/* FEATURES */}
<section className="features-section" id="features">
  <div className="features-header">
    <div className="reveal">
      <p className="section-label">Why AttendIQ</p>
      <h2 className="section-title">Built for the <em>real world</em></h2>
    </div>
    <div className="reveal reveal-delay-1">
      <p className="section-sub">Every feature addresses a real problem that traditional attendance systems fail to solve — weather, low light, crowded halls, and diverse faces.</p>
    </div>
  </div>
  <div className="features-grid">
    <div className="feature-card reveal">
      <div className="feat-icon">🎯</div>
      <div className="feat-title">Face-structure agnostic</div>
      <div className="feat-desc">ArcFace buffalo_l model trained on millions of faces across all ethnicities, skin tones (Fitzpatrick I–VI), heights, and ages. Equivalent accuracy across all demographics.</div>
      <div className="feat-tag">→ ArcFace + FAISS</div>
    </div>
    <div className="feature-card reveal reveal-delay-1">
      <div className="feat-icon">📡</div>
      <div className="feat-title">RTSP camera support</div>
      <div className="feat-desc">Works with any IP camera — Hikvision, Dahua, Axis — via RTSP protocol. Auto-reconnects on stream drops. Laptop webcam fallback for demos.</div>
      <div className="feat-tag">→ OpenCV + FFMPEG</div>
    </div>
    <div className="feature-card reveal reveal-delay-2">
      <div className="feat-icon">🏃</div>
      <div className="feat-title">Movement tracking</div>
      <div className="feat-desc">DeepSort assigns persistent track IDs to each person. Students walking across the frame keep their identity — no re-identification flicker or double-marking.</div>
      <div className="feat-tag">→ DeepSort-Realtime</div>
    </div>
    <div className="feature-card reveal reveal-delay-3">
      <div className="feat-icon">⚡</div>
      <div className="feat-title">Sub-80ms end-to-end</div>
      <div className="feat-desc">YOLO detect → ArcFace embed → FAISS match → PostgreSQL write — the entire pipeline runs in under 80ms on CPU. GPU cuts this to under 30ms.</div>
      <div className="feat-tag">→ YOLOv8 + asyncpg</div>
    </div>
    <div className="feature-card reveal reveal-delay-4">
      <div className="feat-icon">🔒</div>
      <div className="feat-title">Zero localStorage</div>
      <div className="feat-desc">All data in PostgreSQL. Auth tokens in Redis with httpOnly cookies. No sensitive data ever touches the browser's local storage or session storage.</div>
      <div className="feat-tag">→ Redis + httpOnly</div>
    </div>
    <div className="feature-card reveal reveal-delay-5">
      <div className="feat-icon">📊</div>
      <div className="feat-title">Four live portals</div>
      <div className="feat-desc">Student, Parent, Teacher, and HOD each get a purpose-built real-time dashboard. WebSocket pushes attendance events the instant they're marked.</div>
      <div className="feat-tag">→ React + WebSocket</div>
    </div>
  </div>
</section>

{/* PIPELINE */}
<section className="pipeline-section" id="pipeline">
  <div className="pipeline-header reveal">
    <p className="section-label">How it works</p>
    <h2 className="section-title">From <em>pixel</em> to record<br />in under 80ms</h2>
  </div>
  <div className="pipeline-steps">
    <div className="pipe-step reveal">
      <div className="pipe-circle" data-num="1">📷</div>
      <div className="pipe-title">Capture</div>
      <div className="pipe-tech">RTSP / Webcam</div>
      <div className="pipe-desc">30 FPS stream via OpenCV. Every 3rd frame sampled for processing.</div>
    </div>
    <div className="pipe-step reveal reveal-delay-1">
      <div className="pipe-circle" data-num="2">🔲</div>
      <div className="pipe-title">Detect</div>
      <div className="pipe-tech">YOLOv8-Face</div>
      <div className="pipe-desc">Single-pass neural network finds all faces in &lt;12ms.</div>
    </div>
    <div className="pipe-step reveal reveal-delay-2">
      <div className="pipe-circle" data-num="3">🏃</div>
      <div className="pipe-title">Track</div>
      <div className="pipe-tech">DeepSort</div>
      <div className="pipe-desc">Persistent IDs assigned. Moving faces tracked frame-to-frame.</div>
    </div>
    <div className="pipe-step reveal reveal-delay-3">
      <div className="pipe-circle" data-num="4">🧠</div>
      <div className="pipe-title">Embed</div>
      <div className="pipe-tech">ArcFace 512-D</div>
      <div className="pipe-desc">Face converted to 512-number identity vector in &lt;25ms.</div>
    </div>
    <div className="pipe-step reveal reveal-delay-4">
      <div className="pipe-circle" data-num="5">🔍</div>
      <div className="pipe-title">Match</div>
      <div className="pipe-tech">FAISS IndexFlatIP</div>
      <div className="pipe-desc">Cosine similarity search across all students in &lt;5ms.</div>
    </div>
    <div className="pipe-step reveal reveal-delay-5">
      <div className="pipe-circle" data-num="6">✅</div>
      <div className="pipe-title">Record</div>
      <div className="pipe-tech">PostgreSQL + Redis</div>
      <div className="pipe-desc">DB write &lt;8ms. WebSocket broadcast updates all dashboards live.</div>
    </div>
  </div>
</section>

{/* PORTALS */}
<section className="portals-section" id="portals">
  <div className="portals-header reveal">
    <p className="section-label" style={{color: 'rgba(255,255,255,.3)'}}>Four portals</p>
    <h2 className="portals-title">Every stakeholder,<br /><em>perfectly served.</em></h2>
    <p className="portals-sub">Role-based dashboards that show exactly the right information to the right person — nothing more, nothing less.</p>
  </div>
  <div className="portals-grid">
    <div className="portal-card c-blue reveal">
      <div className="portal-icon pi-blue">🎓</div>
      <div className="portal-title">Student</div>
      <div className="portal-sub">Complete visibility into your own attendance with smart alerts when intervention is needed.</div>
      <ul className="portal-features">
        <li>Subject-wise % with progress bars</li>
        <li>Classes needed to reach 75%</li>
        <li>Monthly attendance calendar</li>
        <li>Live recognition activity feed</li>
        <li>At-risk subject warnings</li>
      </ul>
    </div>
    <div className="portal-card c-green reveal reveal-delay-1">
      <div className="portal-icon pi-green">👨‍👩‍👦</div>
      <div className="portal-title">Parent</div>
      <div className="portal-sub">Real-time visibility into your ward's attendance with instant push alerts for absences.</div>
      <ul className="portal-features">
        <li>Ward's complete subject summary</li>
        <li>Daily entry & exit time log</li>
        <li>Push notifications for absences</li>
        <li>Monthly attendance trend chart</li>
        <li>Late arrival alerts with timing</li>
      </ul>
    </div>
    <div className="portal-card c-amber reveal reveal-delay-2">
      <div className="portal-icon pi-amber">👩‍🏫</div>
      <div className="portal-title">Teacher</div>
      <div className="portal-sub">Live camera feed and auto-populated roll call — attendance marks itself while you teach.</div>
      <ul className="portal-features">
        <li>Live RTSP camera stream</li>
        <li>Auto-populating today's roll</li>
        <li>At-risk student list per subject</li>
        <li>Section-wise attendance summary</li>
        <li>Real-time recognition ticker</li>
      </ul>
    </div>
    <div className="portal-card c-purple reveal reveal-delay-3">
      <div className="portal-icon pi-purple">🏛️</div>
      <div className="portal-title">HOD</div>
      <div className="portal-sub">Department-wide visibility with drill-down into any student's complete record.</div>
      <ul className="portal-features">
        <li>Department & semester overview</li>
        <li>Search any student by name/roll</li>
        <li>Faculty performance metrics</li>
        <li>Critical alerts & intervention tools</li>
        <li>Exam eligibility calculations</li>
      </ul>
    </div>
  </div>
</section>

{/* TECH STACK */}
<section className="tech-section" id="tech">
  <div className="tech-header">
    <div className="reveal">
      <p className="section-label">Technology</p>
      <h2 className="section-title">Production-grade<br /><em>stack</em></h2>
      <p className="section-sub" style={{marginTop: '14px'}}>Every component chosen for speed, accuracy, and reliability — not convenience.</p>
    </div>
    <div className="reveal reveal-delay-1">
      <div style={{background: 'var(--cream2)', borderRadius: '12px', padding: '20px 24px', border: '1px solid var(--line)'}}>
        <div style={{fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px'}}>Key performance specs</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span style={{color: 'var(--ink3)'}}>YOLO detection</span><span style={{fontFamily: 'var(--ff-mono)', color: 'var(--green)', fontWeight: '500'}}>&lt; 12ms</span></div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span style={{color: 'var(--ink3)'}}>ArcFace embedding</span><span style={{fontFamily: 'var(--ff-mono)', color: 'var(--green)', fontWeight: '500'}}>&lt; 25ms</span></div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span style={{color: 'var(--ink3)'}}>FAISS search</span><span style={{fontFamily: 'var(--ff-mono)', color: 'var(--green)', fontWeight: '500'}}>&lt; 5ms</span></div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}><span style={{color: 'var(--ink3)'}}>DB write (asyncpg)</span><span style={{fontFamily: 'var(--ff-mono)', color: 'var(--green)', fontWeight: '500'}}>&lt; 8ms</span></div>
          <div style={{height: '1px', background: 'var(--line)', margin: '4px 0'}}></div>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600'}}><span style={{color: 'var(--ink)'}}>End-to-end total</span><span style={{fontFamily: 'var(--ff-mono)', color: 'var(--blue)', fontWeight: '700'}}>&lt; 80ms</span></div>
        </div>
      </div>
    </div>
  </div>
  <div className="tech-grid">
    <div className="tech-item reveal"><div className="ti-icon">🦅</div><div className="ti-name">YOLOv8-Face</div><div className="ti-role">Face detection</div><div className="ti-tag tg-ai">AI / Vision</div></div>
    <div className="tech-item reveal reveal-delay-1"><div className="ti-icon">🧠</div><div className="ti-name">ArcFace (InsightFace)</div><div className="ti-role">Face recognition</div><div className="ti-tag tg-ai">AI / Vision</div></div>
    <div className="tech-item reveal reveal-delay-2"><div className="ti-icon">🏃</div><div className="ti-name">DeepSort-Realtime</div><div className="ti-role">Multi-object tracking</div><div className="ti-tag tg-ai">AI / Vision</div></div>
    <div className="tech-item reveal reveal-delay-3"><div className="ti-icon">⚡</div><div className="ti-name">FAISS</div><div className="ti-role">Embedding search</div><div className="ti-tag tg-ai">AI / Search</div></div>
    <div className="tech-item reveal"><div className="ti-icon">🐍</div><div className="ti-name">FastAPI</div><div className="ti-role">Async REST + WebSocket</div><div className="ti-tag tg-be">Backend</div></div>
    <div className="tech-item reveal reveal-delay-1"><div className="ti-icon">📡</div><div className="ti-name">OpenCV + RTSP</div><div className="ti-role">Camera stream capture</div><div className="ti-tag tg-be">Backend</div></div>
    <div className="tech-item reveal reveal-delay-2"><div className="ti-icon">🗄️</div><div className="ti-name">PostgreSQL 16</div><div className="ti-role">Primary database</div><div className="ti-tag tg-db">Database</div></div>
    <div className="tech-item reveal reveal-delay-3"><div className="ti-icon">🔴</div><div className="ti-name">Redis 7</div><div className="ti-role">Sessions + pub/sub</div><div className="ti-tag tg-db">Database</div></div>
    <div className="tech-item reveal"><div className="ti-icon">⚛️</div><div className="ti-name">React 18 + Vite</div><div className="ti-role">Frontend framework</div><div className="ti-tag tg-fe">Frontend</div></div>
    <div className="tech-item reveal reveal-delay-1"><div className="ti-icon">🎨</div><div className="ti-name">Tailwind + Framer Motion</div><div className="ti-role">Styling + animations</div><div className="ti-tag tg-fe">Frontend</div></div>
    <div className="tech-item reveal reveal-delay-2"><div className="ti-icon">🐋</div><div className="ti-name">Docker Compose</div><div className="ti-role">Container orchestration</div><div className="ti-tag tg-inf">Infra</div></div>
    <div className="tech-item reveal reveal-delay-3"><div className="ti-icon">🔧</div><div className="ti-name">Nginx + Alembic</div><div className="ti-role">Proxy + DB migrations</div><div className="ti-tag tg-inf">Infra</div></div>
  </div>
</section>

{/* PERFORMANCE */}
<section className="perf-section" id="performance">
  <div className="perf-bg"></div>
  <div className="perf-grid">
    <div className="reveal">
      <p className="section-label">Performance</p>
      <h2 className="section-title">Numbers that<br /><em>matter.</em></h2>
      <p className="section-sub" style={{marginTop: '12px'}}>Benchmarked on CPU-only hardware. GPU deployment achieves 2–3× improvement on all metrics.</p>
      <div className="perf-meters" style={{marginTop: '36px'}}>
        <div className="meter-row"><span className="meter-label">YOLO detection</span><div className="meter-track"><div className="meter-fill mf-green" id="m1" style={{width: '0%'}}></div></div><span className="meter-val">12ms</span></div>
        <div className="meter-row"><span className="meter-label">ArcFace embed</span><div className="meter-track"><div className="meter-fill mf-blue" id="m2" style={{width: '0%'}}></div></div><span className="meter-val">25ms</span></div>
        <div className="meter-row"><span className="meter-label">FAISS search</span><div className="meter-track"><div className="meter-fill mf-purple" id="m3" style={{width: '0%'}}></div></div><span className="meter-val">5ms</span></div>
        <div className="meter-row"><span className="meter-label">DB write</span><div className="meter-track"><div className="meter-fill mf-amber" id="m4" style={{width: '0%'}}></div></div><span className="meter-val">8ms</span></div>
        <div className="meter-row"><span className="meter-label">WS push latency</span><div className="meter-track"><div className="meter-fill mf-blue" id="m5" style={{width: '0%'}}></div></div><span className="meter-val">120ms</span></div>
      </div>
    </div>
    <div className="reveal reveal-delay-2">
      <div className="perf-numbers">
        <div className="perf-num"><span className="pn-val">&lt;80<span className="pn-unit">ms</span></span><div className="pn-label">End-to-end</div></div>
        <div className="perf-num"><span className="pn-val">99<span className="pn-unit">%+</span></span><div className="pn-label">Accuracy</div></div>
        <div className="perf-num"><span className="pn-val">30<span className="pn-unit">fps</span></span><div className="pn-label">Stream rate</div></div>
        <div className="perf-num"><span className="pn-val">50k<span className="pn-unit"></span></span><div className="pn-label">FAISS capacity</div></div>
        <div className="perf-num"><span className="pn-val">8<span className="pn-unit">s</span></span><div className="pn-label">Confirm frames</div></div>
        <div className="perf-num"><span className="pn-val">0<span className="pn-unit">b</span></span><div className="pn-label">localStorage used</div></div>
      </div>
    </div>
  </div>
</section>

{/* CTA */}
<section className="cta-section">
  <div className="cta-bg"></div>
  <div className="cta-grid-bg"></div>
  <div className="cta-content reveal">
    <p className="section-label" style={{color: 'rgba(255,255,255,.3)', textAlign: 'center', marginBottom: '20px'}}>Get started</p>
    <h2 className="cta-title">Ready to deploy<br /><em>AttendIQ?</em></h2>
    <p className="cta-sub">Set up in under 5 minutes with Docker Compose. Works with any IP camera or laptop webcam.</p>
    <div className="cta-actions">
      <button className="btn-cta-primary">Start building →</button>
      <button className="btn-cta-ghost">View all prompts</button>
    </div>
    <div style={{marginTop: '48px', fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'rgba(255,255,255,.2)', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px', padding: '16px 20px', display: 'inline-block', textAlign: 'left'}}>
      <span style={{color: 'rgba(255,255,255,.25)'}}>$</span> docker compose up -d && alembic upgrade head && python seed.py<br />
      <span style={{color: '#4ade80'}}>✓ PostgreSQL ready · Redis ready · FRAS running on :8000</span>
    </div>
  </div>
</section>

{/* FOOTER */}
<footer>
  <div className="footer-brand">AttendIQ</div>
  <div className="footer-copy">© 2026 FRAS Demo — College Project</div>
  <div className="footer-links">
    <a href="#features" className="footer-link">Features</a>
    <a href="#pipeline" className="footer-link">Pipeline</a>
    <a href="#portals" className="footer-link">Portals</a>
    <a href="#tech" className="footer-link">Tech stack</a>
  </div>
</footer>


    </div>
  );
};

export default Landing;
