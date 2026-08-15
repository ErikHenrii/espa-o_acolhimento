/**
 * Espaço de Acolhimento - Jaqueline Camila
 * Therapist Clinical Portal Logic (js/terapeuta.js)
 */

const API_BASE = '/api';

// State Management
let currentUser = null;
let authToken = null;

let patientsList = [];
let selectedPatientId = null;
let selectedPatientData = {
  overview: null,
  checkins: [],
  sleep: [],
  journals: []
};

// ============================================================
// XSS Sanitization helper
// ============================================================
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-info-circle';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Auth Verification
function checkAuth() {
  authToken = localStorage.getItem('espaco_token');
  const userJson = localStorage.getItem('espaco_user');

  if (!authToken || !userJson) {
    window.location.href = 'acesso.html';
    return false;
  }

  try {
    currentUser = JSON.parse(userJson);
    if (currentUser.role !== 'terapeuta') {
      window.location.href = currentUser.role === 'paciente' ? 'paciente.html' : 'acesso.html';
      return false;
    }
  } catch (e) {
    window.location.href = 'acesso.html';
    return false;
  }

  return true;
}

// Portuguese Date Formatting
function formatPortugueseDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} às ${String(date.getHours()).padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// Fetch Patients List from API
async function fetchPatients() {
  try {
    const res = await fetch(`${API_BASE}/therapist/patients`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      // API returns { patients: [...] } with avg_score and status per patient
      patientsList = data.patients || [];
    } else if (res.status === 401) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
      setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
      return;
    } else {
      throw new Error('API request failed');
    }
  } catch (e) {
    console.warn('API fetch patients failed, using mock clinical patients dataset');
    loadMockPatients();
  }

  renderPatientList();
  renderMobilePatientSelect();

  // Auto-select first patient if available
  if (patientsList.length > 0) {
    selectPatient(patientsList[0].id);
  } else {
    showEmptyState(true);
  }
}

// Mock patients dataset for local offline testing
function loadMockPatients() {
  const now = new Date();
  patientsList = [
    {
      id: 'p_101',
      name: 'Maria Clara Silva',
      email: 'maria.clara@email.com',
      created_at: '2026-01-15T10:00:00.000Z',
      avg_score: 8.2,
      last_activity: new Date(now - 1000*60*60*2).toISOString(),
      status: 'estavel'
    },
    {
      id: 'p_102',
      name: 'Lucas Eduardo Oliveira',
      email: 'lucas.oliveira@email.com',
      created_at: '2026-02-01T14:30:00.000Z',
      avg_score: 5.6,
      last_activity: new Date(now - 1000*60*60*14).toISOString(),
      status: 'atencao'
    },
    {
      id: 'p_103',
      name: 'Camila Rodriguez Mendes',
      email: 'camila.mendes@email.com',
      created_at: '2026-03-10T09:15:00.000Z',
      avg_score: 4.1,
      last_activity: new Date(now - 1000*60*60*36).toISOString(),
      status: 'critico'
    },
    {
      id: 'p_104',
      name: 'Gabriel Santos Ferreira',
      email: 'gabriel.ferreira@email.com',
      created_at: '2026-04-05T11:20:00.000Z',
      avg_score: 7.8,
      last_activity: new Date(now - 1000*60*60*5).toISOString(),
      status: 'estavel'
    }
  ];
}

