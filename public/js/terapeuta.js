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
let patientFilter = 'active'; // 'active' | 'inactive' | 'all'
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

    // Display therapist name and specialty in header
    var specLabel = document.getElementById('therapist-specialty-label');
    var therapistNameEl = document.getElementById('therapist-name');
    if (specLabel) {
      var specialty = currentUser.specialty || 'Psicologia';
      specLabel.textContent = escapeHtml(currentUser.name) + ' • ' + escapeHtml(specialty);
    }
    if (therapistNameEl) {
      therapistNameEl.textContent = currentUser.name || 'Terapeuta';
    }
  } catch (e) {
    window.location.href = 'acesso.html';
    return false;
  }

  return true;
}

// Normalize date string to ISO format (handles both old and new formats)
function normalizeDate(dateStr) {
  if (!dateStr) return dateStr;
  if (typeof dateStr !== 'string') return dateStr;
  if (dateStr.includes('T')) return dateStr;
  // Old format: 'YYYY-MM-DD HH:MI:SS' → treat as UTC
  return dateStr.replace(' ', 'T') + 'Z';
}

// Portuguese Date Formatting
function formatPortugueseDate(dateStr) {
  const date = new Date(normalizeDate(dateStr));
  if (isNaN(date)) return dateStr;
  
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} às ${String(date.getHours()).padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateShort(dateStr) {
  const date = new Date(normalizeDate(dateStr));
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
      status: 'estavel',
      is_active: 1
    },
    {
      id: 'p_102',
      name: 'Lucas Eduardo Oliveira',
      email: 'lucas.oliveira@email.com',
      created_at: '2026-02-01T14:30:00.000Z',
      avg_score: 5.6,
      last_activity: new Date(now - 1000*60*60*14).toISOString(),
      status: 'atencao',
      is_active: 1
    },
    {
      id: 'p_103',
      name: 'Camila Rodriguez Mendes',
      email: 'camila.mendes@email.com',
      created_at: '2026-03-10T09:15:00.000Z',
      avg_score: 4.1,
      last_activity: new Date(now - 1000*60*60*36).toISOString(),
      status: 'critico',
      is_active: 0
    },
    {
      id: 'p_104',
      name: 'Gabriel Santos Ferreira',
      email: 'gabriel.ferreira@email.com',
      created_at: '2026-04-05T11:20:00.000Z',
      avg_score: 7.8,
      last_activity: new Date(now - 1000*60*60*5).toISOString(),
      status: 'estavel',
      is_active: 1
    }
  ];
}

// Render Patients List in Sidebar (divided by active/inactive filter)
function renderPatientList(filterText = '') {
  const container = document.getElementById('patient-list');
  const badge = document.getElementById('patient-count-badge');
  if (!container) return;

  // Filter by search text
  let filtered = patientsList.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()));
  
  // Filter by active/inactive status
  if (patientFilter === 'active') {
    filtered = filtered.filter(p => p.is_active !== 0);
  } else if (patientFilter === 'inactive') {
    filtered = filtered.filter(p => p.is_active === 0);
  }

  if (badge) badge.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">Nenhum paciente encontrado.</div>`;
    return;
  }

  // Split into active and inactive
  const activePatients = filtered.filter(p => p.is_active !== 0);
  const inactivePatients = filtered.filter(p => p.is_active === 0);
  let html = '';

  if (patientFilter === 'all' || patientFilter === 'active') {
    if (patientFilter === 'all' && activePatients.length > 0) {
      html += `<div class="flex items-center gap-2 px-1 pb-1 pt-1">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span class="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Ativos (${activePatients.length})</span>
      </div>`;
    }
    activePatients.forEach(p => { html += renderPatientCard(p); });
  }

  if (patientFilter === 'all' || patientFilter === 'inactive') {
    if (patientFilter === 'all' && inactivePatients.length > 0) {
      html += `<div class="flex items-center gap-2 px-1 pb-1 pt-3">
        <span class="w-2 h-2 rounded-full bg-slate-400"></span>
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Inativos (${inactivePatients.length})</span>
      </div>`;
    }
    if (patientFilter === 'inactive' && inactivePatients.length === 0) {
      html += `<div class="p-4 text-center text-xs text-slate-400">Nenhum paciente inativo.</div>`;
    }
    inactivePatients.forEach(p => { html += renderPatientCard(p); });
  }

  container.innerHTML = html;
}



