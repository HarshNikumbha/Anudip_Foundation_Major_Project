/* ============================================================
   EduAnalytics — script.js
   Handles: tab navigation, predict API, class analytics, correlations
   ============================================================ */

const API = "http://127.0.0.1:5000";

// Chart instances
let performanceChart = null;
let importanceChart = null;
let subjectChart = null;
let correlationChart = null;

// Track if analytics/correlation data loaded
let analyticsLoaded = false;
let correlationLoaded = false;

/* ==================== TAB NAVIGATION ==================== */
function switchTab(tabName) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  document.getElementById('tab' + capitalize(tabName)).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'analytics' && !analyticsLoaded) loadClassAnalytics();
  if (tabName === 'correlation' && !correlationLoaded) loadCorrelations();
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ==================== INPUT VALIDATION ==================== */
function validateInputs(att, study, internal, assign, fin) {
  if ([att, study, internal, assign, fin].some(v => v === '' || isNaN(v))) {
    showError('Please fill all fields with valid numbers.'); return false;
  }
  if (att < 0 || att > 100) { showError('Attendance must be between 0 and 100.'); return false; }
  if (study < 0) { showError('Study hours cannot be negative.'); return false; }
  if (internal < 0 || internal > 100) { showError('Internal marks must be 0–100.'); return false; }
  if (assign < 0 || assign > 100) { showError('Assignment score must be 0–100.'); return false; }
  if (fin < 0 || fin > 100) { showError('Final marks must be 0–100.'); return false; }
  return true;
}

function showError(msg) {
  const predDiv = document.getElementById('predictionDisplay');
  predDiv.innerHTML = `<div style="color:#ef4444;font-size:0.9rem;padding:12px;">⚠️ ${msg}</div>`;
}