// Render Patients List in Sidebar
function renderPatientList(filterText = '') {
  const container = document.getElementById('patient-list');
  const badge = document.getElementById('patient-count-badge');
  if (!container) return;

  const filtered = patientsList.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
  if (badge) badge.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Nenhum paciente encontrado.</div>`;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isSelected = p.id === selectedPatientId;
    
    let dotColorClass = 'bg-emerald-500';
    if (p.avg_score < 5) dotColorClass = 'bg-rose-500';
    else if (p.avg_score < 7) dotColorClass = 'bg-amber-500';

    return `
      <div onclick="selectPatient('${escapeHtml(p.id)}')" 
        class="p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
          isSelected 
            ? 'bg-teal-700 text-white border-teal-800 shadow-sm' 
            : 'bg-white hover:bg-teal-50/80 border-teal-100 text-slate-800'
        }">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-9 h-9 rounded-xl ${isSelected ? 'bg-teal-600 text-amber-300' : 'bg-teal-100 text-teal-800'} font-bold text-sm flex items-center justify-center">
              ${escapeHtml(p.name.charAt(0))}
            </div>
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${dotColorClass}"></span>
          </div>
          <div class="text-left">
            <span class="block text-xs font-bold ${isSelected ? 'text-white' : 'text-teal-950'} line-clamp-1">${escapeHtml(p.name)}</span>
            <span class="text-[10px] ${isSelected ? 'text-teal-200' : 'text-slate-400'}">Média: ${escapeHtml(p.avg_score.toFixed(1))}/10</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right text-[10px] ${isSelected ? 'text-amber-300' : 'text-slate-300'}"></i>
      </div>
    `;
  }).join('');
}

// Render Mobile Select Dropdown Options
function renderMobilePatientSelect() {
  const select = document.getElementById('patient-select-mobile');
  if (!select) return;

  select.innerHTML = patientsList.map(p => `
    <option value="${escapeHtml(p.id)}" ${p.id === selectedPatientId ? 'selected' : ''}>${escapeHtml(p.name)} (Média ${p.avg_score.toFixed(1)})</option>
  `).join('');
}

// Select Patient & Load History
async function selectPatient(patientId) {
  selectedPatientId = patientId;
  renderPatientList(document.getElementById('patient-search-input')?.value || '');
  renderMobilePatientSelect();

  try {
    const res = await fetch(`${API_BASE}/therapist/patient/${patientId}/history`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      // API returns { overview, checkins, sleep, journals } with frontend-friendly names
      selectedPatientData = {
        overview: data.overview || null,
        checkins: data.checkins || [],
        sleep: data.sleep || [],
        journals: data.journals || []
      };
    } else if (res.status === 401) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
      setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
      return;
    } else {
      throw new Error('API fetch failed');
    }
  } catch (e) {
    console.warn(`API history fetch failed for patient ${patientId}, using mock data`);
    loadMockPatientHistory(patientId);
  }

  showEmptyState(false);
  renderPatientOverview();
  renderMoodChart();
  renderSleepChart();
  renderRecentCheckins();
  renderSharedJournals();
  renderSleepRecords();
}
window.selectPatient = selectPatient;

// Mock patient history generator
function loadMockPatientHistory(patientId) {
  const patient = patientsList.find(p => p.id === patientId) || patientsList[0];
  const now = new Date();

  const mockCheckins = [];
  const mockSleep = [];
  const mockJournals = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(now - 1000*60*60*24*i);
    const score = Math.min(10, Math.max(2, Math.round(patient.avg_score + (Math.sin(i) * 2))));
    
    let mood = 'Bem';
    if (score >= 9) mood = 'Radiante';
    else if (score >= 7) mood = 'Bem';
    else if (score >= 5) mood = 'Neutro';
    else if (score >= 3) mood = 'Cansado';
    else mood = 'Difícil';

    mockCheckins.push({
      id: `ck_${patientId}_${i}`,
      created_at: date.toISOString(),
      score: score,
      mood: mood,
      triggers: i % 2 === 0 ? ['Trabalho', 'Ansiedade'] : ['Sono', 'Rotina'],
      notes: i === 0 ? 'Relatou leve melhora na qualidade das noites.' : ''
    });

    mockSleep.push({
      id: `sl_${patientId}_${i}`,
      created_at: date.toISOString(),
      hours: Math.min(10, Math.max(4, Number((7 + Math.cos(i) * 1.5).toFixed(1)))),
      quality: score >= 7 ? 'Boa' : 'Regular',
      notes: i === 1 ? 'Acordou duas vezes durante a noite.' : ''
    });
  }

  mockJournals.push(
    {
      id: `jn_${patientId}_1`,
      created_at: new Date(now - 1000*60*60*12).toISOString(),
      content: 'Consegui praticar a técnica de grounding quando me senti sobrecarregado no início da tarde. Ajudou bastante a diminuir os batimentos.',
      is_shared: true
    },
    {
      id: `jn_${patientId}_2`,
      created_at: new Date(now - 1000*60*60*72).toISOString(),
      content: 'Refletindo sobre as perguntas que a Jaqueline fez sobre minha infância. Começando a entender melhor de onde vem o medo de errar.',
      is_shared: true
    }
  );

  selectedPatientData = {
    overview: patient,
    checkins: mockCheckins,
    sleep: mockSleep,
    journals: mockJournals
  };
}

function showEmptyState(show) {
  const emptyView = document.getElementById('empty-state-view');
  const detailsView = document.getElementById('patient-details-view');

  if (show) {
    if (emptyView) emptyView.classList.remove('hidden');
    if (detailsView) detailsView.classList.add('hidden');
  } else {
    if (emptyView) emptyView.classList.add('hidden');
    if (detailsView) detailsView.classList.remove('hidden');
  }
}

// Render Patient Overview Card Header
function renderPatientOverview() {
  const p = selectedPatientData.overview || patientsList[0];
  if (!p) return;

  document.getElementById('overview-avatar').textContent = p.name ? p.name.charAt(0) : 'P';
  document.getElementById('overview-name').textContent = p.name;
  document.getElementById('overview-email').textContent = p.email;
  document.getElementById('overview-since').textContent = `Cadastrado(a) em ${formatDateShort(p.created_at)}`;

  const pill = document.getElementById('overview-status-pill');
  if (pill) {
    if (p.avg_score >= 7) {
      pill.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800';
      pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Quadro Estável';
    } else if (p.avg_score >= 5) {
      pill.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800';
      pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> Requer Atenção';
    } else {
      pill.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800';
      pill.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span> Alerta Clínico';
    }
  }

  document.getElementById('overview-count-checkins').textContent = selectedPatientData.checkins.length;
  document.getElementById('overview-count-sleep').textContent = selectedPatientData.sleep.length;
  document.getElementById('overview-count-journals').textContent = selectedPatientData.journals.length;
}

// Render 14 Days Mood Line Chart (SVG)
function renderMoodChart() {
  const container = document.getElementById('therapist-mood-chart');
  if (!container) return;

  const data = [...selectedPatientData.checkins].slice(0, 14).reverse();
  if (data.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400">Sem dados suficientes de humor.</p>`;
    return;
  }

  const svgW = 400;
  const svgH = 160;
  const padX = 30;
  const padY = 20;

  const points = data.map((d, idx) => {
    const x = padX + (idx / Math.max(1, data.length - 1)) * (svgW - padX * 2);
    const y = svgH - padY - ((d.score - 1) / 9) * (svgH - padY * 2);
    return { x, y, score: d.score, date: formatDateShort(d.created_at) };
  });

  const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const dots = points.map(p => `
    <g class="group">
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#0f766e" stroke="#ffffff" stroke-width="2" class="cursor-pointer hover:r-6 transition-all" />
      <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#0f766e">${escapeHtml(String(p.score))}</text>
      <text x="${p.x.toFixed(1)}" y="${svgH - 4}" text-anchor="middle" font-size="8" fill="#64748b">${escapeHtml(p.date)}</text>
    </g>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-full overflow-visible">
      <line x1="${padX}" y1="${padY}" x2="${svgW - padX}" y2="${padY}" stroke="#ccfbf1" stroke-dasharray="3,3" />
      <line x1="${padX}" y1="${svgH/2}" x2="${svgW - padX}" y2="${svgH/2}" stroke="#ccfbf1" stroke-dasharray="3,3" />
      <line x1="${padX}" y1="${svgH - padY}" x2="${svgW - padX}" y2="${svgH - padY}" stroke="#ccfbf1" stroke-dasharray="3,3" />
      
      <polyline fill="none" stroke="#14b8a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
      ${dots}
    </svg>
  `;
}