// ============================================================
// Mark patient as attended by therapist
// ============================================================
async function markPatientAttended(patientId, event) {
  if (event) event.stopPropagation();
  
  try {
    const res = await fetch(API_BASE + '/therapist/patient/' + patientId + '/mark-attended', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      
      // Update patient in the local list
      const patient = patientsList.find(p => p.id === patientId);
      if (patient) {
        patient.last_attended_at = data.last_attended_at;
        patient.attended_today = true;
        patient.days_since_attended = 0;
      }
      
      renderPatientList(document.getElementById('patient-search-input')?.value || '');
      renderMobilePatientSelect();
      
      showToast('Paciente marcado como atendido', 'success');
    } else if (res.status === 401) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
    } else {
      showToast('Erro ao marcar atendimento.', 'error');
    }
  } catch (e) {
    console.error('markAttended error:', e);
    showToast('Erro de conexão ao marcar atendimento.', 'error');
  }
}

window.markPatientAttended = markPatientAttended;

// ============================================================
// Update status visual indicators
// ============================================================
function getUpdateStatusInfo(p) {
  var status = p.update_status || 'sem_dados';
  var days = p.days_since_update;

  // Calculate days if not provided
  if (days === null || days === undefined) {
    if (p.last_activity) {
      var diff = Date.now() - new Date(p.last_activity).getTime();
      days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) status = 'verde';
      else if (days === 1) status = 'amarelo';
      else status = 'vermelho';
    } else {
      status = 'sem_dados';
    }
  }

  var info = {
    'verde':    { color: 'bg-green-500',   text: 'text-green-600',   border: 'border-l-green-500',  label: 'Atualizado' },
    'amarelo':  { color: 'bg-yellow-500',  text: 'text-yellow-600',  border: 'border-l-yellow-500', label: 'Atenção' },
    'vermelho': { color: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-l-rose-500',    label: 'Atrasado' },
    'sem_dados':{ color: 'bg-slate-300',   text: 'text-slate-400',   border: 'border-l-slate-300',  label: 'Sem dados' }
  };

  var result = info[status] || info['sem_dados'];
  result.status = status;
  result.days = days;
  result.timeAgo = formatTimeAgo(days);
  return result;
}

function formatTimeAgo(days) {
  if (days === null || days === undefined) return 'Sem registros';
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days <= 7) return 'Há ' + days + ' dias';
  if (days <= 30) return 'Há ' + Math.floor(days / 7) + ' sem.';
  return 'Há ' + Math.floor(days / 30) + ' mês';
}