/* ==================== BAR CHART (Metrics) ==================== */
function updateMetricsChart(att, study, inter, assign, fin) {
  const ctx = document.getElementById('performanceChart').getContext('2d');
  const data = [att, study * 10, inter, assign, fin]; // scale study hours x10 for visual
  const labels = ['Attendance', 'Study×10', 'Internal', 'Assignment', 'Final'];
  const colors = [
    'rgba(59,130,246,0.75)', 'rgba(34,197,94,0.75)',
    'rgba(168,85,247,0.75)', 'rgba(6,182,212,0.75)',
    'rgba(245,158,11,0.75)'
  ];

  if (performanceChart) {
    performanceChart.data.datasets[0].data = data;
    performanceChart.update('active');
    return;
  }

  performanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Score / Metric',
        data,
        backgroundColor: colors,
        borderRadius: 8,
        barPercentage: 0.65
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ctx.label === 'Study×10'
              ? ` Study Hours: ${(ctx.raw / 10).toFixed(1)} hrs/day`
              : ` ${ctx.label}: ${ctx.raw}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10 } }
        }
      }
    }
  });
}

/* ==================== FEATURE IMPORTANCE CHART ==================== */
function renderImportanceChart(importances) {
  const card = document.getElementById('importanceCard');
  card.style.display = 'block';

  const ctx = document.getElementById('importanceChart').getContext('2d');
  const labels = Object.keys(importances);
  const values = Object.values(importances).map(v => Math.round(v * 100));
  const colors = ['rgba(59,130,246,0.75)', 'rgba(34,197,94,0.75)',
                  'rgba(168,85,247,0.75)', 'rgba(6,182,212,0.75)', 'rgba(245,158,11,0.75)'];

  if (importanceChart) {
    importanceChart.data.datasets[0].data = values;
    importanceChart.update();
    return;
  }

  importanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Importance (%)',
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          callbacks: { label: c => ` ${c.raw}% importance` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748b' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
      }
    }
  });
}

/* ==================== IMPROVEMENT SUGGESTIONS ==================== */
function renderSuggestions(suggestions) {
  const card = document.getElementById('suggestionsCard');
  const list = document.getElementById('suggestionsList');
  card.style.display = 'block';
  list.innerHTML = '';

  suggestions.forEach(s => {
    const hex = s.color || '#3b82f6';
    const alphaHex = hex + '22';
    list.innerHTML += `
      <div class="suggestion-item">
        <div class="suggestion-icon" style="background:${alphaHex};color:${hex};">
          <i class="fas ${s.icon}"></i>
        </div>
        <div>
          <div class="suggestion-area" style="color:${hex};">${s.area}</div>
          <div class="suggestion-tip">${s.tip}</div>
        </div>
      </div>`;
  });
}

/* ==================== LOADING STATE ==================== */
function setLoading(isLoading, btn) {
  btn.disabled = isLoading;
  btn.style.opacity = isLoading ? '0.75' : '1';
  btn.innerHTML = isLoading
    ? `<span class="loading-spinner"></span><span>Analyzing...</span>`
    : `<i class="fas fa-chart-line"></i><span>Analyze Performance</span>`;
}

/* ==================== RESULT DISPLAY ==================== */
function showResult(prediction, accuracyPercent) {
  const predDiv = document.getElementById('predictionDisplay');
  const accDiv = document.getElementById('accuracyDisplay');
  const isPass = prediction.toLowerCase().includes('pass');

  predDiv.innerHTML = `
    <div class="prediction-badge">
      <div class="${isPass ? 'pass-result' : 'fail-result'}">
        <i class="fas ${isPass ? 'fa-check-circle' : 'fa-times-circle'}" style="font-size:1.4rem;"></i>
        <span style="font-size:1.7rem;font-weight:800;">${prediction.toUpperCase()}</span>
      </div>
    </div>
    <div style="margin-top:8px;font-size:0.88rem;color:${isPass ? '#22c55e' : '#ef4444'};">
      ${isPass ? '🎓 Excellent academic performance!' : '⚠️ Student needs improvement in key areas'}
    </div>`;

  accDiv.innerHTML = `<i class="fas fa-microchip"></i> Model Accuracy: <strong>${accuracyPercent}%</strong> ✨`;

  document.getElementById('accuracyPill').innerHTML =
    `<i class="fas fa-chart-simple"></i> Accuracy: ${accuracyPercent}%`;
}

/* ==================== MAIN PREDICT FUNCTION ==================== */
async function performPrediction() {
  const att   = document.getElementById('attendance').value.trim();
  const study = document.getElementById('study').value.trim();
  const inter = document.getElementById('internal').value.trim();
  const assign = document.getElementById('assignment').value.trim();
  const fin   = document.getElementById('final').value.trim();

  const attN = parseFloat(att), studyN = parseFloat(study),
        interN = parseFloat(inter), assignN = parseFloat(assign), finN = parseFloat(fin);

  if (!validateInputs(attN, studyN, interN, assignN, finN)) return;

  updateMetricsChart(attN, studyN, interN, assignN, finN);

  const btn = document.getElementById('predictBtn');
  setLoading(true, btn);

  const predDiv = document.getElementById('predictionDisplay');
  predDiv.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;gap:10px;padding:18px;color:#64748b;">
    <div class="loading-spinner" style="border-top-color:#3b82f6;border-color:rgba(255,255,255,0.1);"></div>
    <span>Contacting AI Engine...</span></div>`;
  document.getElementById('accuracyDisplay').innerHTML = `<i class="fas fa-spinner fa-pulse"></i> Computing...`;

  try {
    const res = await fetch(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendance: attN, study_hours: studyN,
        internal_marks: interN, assignment_score: assignN, final_marks: finN
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    showResult(data.prediction, data.accuracy_percent);
    renderSuggestions(data.suggestions);
    if (data.feature_importances) renderImportanceChart(data.feature_importances);

  } catch (err) {
    console.error(err);
    predDiv.innerHTML = `
      <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:16px;color:#ef4444;">
        <i class="fas fa-server"></i> ${err.message.includes('fetch') ? 'Cannot reach Flask server. Make sure <code>python app.py</code> is running.' : err.message}
      </div>`;
    document.getElementById('accuracyDisplay').innerHTML = `<i class="fas fa-exclamation-triangle"></i> Connection failed`;
  } finally {
    setLoading(false, btn);
  }
}

/* ==================== CLASS ANALYTICS ==================== */
async function loadClassAnalytics() {
  try {
    const res = await fetch(`${API}/class-analytics`);
    const d = await res.json();
    analyticsLoaded = true;

    // Stats
    document.getElementById('statTotal').textContent = d.total_students;
    document.getElementById('statPass').textContent = d.pass_count;
    document.getElementById('statFail').textContent = d.fail_count;
    document.getElementById('statRate').textContent = d.pass_rate + '%';
    document.getElementById('statAvgFinal').textContent = d.class_avg.final_marks;

    // Subject chart
    renderSubjectChart(d.subject_avg);

    // Toppers
    const topList = document.getElementById('toppersList');
    topList.innerHTML = '';
    d.toppers.forEach((t, i) => {
      const rankClass = ['rank-1','rank-2','rank-3','rank-other','rank-other'][i];
      topList.innerHTML += `
        <div class="topper-item">
          <div class="topper-rank ${rankClass}">#${i + 1}</div>
          <div class="topper-name">${t.name}</div>
          <span class="topper-marks">${t.final_marks} / 100</span>
        </div>`;
    });

    // Weak students table
    document.getElementById('weakCount').textContent = `${d.weak_students.length} students`;
    const tbody = document.getElementById('weakTableBody');
    if (d.weak_students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-row" style="color:#22c55e;">✅ No students need attention</td></tr>';
    } else {
      tbody.innerHTML = d.weak_students.map((s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td style="color:#f1f5f9;font-weight:500;">${s.name}</td>
          <td style="color:${s.attendance < 65 ? '#ef4444' : '#94a3b8'};">${s.attendance}%</td>
          <td style="color:${s.final_marks < 40 ? '#ef4444' : '#94a3b8'};">${s.final_marks}</td>
          <td><span class="badge-${s.result.toLowerCase()}">${s.result}</span></td>
          <td>${s.reasons.map(r => `<span class="reason-tag">${r}</span>`).join('')}</td>
        </tr>`).join('');
    }

  } catch (err) {
    document.getElementById('weakTableBody').innerHTML =
      `<tr><td colspan="6" class="loading-row" style="color:#ef4444;">
        <i class="fas fa-server"></i> Cannot load data. Is Flask running?
      </td></tr>`;
  }
}

function renderSubjectChart(subjectAvg) {
  const ctx = document.getElementById('subjectChart').getContext('2d');
  const labels = Object.keys(subjectAvg);
  const values = Object.values(subjectAvg);
  const colors = [
    'rgba(59,130,246,0.75)', 'rgba(34,197,94,0.75)',
    'rgba(168,85,247,0.75)', 'rgba(245,158,11,0.75)',
    'rgba(6,182,212,0.75)'
  ];

  if (subjectChart) { subjectChart.destroy(); subjectChart = null; }

  subjectChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Class Average Score',
        data: values,
        backgroundColor: colors,
        borderRadius: 10,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          callbacks: { label: c => ` Avg: ${c.raw}` }
        }
      },
      scales: {
        y: {
          beginAtZero: true, max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#64748b' }
        },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  });
}

/* ==================== CORRELATIONS ==================== */
async function loadCorrelations() {
  try {
    const res = await fetch(`${API}/correlations`);
    const points = await res.json();
    correlationLoaded = true;
    renderCorrelationChart(points);
  } catch (err) {
    console.error('Correlation load failed:', err);
  }
}

function renderCorrelationChart(points) {
  const ctx = document.getElementById('correlationChart').getContext('2d');

  const passPoints = points.filter(p => p.result === 'Pass').map(p => ({ x: p.x, y: p.y, name: p.name }));
  const failPoints = points.filter(p => p.result === 'Fail').map(p => ({ x: p.x, y: p.y, name: p.name }));

  if (correlationChart) { correlationChart.destroy(); correlationChart = null; }

  correlationChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Pass',
          data: passPoints,
          backgroundColor: 'rgba(34,197,94,0.65)',
          pointRadius: 7,
          pointHoverRadius: 9
        },
        {
          label: 'Fail',
          data: failPoints,
          backgroundColor: 'rgba(239,68,68,0.65)',
          pointRadius: 7,
          pointHoverRadius: 9
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          callbacks: {
            label: ctx => {
              const p = ctx.raw;
              return ` ${p.name || ''} | Att: ${p.x}% | Final: ${p.y}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Attendance (%)', color: '#64748b', font: { size: 12 } },
          min: 35, max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#64748b' }
        },
        y: {
          title: { display: true, text: 'Final Marks', color: '#64748b', font: { size: 12 } },
          min: 15, max: 100,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#64748b' }
        }
      }
    }
  });
}

/* ==================== LIVE CHART UPDATE ==================== */
function liveUpdate() {
  const att   = parseFloat(document.getElementById('attendance').value) || 0;
  const study = parseFloat(document.getElementById('study').value) || 0;
  const inter = parseFloat(document.getElementById('internal').value) || 0;
  const assign = parseFloat(document.getElementById('assignment').value) || 0;
  const fin   = parseFloat(document.getElementById('final').value) || 0;
  updateMetricsChart(att, study, inter, assign, fin);
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {

  // Tab switching
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Predict button
  document.getElementById('predictBtn').addEventListener('click', performPrediction);

  // Refresh buttons
  document.getElementById('refreshAnalytics').addEventListener('click', () => {
    analyticsLoaded = false;
    loadClassAnalytics();
  });
  document.getElementById('refreshCorr').addEventListener('click', () => {
    correlationLoaded = false;
    loadCorrelations();
  });

  // Live chart on input
  ['attendance', 'study', 'internal', 'assignment', 'final'].forEach(id => {
    document.getElementById(id).addEventListener('input', liveUpdate);
  });

  // Init default chart
  liveUpdate();
});