// Render 14 Days Sleep Bar Chart (SVG)
function renderSleepChart() {
  const container = document.getElementById('therapist-sleep-chart');
  if (!container) return;

  const data = [...selectedPatientData.sleep].slice(0, 14).reverse();
  if (data.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400">Sem dados suficientes de sono.</p>`;
    return;
  }

  const svgW = 400;
  const svgH = 160;
  const padX = 30;
  const padY = 20;

  const maxHours = 12;
  const barWidth = Math.max(12, (svgW - padX * 2) / data.length - 8);

  const bars = data.map((d, idx) => {
    const x = padX + idx * ((svgW - padX * 2) / data.length) + 4;
    const barHeight = (d.hours / maxHours) * (svgH - padY * 2);
    const y = svgH - padY - barHeight;

    return `
      <g class="group">
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="4" fill="#6366f1" opacity="0.8" class="hover:opacity-100 transition-all cursor-pointer"/>
        <text x="${(x + barWidth/2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#4338ca">${escapeHtml(String(d.hours))}h</text>
        <text x="${(x + barWidth/2).toFixed(1)}" y="${svgH - 4}" text-anchor="middle" font-size="8" fill="#64748b">${escapeHtml(formatDateShort(d.created_at))}</text>
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-full overflow-visible">
      <line x1="${padX}" y1="${padY}" x2="${svgW - padX}" y2="${padY}" stroke="#e0e7ff" stroke-dasharray="3,3" />
      <line x1="${padX}" y1="${svgH/2}" x2="${svgW - padX}" y2="${svgH/2}" stroke="#e0e7ff" stroke-dasharray="3,3" />
      <line x1="${padX}" y1="${svgH - padY}" x2="${svgW - padX}" y2="${svgH - padY}" stroke="#e0e7ff" stroke-dasharray="3,3" />
      ${bars}
    </svg>
  `;
}

// Render Recent Check-ins Card List
function renderRecentCheckins() {
  const container = document.getElementById('therapist-checkins-list');
  if (!container) return;

  if (selectedPatientData.checkins.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Nenhum check-in registrado.</p>`;
    return;
  }

  // Use original SVG mood characters instead of emojis

  container.innerHTML = selectedPatientData.checkins.slice(0, 5).map(c => `
    <div class="p-3 rounded-xl bg-white border border-teal-100 shadow-sm space-y-1.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="inline-block">${MoodCharacters.getSVG(c.mood, 24)}</span>
          <span class="text-xs font-bold text-teal-950">${escapeHtml(c.mood)}</span>
        </div>
        <span class="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">Nota ${escapeHtml(String(c.score))}/10</span>
      </div>
      <p class="text-[11px] text-slate-400">${escapeHtml(formatPortugueseDate(c.created_at))}</p>
      ${c.notes ? `<p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">"${escapeHtml(c.notes)}"</p>` : ''}
      ${(c.triggers && c.triggers.length > 0) ? `
        <div class="flex flex-wrap gap-1 pt-1">
          ${c.triggers.map(t => `<span class="px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 text-[9px] font-semibold">${escapeHtml(t)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Render Shared Journal Entries
function renderSharedJournals() {
  const container = document.getElementById('therapist-journals-list');
  if (!container) return;

  const shared = selectedPatientData.journals.filter(j => j.is_shared || j.privacy === 'shared');

  if (shared.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Nenhuma entrada compartilhada.</p>`;
    return;
  }

  container.innerHTML = shared.map(j => `
    <div class="p-3 rounded-xl bg-white border border-amber-100 shadow-sm space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-semibold text-slate-400">${escapeHtml(formatPortugueseDate(j.created_at))}</span>
        <span class="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          <i class="fa-solid fa-user-check"></i> Compartilhado
        </span>
      </div>
      <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">${escapeHtml(j.content)}</p>
    </div>
  `).join('');
}

// Render Sleep Records
function renderSleepRecords() {
  const container = document.getElementById('therapist-sleep-list');
  if (!container) return;

  if (selectedPatientData.sleep.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 py-4 text-center">Nenhum registro de sono.</p>`;
    return;
  }

  container.innerHTML = selectedPatientData.sleep.slice(0, 5).map(s => `
    <div class="p-3 rounded-xl bg-white border border-indigo-100 shadow-sm space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-indigo-950">${escapeHtml(String(s.hours))} horas dormidas</span>
        <span class="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">${escapeHtml(s.quality || '')}</span>
      </div>
      <p class="text-[10px] text-slate-400">${escapeHtml(formatPortugueseDate(s.created_at))}</p>
      ${s.notes ? `<p class="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">${escapeHtml(s.notes)}</p>` : ''}
    </div>
  `).join('');
}

// Initial Listener Setup
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    fetchPatients();

    const searchInput = document.getElementById('patient-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderPatientList(e.target.value);
      });
    }

    const selectMobile = document.getElementById('patient-select-mobile');
    if (selectMobile) {
      selectMobile.addEventListener('change', (e) => {
        if (e.target.value) {
          selectPatient(e.target.value);
        }
      });
    }

    const btnLogout = document.getElementById('btn-therapist-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        if (window.logoutApp) window.logoutApp();
      });
    }
  }
});