// Render a single patient card
function renderPatientCard(p) {
  const isSelected = p.id === selectedPatientId;
  const isActive = p.is_active !== 0;
  
  // Emotional status dot (wellness score)
  let dotColorClass = 'bg-emerald-500';
  if (p.avg_score < 5) dotColorClass = 'bg-rose-500';
  else if (p.avg_score < 7) dotColorClass = 'bg-amber-500';

  // Update status indicator (when was last emotional update)
  var updateInfo = getUpdateStatusInfo(p);
  
  // Attended indicator (therapist gave attention)
  var attendedToday = p.attended_today === true;
  var attendedBadge = '';
  if (attendedToday && isActive) {
    attendedBadge = `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-amber-400/30 text-amber-200' : 'bg-indigo-100 text-indigo-700'} flex items-center gap-1 mt-0.5 w-fit">
      <i class="fa-solid fa-check text-[8px]"></i> Atendido hoje
    </span>`;
  }

  var selectedBorder = isSelected ? '' : (updateInfo.status === 'verde' ? 'border-l-4 ' + updateInfo.border : '');
  var opacityClass = isActive ? '' : 'opacity-55';
  var statusBadge = isActive 
    ? '' 
    : `<span class="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Inativo</span>`;

  // Build update indicator text
  var updateIndicator = '';
  if (isActive) {
    var updateColor = isSelected ? 'text-amber-200' : updateInfo.text;
    var dotColor = updateInfo.color;
    updateIndicator = `<span class="text-[10px] ${updateColor} flex items-center gap-1 mt-0.5">
      <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>${updateInfo.timeAgo}
    </span>`;
  }

  return `
    <div onclick="selectPatient('${escapeHtml(p.id)}')" 
      class="p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${opacityClass} ${selectedBorder} ${
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
          ${attendedToday ? `<span class="absolute -top-1 -left-1 w-4 h-4 rounded-full ${isSelected ? 'bg-amber-400 text-teal-900' : 'bg-indigo-500 text-white'} flex items-center justify-center text-[8px] shadow-sm"><i class="fa-solid fa-check"></i></span>` : ''}
        </div>
        <div class="text-left">
          <span class="block text-xs font-bold ${isSelected ? 'text-white' : 'text-teal-950'} line-clamp-1">${escapeHtml(p.name)}</span>
          ${statusBadge || `<span class="text-[10px] ${isSelected ? 'text-teal-200' : 'text-slate-400'}">Média: ${escapeHtml(p.avg_score.toFixed(1))}/10</span>`}
          ${updateIndicator}
          ${attendedBadge}
        </div>
      </div>
      <i class="fa-solid fa-chevron-right text-[10px] ${isSelected ? 'text-amber-300' : 'text-slate-300'}"></i>
    </div>
  `;
}

// Render Mobile Select Dropdown Options
function renderMobilePatientSelect() {
  const select = document.getElementById('patient-select-mobile');
  if (!select) return;

  let filtered = patientsList;
  if (patientFilter === 'active') filtered = filtered.filter(p => p.is_active !== 0);
  else if (patientFilter === 'inactive') filtered = filtered.filter(p => p.is_active === 0);

  select.innerHTML = filtered.map(p => `
    <option value="${escapeHtml(p.id)}" ${p.id === selectedPatientId ? 'selected' : ''}>${escapeHtml(p.name)} ${p.is_active === 0 ? '(Inativo)' : ''} — Média ${p.avg_score.toFixed(1)}</option>
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
  const patientIsActive = patient ? patient.is_active : 1;
  const now = new Date();

  const mockCheckins = [];
  const mockSleep = [];
  const mockJournals = [];

  for (let i = 0; i < 30; i++) {
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
    overview: { ...patient, is_active: patientIsActive },
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

  // Display whatsapp button
  var waContainer = document.getElementById('overview-whatsapp-container');
  if (waContainer) {
    if (p.whatsapp) {
      waContainer.classList.remove('hidden');
      window._currentPatientWhatsapp = p.whatsapp;
    } else {
      waContainer.classList.add('hidden');
      window._currentPatientWhatsapp = null;
    }
  }
  document.getElementById('overview-since').textContent = `Cadastrado(a) em ${formatDateShort(p.created_at)}`;

  // Active/inactive pill
  const activePill = document.getElementById('overview-active-pill');
  if (activePill) {
    const isActive = p.is_active !== 0;
    if (isActive) {
      activePill.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800';
      activePill.innerHTML = '<span class="w-2 h-2 rounded-full bg-teal-500"></span> Ativo';
    } else {
      activePill.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-600';
      activePill.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span> Inativo';
    }
  }

  // Toggle button
  const toggleBtn = document.getElementById('btn-toggle-patient-status');
  const toggleLabel = document.getElementById('toggle-status-label');
  if (toggleBtn) {
    const isActive = p.is_active !== 0;
    if (isActive) {
      toggleBtn.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer';
      if (toggleLabel) toggleLabel.textContent = 'Arquivar';
    } else {
      toggleBtn.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 cursor-pointer';
      if (toggleLabel) toggleLabel.textContent = 'Reativar';
    }
  }

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

// Render 30 Days Mood Line Chart (SVG)
function renderMoodChart() {
  const container = document.getElementById('therapist-mood-chart');
  if (!container) return;

  const data = [...selectedPatientData.checkins].slice(0, 30).reverse();
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

// Render 30 Days Sleep Bar Chart (SVG)
function renderSleepChart() {
  const container = document.getElementById('therapist-sleep-chart');
  if (!container) return;

  const data = [...selectedPatientData.sleep].slice(0, 30).reverse();
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

// ============================================================
// Export Patient Data as PDF (with charts)
// ============================================================
function exportPatientPDF() {
  const p = selectedPatientData.overview || patientsList.find(x => x.id === selectedPatientId);
  if (!p) {
    showToast('Selecione um paciente primeiro.', 'error');
    return;
  }

  const checkins = selectedPatientData.checkins || [];
  const sleep = selectedPatientData.sleep || [];
  const journals = selectedPatientData.journals || [];

  const now = new Date();
  const reportDate = formatPortugueseDate(now.toISOString());

  // Capture SVG charts from the page
  var moodChartSVG = '';
  var moodContainer = document.getElementById('therapist-mood-chart');
  if (moodContainer) {
    var svgEl = moodContainer.querySelector('svg');
    if (svgEl) {
      moodChartSVG = svgEl.outerHTML;
    }
  }

  var sleepChartSVG = '';
  var sleepContainer = document.getElementById('therapist-sleep-chart');
  if (sleepContainer) {
    var svgEl = sleepContainer.querySelector('svg');
    if (svgEl) {
      sleepChartSVG = svgEl.outerHTML;
    }
  }

  // Build mood data for embedded chart (fallback if SVG not available)
  var moodData = checkins.slice(0, 30).reverse();
  var sleepData = sleep.slice(0, 30).reverse();

  // Build mood chart SVG if not captured from page
  if (!moodChartSVG && moodData.length > 0) {
    var svgW = 500, svgH = 200, padX = 40, padY = 25;
    var pts = moodData.map(function(d, idx) {
      var x = padX + (idx / Math.max(1, moodData.length - 1)) * (svgW - padX * 2);
      var y = svgH - padY - ((d.score - 1) / 9) * (svgH - padY * 2);
      return { x: x, y: y, score: d.score, date: formatDateShort(d.created_at) };
    });
    var poly = pts.map(function(p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
    var dots = pts.map(function(p) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="#0f766e" stroke="#fff" stroke-width="2"/>' +
             '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - 8).toFixed(1) + '" text-anchor="middle" font-size="9" font-weight="bold" fill="#0f766e">' + p.score + '</text>' +
             '<text x="' + p.x.toFixed(1) + '" y="' + (svgH - 5) + '" text-anchor="middle" font-size="7" fill="#64748b">' + p.date + '</text>';
    }).join('');
    moodChartSVG = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="width:100%;height:auto;">' +
      '<line x1="' + padX + '" y1="' + padY + '" x2="' + (svgW - padX) + '" y2="' + padY + '" stroke="#ccfbf1" stroke-dasharray="3,3"/>' +
      '<line x1="' + padX + '" y1="' + (svgH/2) + '" x2="' + (svgW - padX) + '" y2="' + (svgH/2) + '" stroke="#ccfbf1" stroke-dasharray="3,3"/>' +
      '<line x1="' + padX + '" y1="' + (svgH - padY) + '" x2="' + (svgW - padX) + '" y2="' + (svgH - padY) + '" stroke="#ccfbf1" stroke-dasharray="3,3"/>' +
      '<polyline fill="none" stroke="#14b8a6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="' + poly + '"/>' +
      dots + '</svg>';
  }

  // Build sleep chart SVG if not captured
  if (!sleepChartSVG && sleepData.length > 0) {
    var svgW2 = 500, svgH2 = 200, padX2 = 40, padY2 = 25;
    var maxHours = 12;
    var barW = Math.max(8, (svgW2 - padX2 * 2) / sleepData.length - 6);
    var bars = sleepData.map(function(d, idx) {
      var x = padX2 + idx * ((svgW2 - padX2 * 2) / sleepData.length) + 3;
      var bh = (d.hours / maxHours) * (svgH2 - padY2 * 2);
      var y = svgH2 - padY2 - bh;
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3" fill="#6366f1" opacity="0.8"/>' +
             '<text x="' + (x + barW/2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="8" font-weight="bold" fill="#4338ca">' + d.hours + 'h</text>' +
             '<text x="' + (x + barW/2).toFixed(1) + '" y="' + (svgH2 - 5) + '" text-anchor="middle" font-size="7" fill="#64748b">' + formatDateShort(d.created_at) + '</text>';
    }).join('');
    sleepChartSVG = '<svg viewBox="0 0 ' + svgW2 + ' ' + svgH2 + '" style="width:100%;height:auto;">' +
      '<line x1="' + padX2 + '" y1="' + padY2 + '" x2="' + (svgW2 - padX2) + '" y2="' + padY2 + '" stroke="#e0e7ff" stroke-dasharray="3,3"/>' +
      '<line x1="' + padX2 + '" y1="' + (svgH2/2) + '" x2="' + (svgW2 - padX2) + '" y2="' + (svgH2/2) + '" stroke="#e0e7ff" stroke-dasharray="3,3"/>' +
      '<line x1="' + padX2 + '" y1="' + (svgH2 - padY2) + '" x2="' + (svgW2 - padX2) + '" y2="' + (svgH2 - padY2) + '" stroke="#e0e7ff" stroke-dasharray="3,3"/>' +
      bars + '</svg>';
  }

  var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">';
  html += '<title>Relatorio - ' + escapeHtml(p.name) + '</title>';
  html += '<style>';
  html += '@page { margin: 1.5cm; }';
  html += 'body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }';
  html += 'h1 { color: #0f766e; font-size: 20px; border-bottom: 2px solid #14b8a6; padding-bottom: 8px; }';
  html += 'h2 { color: #0f766e; font-size: 14px; margin-top: 24px; margin-bottom: 8px; }';
  html += '.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }';
  html += '.header-info { font-size: 11px; color: #666; text-align: right; }';
  html += '.patient-card { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px; margin: 12px 0; }';
  html += '.stats { display: flex; gap: 16px; margin: 12px 0; }';
  html += '.stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 16px; text-align: center; flex: 1; }';
  html += '.stat strong { display: block; font-size: 18px; color: #0f766e; }';
  html += '.stat span { font-size: 10px; color: #64748b; text-transform: uppercase; }';
  html += '.chart-container { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 12px 0; }';
  html += '.chart-container svg { max-width: 100%; height: auto; }';
  html += '.charts-row { display: flex; gap: 16px; flex-wrap: wrap; }';
  html += '.chart-col { flex: 1; min-width: 300px; }';
  html += 'table { width: 100%; border-collapse: collapse; margin: 8px 0; }';
  html += 'th { background: #f0fdfa; color: #0f766e; font-size: 11px; text-align: left; padding: 6px 8px; border-bottom: 2px solid #99f6e4; }';
  html += 'td { font-size: 10px; padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }';
  html += '.footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }';
  html += '.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }';
  html += '.badge-active { background: #d1fae5; color: #065f46; }';
  html += '.badge-inactive { background: #f1f5f9; color: #64748b; }';
  html += '@media print { body { -webkit-print-color-adjust: exact; } }';
  html += '</style></head><body>';

  html += '<div class="header">';
  html += '<div><h1>Espaço de Acolhimento</h1><p style="font-size:11px;color:#666;">Relatório Clínico do Paciente</p></div>';
  html += '<div class="header-info">Gerado em: ' + escapeHtml(reportDate) + '</div>';
  html += '</div>';

  html += '<div class="patient-card">';
  html += '<strong style="font-size:16px;">' + escapeHtml(p.name) + '</strong><br>';
  html += '<span style="font-size:11px;color:#666;">E-mail: ' + escapeHtml(p.email || '-') + '</span>';
  if (p.whatsapp) {
    html += '<br><span style="font-size:11px;color:#666;">WhatsApp: ' + escapeHtml(p.whatsapp) + '</span>';
  }
  html += '<br><span style="font-size:11px;color:#666;">Cadastrado em: ' + escapeHtml(formatDateShort(p.created_at)) + '</span><br>';
  var isActive = p.is_active !== 0;
  html += '<span class="badge ' + (isActive ? 'badge-active' : 'badge-inactive') + '">' + (isActive ? 'Ativo' : 'Inativo') + '</span>';
  html += '</div>';

  html += '<div class="stats">';
  html += '<div class="stat"><strong>' + checkins.length + '</strong><span>Check-ins</span></div>';
  html += '<div class="stat"><strong>' + sleep.length + '</strong><span>Registros de Sono</span></div>';
  html += '<div class="stat"><strong>' + journals.length + '</strong><span>Diários</span></div>';
  html += '<div class="stat"><strong>' + escapeHtml(String((p.avg_score || 0).toFixed(1))) + '</strong><span>Média Humor</span></div>';
  html += '</div>';

  // Charts section
  html += '<h2>Gráficos de Evolução (30 Dias)</h2>';
  html += '<div class="charts-row">';
  html += '<div class="chart-col"><div class="chart-container"><strong style="font-size:12px;color:#0f766e;">Evolução do Humor</strong><br>';
  if (moodChartSVG) { html += moodChartSVG; } else { html += '<p style="font-size:11px;color:#999;">Sem dados de humor.</p>'; }
  html += '</div></div>';
  html += '<div class="chart-col"><div class="chart-container"><strong style="font-size:12px;color:#0f766e;">Horas de Sono</strong><br>';
  if (sleepChartSVG) { html += sleepChartSVG; } else { html += '<p style="font-size:11px;color:#999;">Sem dados de sono.</p>'; }
  html += '</div></div>';
  html += '</div>';

  // Check-ins table
  html += '<h2>Últimos Check-ins</h2>';
  if (checkins.length === 0) {
    html += '<p style="font-size:11px;color:#999;">Nenhum check-in registrado.</p>';
  } else {
    html += '<table><thead><tr><th>Data</th><th>Humor</th><th>Pontuação</th><th>Gatilhos</th><th>Notas</th></tr></thead><tbody>';
    checkins.slice(0, 30).forEach(function(c) {
      html += '<tr>';
      html += '<td>' + escapeHtml(formatPortugueseDate(c.created_at)) + '</td>';
      html += '<td>' + escapeHtml(c.mood || '-') + '</td>';
      html += '<td>' + escapeHtml(String(c.score || '-')) + '/10</td>';
      html += '<td>' + escapeHtml((c.triggers || []).join(', ') || '-') + '</td>';
      html += '<td>' + escapeHtml(c.notes || '-') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  }

  // Sleep records table
  html += '<h2>Registros de Sono</h2>';
  if (sleep.length === 0) {
    html += '<p style="font-size:11px;color:#999;">Nenhum registro de sono.</p>';
  } else {
    html += '<table><thead><tr><th>Data</th><th>Horas</th><th>Qualidade</th><th>Notas</th></tr></thead><tbody>';
    sleep.slice(0, 30).forEach(function(s) {
      html += '<tr>';
      html += '<td>' + escapeHtml(formatPortugueseDate(s.created_at)) + '</td>';
      html += '<td>' + escapeHtml(String(s.hours || '-')) + 'h</td>';
      html += '<td>' + escapeHtml(s.quality || '-') + '</td>';
      html += '<td>' + escapeHtml(s.notes || '-') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
  }

  // Journal entries
  html += '<h2>Entradas Compartilhadas do Diário</h2>';
  if (journals.length === 0) {
    html += '<p style="font-size:11px;color:#999;">Nenhuma entrada compartilhada.</p>';
  } else {
    journals.slice(0, 20).forEach(function(j) {
      html += '<div style="background:#fefce8;border:1px solid #fef08a;border-radius:6px;padding:8px;margin:6px 0;">';
      html += '<strong style="font-size:11px;">' + escapeHtml(formatPortugueseDate(j.created_at)) + '</strong><br>';
      html += '<span style="font-size:11px;">' + escapeHtml((j.content || '').substring(0, 500)) + '</span>';
      html += '</div>';
    });
  }

  html += '<div class="footer">Espaço de Acolhimento — Documento gerado eletronicamente em ' + escapeHtml(reportDate) + '</div>';
  html += '</body></html>';

  var printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(function() { printWindow.print(); }, 800);
  } else {
    showToast('Permita pop-ups para exportar o PDF.', 'error');
  }
}
window.exportPatientPDF = exportPatientPDF;

// Contact patient via WhatsApp
function contactPatientWhatsApp() {
  var number = window._currentPatientWhatsapp;
  if (!number) {
    showToast('Paciente não possui WhatsApp cadastrado.', 'error');
    return;
  }
  // Clean number: remove everything except digits, add country code 55 if needed
  var clean = number.replace(/\D/g, '');
  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean; // Brazil country code
  }
  var msg = encodeURIComponent('Olá! Sou sua terapeuta do Espaço de Acolhimento. Como posso ajudar?');
  window.open('https://wa.me/' + clean + '?text=' + msg, '_blank');
}
window.contactPatientWhatsApp = contactPatientWhatsApp;

// Toggle patient active/inactive status
async function togglePatientStatus() {
  if (!selectedPatientId) return;

  const patient = patientsList.find(p => p.id === selectedPatientId);
  if (!patient) return;

  const isActive = patient.is_active !== 0;
  const actionLabel = isActive ? 'arquivar' : 'reativar';

  if (!confirm('Deseja ' + actionLabel + ' o paciente ' + patient.name + '?')) return;

  try {
    const res = await fetch(API_BASE + '/therapist/patient/' + selectedPatientId + '/toggle-status', {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      patient.is_active = data.is_active;
    } else if (res.status === 401) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
      setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
      return;
    } else {
      throw new Error('API request failed');
    }
  } catch (e) {
    console.warn('API toggle status failed, updating locally');
    patient.is_active = isActive ? 0 : 1;
  }

  // Also update the overview data so renderPatientOverview reflects the change
  if (selectedPatientData.overview) {
    selectedPatientData.overview.is_active = patient.is_active;
  }

  showToast(patient.is_active !== 0 ? 'Paciente reativado!' : 'Paciente arquivado!', 'success');
  renderPatientList(document.getElementById('patient-search-input') ? document.getElementById('patient-search-input').value : '');
  renderMobilePatientSelect();
  renderPatientOverview();
}
window.togglePatientStatus = togglePatientStatus;

// Initialize filter toggle buttons
function initFilterToggle() {
  const buttons = document.querySelectorAll('.patient-filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('bg-white', 'text-teal-800', 'shadow-sm');
        b.classList.add('text-slate-500');
      });
      btn.classList.add('bg-white', 'text-teal-800', 'shadow-sm');
      btn.classList.remove('text-slate-500');

      patientFilter = btn.getAttribute('data-filter');
      renderPatientList(document.getElementById('patient-search-input') ? document.getElementById('patient-search-input').value : '');
      renderMobilePatientSelect();
    });
  });
}

// Initial Listener Setup
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    initFilterToggle();
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
