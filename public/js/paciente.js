/**
 * Espaço de Acolhimento - Jaqueline Camila
 * Patient Portal Logic (js/paciente.js)
 */

const API_BASE = '/api';

// State Management
let currentUser = null;
let authToken = null;

let patientData = {
  checkins: [],
  sleep: [],
  journals: []
};

let selectedMood = 'Bem';
let selectedScore = 8;
let selectedTriggers = [];
let sleepHours = 7.5;
let sleepQuality = 'Excelente';
let historyFilter = 'all';

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

// Affirmations List (Portuguese)
const AFFIRMATIONS = [
  "Eu me permito acolher meus sentimentos sem julgamentos e no meu próprio tempo.",
  "Cada dia é uma nova oportunidade para cuidar da minha mente e do meu coração.",
  "Eu sou capaz de atravessar momentos difíceis com calma, paciência e compaixão.",
  "Acolher minhas vulnerabilidades é o primeiro passo para a minha cura e crescimento.",
  "Respiro fundo, solto as tensões e confio na sabedoria da minha jornada.",
  "Pequenos passos diários constroem grandes transformações na minha vida.",
  "Meu bem-estar mental é valioso e merece meu cuidado e carinho todos os dias."
];

// Helper: Toast Notification
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

// Authentication Check
function checkAuth() {
  authToken = localStorage.getItem('espaco_token');
  const userJson = localStorage.getItem('espaco_user');

  if (!authToken || !userJson) {
    window.location.href = 'acesso.html';
    return false;
  }

  try {
    currentUser = JSON.parse(userJson);
    if (currentUser.role !== 'paciente') {
      window.location.href = currentUser.role === 'terapeuta' ? 'terapeuta.html' : 'acesso.html';
      return false;
    }
  } catch (e) {
    window.location.href = 'acesso.html';
    return false;
  }

  return true;
}

// Navigation System (View Switcher)
function navigateTo(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(v => v.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update bottom nav highlighting
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-nav') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Re-render views if needed
  if (viewName === 'history') {
    renderHistoryTimeline();
  } else if (viewName === 'home') {
    renderHomeStats();
  }
}
window.navigateTo = navigateTo;

// Formatters for Portuguese Dates
function formatPortugueseDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} às ${String(date.getHours()).padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function formatFullDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;

  const fullDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const fullMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return `${fullDays[date.getDay()]}, ${date.getDate()} de ${fullMonths[date.getMonth()]}`;
}

// Load Patient Initial Data from API
async function fetchPatientData() {
  try {
    const res = await fetch(`${API_BASE}/patient/data`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      // API now returns { checkins, sleep, journals } with frontend-friendly field names
      patientData = {
        checkins: data.checkins || [],
        sleep: data.sleep || [],
        journals: data.journals || []
      };
    } else if (res.status === 401) {
      // Token expired — redirect to login
      showToast('Sessão expirada. Faça login novamente.', 'error');
      setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
      return;
    } else {
      throw new Error('API request failed');
    }
  } catch (err) {
    console.warn('API data fetch failed, using local mock store:', err.message);
    loadMockData();
  }

  renderHeader();
  renderDailyAffirmation();
  renderHomeStats();
}

// Local mock store generator for interactive demonstration (offline fallback)
function loadMockData() {
  const savedData = localStorage.getItem(`espaco_patient_data_${currentUser.id}`);
  if (savedData) {
    try {
      patientData = JSON.parse(savedData);
      return;
    } catch(e){}
  }

  const now = new Date();
  patientData = {
    checkins: [
      { id: 'ck_1', created_at: new Date(now - 1000*60*60*2).toISOString(), mood: 'Bem', score: 8, triggers: ['Sono', 'Trabalho'], notes: 'Dia produtivo e tranquilo.' },
      { id: 'ck_2', created_at: new Date(now - 1000*60*60*26).toISOString(), mood: 'Radiante', score: 9, triggers: ['Rotina'], notes: 'Caminhada matinal ajudou muito!' },
      { id: 'ck_3', created_at: new Date(now - 1000*60*60*50).toISOString(), mood: 'Cansado', score: 5, triggers: ['Ansiedade'], notes: 'Muitas reuniões no trabalho.' },
      { id: 'ck_4', created_at: new Date(now - 1000*60*60*74).toISOString(), mood: 'Bem', score: 7, triggers: ['Relações'], notes: 'Conversa agradável à tarde.' },
      { id: 'ck_5', created_at: new Date(now - 1000*60*60*98).toISOString(), mood: 'Neutro', score: 6, triggers: [], notes: '' },
      { id: 'ck_6', created_at: new Date(now - 1000*60*60*122).toISOString(), mood: 'Radiante', score: 10, triggers: ['Alimentação'], notes: 'Ótimo fim de semana!' },
      { id: 'ck_7', created_at: new Date(now - 1000*60*60*146).toISOString(), mood: 'Bem', score: 8, triggers: ['Sono'], notes: 'Dormi 8 horas seguidas.' }
    ],
    sleep: [
      { id: 'sl_1', created_at: new Date(now - 1000*60*60*8).toISOString(), hours: 7.5, quality: 'Excelente', notes: 'Acordei renovado.' },
      { id: 'sl_2', created_at: new Date(now - 1000*60*60*32).toISOString(), hours: 6.0, quality: 'Regular', notes: 'Demorei a pegar no sono.' },
      { id: 'sl_3', created_at: new Date(now - 1000*60*60*56).toISOString(), hours: 8.0, quality: 'Boa', notes: 'Sono tranquilo.' }
    ],
    journals: [
      { id: 'jn_1', created_at: new Date(now - 1000*60*60*12).toISOString(), content: 'Hoje percebi como a respiração guiada me ajuda a desacelerar antes de dormir.', is_shared: true },
      { id: 'jn_2', created_at: new Date(now - 1000*60*60*60).toISOString(), content: 'Refletindo sobre a sessão com a Jaqueline. Preciso estabelecer limites mais claros no trabalho.', is_shared: true }
    ]
  };

  saveMockData();
}

function saveMockData() {
  if (currentUser && currentUser.id) {
    localStorage.setItem(`espaco_patient_data_${currentUser.id}`, JSON.stringify(patientData));
  }
}

// Header & Greeting Rendering
function renderHeader() {
  const greetingEl = document.getElementById('user-greeting');
  const avatarEl = document.getElementById('user-avatar-initials');

  const hour = new Date().getHours();
  let timeGreeting = 'Bom dia';
  if (hour >= 12 && hour < 18) timeGreeting = 'Boa tarde';
  if (hour >= 18 || hour < 5) timeGreeting = 'Boa noite';

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Paciente';
  if (greetingEl) greetingEl.textContent = `${timeGreeting}, ${firstName}`;

  if (avatarEl) {
    const initials = firstName.substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }

  const journalDateEl = document.getElementById('journal-current-date');
  if (journalDateEl) {
    journalDateEl.textContent = formatFullDate(new Date().toISOString());
  }
}

// Daily Affirmation Selection
function renderDailyAffirmation() {
  const affEl = document.getElementById('daily-affirmation');
  if (!affEl) return;

  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = new Date() - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const affIndex = dayOfYear % AFFIRMATIONS.length;

  affEl.textContent = `"${AFFIRMATIONS[affIndex]}"`;
}

// Render Stats & Mini SVG Chart
function renderHomeStats() {
  const streakEl = document.getElementById('stat-streak');
  const moodAvgEl = document.getElementById('stat-mood-avg');
  const sleepAvgEl = document.getElementById('stat-sleep-avg');

  let streak = 0;
  if (patientData.checkins.length > 0) {
    streak = Math.min(patientData.checkins.length, 7);
  }
  if (streakEl) streakEl.textContent = `${streak} ${streak === 1 ? 'dia' : 'dias'}`;

  if (patientData.checkins.length > 0) {
    const totalScore = patientData.checkins.reduce((acc, c) => acc + (Number(c.score) || 7), 0);
    const avg = (totalScore / patientData.checkins.length).toFixed(1);
    if (moodAvgEl) moodAvgEl.textContent = avg;
  } else {
    if (moodAvgEl) moodAvgEl.textContent = '--';
  }

  if (patientData.sleep.length > 0) {
    const totalHours = patientData.sleep.reduce((acc, s) => acc + (Number(s.hours) || 7), 0);
    const avg = (totalHours / patientData.sleep.length).toFixed(1);
    if (sleepAvgEl) sleepAvgEl.textContent = `${avg} h`;
  } else {
    if (sleepAvgEl) sleepAvgEl.textContent = '-- h';
  }

  renderMiniMoodChart();
}

// Mini SVG Line Chart for 7 Days Mood
function renderMiniMoodChart() {
  const container = document.getElementById('mini-chart-container');
  if (!container) return;

  const checkins = [...patientData.checkins].slice(0, 7).reverse();

  if (checkins.length === 0) {
    container.innerHTML = `
      <div class="text-xs text-slate-400 py-6 text-center w-full">
        Nenhum registro de humor nos últimos 7 dias.
      </div>
    `;
    return;
  }

  const svgWidth = 320;
  const svgHeight = 90;
  const paddingX = 25;
  const paddingY = 15;

  const points = checkins.map((c, idx) => {
    const score = Number(c.score) || 5;
    const x = paddingX + (idx / Math.max(1, checkins.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((score - 1) / 9) * (svgHeight - paddingY * 2);
    return { x, y, score, date: c.created_at };
  });

  const polylinePoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let dotsHtml = points.map(p => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#84a98c" stroke="#ffffff" stroke-width="2"/>
    <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#2b2d42">${p.score}</text>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-full overflow-visible">
      <line x1="${paddingX}" y1="${paddingY}" x2="${svgWidth - paddingX}" y2="${paddingY}" stroke="#e8dfd8" stroke-dasharray="2,2" />
      <line x1="${paddingX}" y1="${svgHeight/2}" x2="${svgWidth - paddingX}" y2="${svgHeight/2}" stroke="#e8dfd8" stroke-dasharray="2,2" />
      <line x1="${paddingX}" y1="${svgHeight - paddingY}" x2="${svgWidth - paddingX}" y2="${svgHeight - paddingY}" stroke="#e8dfd8" stroke-dasharray="2,2" />
      
      <polyline fill="none" stroke="#84a98c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
      
      ${dotsHtml}
    </svg>
  `;
}

// Initialize Interactive Controls
function initControls() {
  // Check-in Mood Buttons
  const moodBtns = document.querySelectorAll('.mood-btn');
  const slider = document.getElementById('wellness-slider');
  const sliderValDisplay = document.getElementById('slider-value-display');

  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      moodBtns.forEach(b => b.classList.remove('ring-2', 'ring-sage', 'bg-sage/10'));
      btn.classList.add('ring-2', 'ring-sage', 'bg-sage/10');

      selectedMood = btn.getAttribute('data-mood');
      selectedScore = Number(btn.getAttribute('data-score')) || 7;

      if (slider) slider.value = selectedScore;
      if (sliderValDisplay) sliderValDisplay.textContent = `${selectedScore} / 10`;
    });
  });

  if (slider) {
    slider.addEventListener('input', (e) => {
      selectedScore = Number(e.target.value);
      if (sliderValDisplay) sliderValDisplay.textContent = `${selectedScore} / 10`;
    });
  }

  // Trigger Tags Toggle
  const triggerBtns = document.querySelectorAll('.trigger-tag');
  triggerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tagText = btn.textContent.trim();
      if (selectedTriggers.includes(tagText)) {
        selectedTriggers = selectedTriggers.filter(t => t !== tagText);
        btn.classList.remove('bg-sage', 'text-white', 'border-sage');
        btn.classList.add('bg-white', 'text-charcoal', 'border-linen');
      } else {
        selectedTriggers.push(tagText);
        btn.classList.add('bg-sage', 'text-white', 'border-sage');
        btn.classList.remove('bg-white', 'text-charcoal', 'border-linen');
      }
    });
  });

  // Save Check-in Action — sends correct field names to API
  const btnSaveCheckin = document.getElementById('btn-save-checkin');
  if (btnSaveCheckin) {
    btnSaveCheckin.addEventListener('click', async () => {
      const notes = document.getElementById('checkin-notes').value.trim();
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const newCheckin = {
        id: 'ck_' + Date.now(),
        date: todayDate,
        mood: selectedMood,
        mood_emoji: '',
        wellness_score: selectedScore,
        score: selectedScore, // for local mock
        triggers: selectedTriggers,
        notes: notes,
        created_at: new Date().toISOString()
      };

      btnSaveCheckin.disabled = true;
      btnSaveCheckin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

      try {
        const res = await fetch(`${API_BASE}/patient/checkin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: todayDate,
            mood: selectedMood,
            wellness_score: selectedScore,
            triggers: selectedTriggers,
            notes: notes
          })
        });

        if (!res.ok && res.status === 401) {
          showToast('Sessão expirada. Faça login novamente.', 'error');
          setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
          return;
        }
      } catch (e) {
        console.warn('API offline, saving locally');
      }

      patientData.checkins.unshift(newCheckin);
      saveMockData();

      showToast('Check-in de humor registrado com sucesso!', 'success');
      document.getElementById('checkin-notes').value = '';
      btnSaveCheckin.disabled = false;
      btnSaveCheckin.innerHTML = '<i class="fa-solid fa-check text-xs"></i> <span>Salvar Check-in</span>';

      navigateTo('home');
    });
  }

  // Sleep Stepper Buttons
  const btnSleepMinus = document.getElementById('btn-sleep-minus');
  const btnSleepPlus = document.getElementById('btn-sleep-plus');
  const sleepHoursVal = document.getElementById('sleep-hours-val');

  if (btnSleepMinus && btnSleepPlus && sleepHoursVal) {
    btnSleepMinus.addEventListener('click', () => {
      sleepHours = Math.max(0, sleepHours - 0.5);
      sleepHoursVal.textContent = `${sleepHours.toFixed(1)} h`;
    });

    btnSleepPlus.addEventListener('click', () => {
      sleepHours = Math.min(16, sleepHours + 0.5);
      sleepHoursVal.textContent = `${sleepHours.toFixed(1)} h`;
    });
  }

  // Sleep Quality Selector Buttons
  const sleepQualBtns = document.querySelectorAll('.sleep-qual-btn');
  sleepQualBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sleepQualBtns.forEach(b => b.classList.remove('ring-2', 'ring-lavender', 'bg-lavender/10'));
      btn.classList.add('ring-2', 'ring-lavender', 'bg-lavender/10');
      sleepQuality = btn.getAttribute('data-quality');
    });
  });

  // Save Sleep Action — sends correct field names to API
  const btnSaveSleep = document.getElementById('btn-save-sleep');
  if (btnSaveSleep) {
    btnSaveSleep.addEventListener('click', async () => {
      const notes = document.getElementById('sleep-notes').value.trim();
      const todayDate = new Date().toISOString().split('T')[0];

      const newSleep = {
        id: 'sl_' + Date.now(),
        hours: sleepHours,
        quality: sleepQuality,
        notes: notes,
        created_at: new Date().toISOString()
      };

      btnSaveSleep.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/patient/sleep`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: todayDate,
            sleep_hours: sleepHours,
            sleep_quality: sleepQuality,
            sleep_notes: notes
          })
        });

        if (!res.ok && res.status === 401) {
          showToast('Sessão expirada. Faça login novamente.', 'error');
          setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
          return;
        }
      } catch (e) {}

      patientData.sleep.unshift(newSleep);
      saveMockData();

      showToast('Registro de sono salvo com sucesso!', 'success');
      document.getElementById('sleep-notes').value = '';
      btnSaveSleep.disabled = false;

      navigateTo('home');
    });
  }

  // Journal Privacy Toggle
  const privacyToggle = document.getElementById('journal-privacy-toggle');
  const privacyLabel = document.getElementById('privacy-status-label');
  const privacyIconBox = document.getElementById('privacy-icon-box');

  if (privacyToggle && privacyLabel && privacyIconBox) {
    privacyToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        privacyLabel.textContent = 'Compartilhar com a Terapeuta';
        privacyIconBox.className = 'w-9 h-9 rounded-xl bg-sage-light/50 text-sage flex items-center justify-center';
        privacyIconBox.innerHTML = '<i class="fa-solid fa-user-check"></i>';
      } else {
        privacyLabel.textContent = 'Apenas para mim (Privado)';
        privacyIconBox.className = 'w-9 h-9 rounded-xl bg-sand/30 text-clay flex items-center justify-center';
        privacyIconBox.innerHTML = '<i class="fa-solid fa-lock"></i>';
      }
    });
  }

  // Save Journal Action — sends correct field names to API
  const btnSaveJournal = document.getElementById('btn-save-journal');
  if (btnSaveJournal) {
    btnSaveJournal.addEventListener('click', async () => {
      const content = document.getElementById('journal-content').value.trim();
      if (!content) {
        showToast('Por favor, escreva algo no seu diário antes de salvar.', 'error');
        return;
      }

      const isShared = privacyToggle ? privacyToggle.checked : true;
      const todayDate = new Date().toISOString().split('T')[0];

      const newJournal = {
        id: 'jn_' + Date.now(),
        content: content,
        is_shared: isShared,
        created_at: new Date().toISOString()
      };

      btnSaveJournal.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/patient/journal`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            date: todayDate,
            content: content,
            privacy: isShared ? 'shared' : 'private'
          })
        });

        if (!res.ok && res.status === 401) {
          showToast('Sessão expirada. Faça login novamente.', 'error');
          setTimeout(() => { if (window.logoutApp) window.logoutApp(); }, 1500);
          return;
        }
      } catch (e) {}

      patientData.journals.unshift(newJournal);
      saveMockData();

      showToast('Entrada no diário salva com sucesso!', 'success');
      document.getElementById('journal-content').value = '';
      btnSaveJournal.disabled = false;

      navigateTo('history');
    });
  }

  // History Filter Buttons
  const filterBtns = document.querySelectorAll('.history-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.className = 'history-filter-btn flex-1 py-2 rounded-xl text-center text-slate-600 hover:text-charcoal';
      });
      btn.className = 'history-filter-btn flex-1 py-2 rounded-xl text-center bg-white text-charcoal shadow-sm font-bold';

      historyFilter = btn.getAttribute('data-filter');
      renderHistoryTimeline();
    });
  });

  // Logout Button
  const btnLogout = document.getElementById('btn-patient-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (window.logoutApp) window.logoutApp();
    });
  }
}

// Render History Timeline Cards
function renderHistoryTimeline() {
  const container = document.getElementById('history-timeline');
  if (!container) return;

  let combined = [];

  if (historyFilter === 'all' || historyFilter === 'checkin') {
    patientData.checkins.forEach(c => combined.push({ type: 'checkin', data: c, date: new Date(c.created_at) }));
  }
  if (historyFilter === 'all' || historyFilter === 'sleep') {
    patientData.sleep.forEach(s => combined.push({ type: 'sleep', data: s, date: new Date(s.created_at) }));
  }
  if (historyFilter === 'all' || historyFilter === 'journal') {
    patientData.journals.forEach(j => combined.push({ type: 'journal', data: j, date: new Date(j.created_at) }));
  }

  combined.sort((a, b) => b.date - a.date);

  if (combined.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-white rounded-2xl border border-linen">
        <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-linen/50 text-slate-400 flex items-center justify-center">
          <i class="fa-solid fa-clock-rotate-left text-lg"></i>
        </div>
        <p class="text-xs font-semibold text-charcoal">Nenhum registro encontrado</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Faça um check-in, registre seu sono ou escreva no diário.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = combined.map(item => {
    if (item.type === 'checkin') {
      const c = item.data;
      const emojiMap = { 'Radiante': '😄', 'Bem': '🙂', 'Neutro': '😐', 'Cansado': '😔', 'Difícil': '😢' };
      const emoji = emojiMap[c.mood] || '🙂';
      const triggersHtml = (c.triggers || []).map(t => `<span class="px-2 py-0.5 rounded-md bg-linen text-[10px] font-semibold text-charcoal">${escapeHtml(t)}</span>`).join(' ');

      return `
        <div class="p-4 rounded-2xl bg-white border border-linen shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">${emoji}</span>
              <div>
                <span class="text-xs font-bold text-charcoal block">Check-in: ${escapeHtml(c.mood)}</span>
                <span class="text-[10px] text-slate-400">${escapeHtml(formatPortugueseDate(c.created_at))}</span>
              </div>
            </div>
            <span class="px-2 py-1 rounded-xl bg-sage-light/50 text-sage-900 font-bold text-xs">Nota ${escapeHtml(String(c.score))}/10</span>
          </div>
          ${c.notes ? `<p class="text-xs text-slate-600 mb-2 italic">"${escapeHtml(c.notes)}"</p>` : ''}
          ${triggersHtml ? `<div class="flex flex-wrap gap-1 mt-1">${triggersHtml}</div>` : ''}
        </div>
      `;
    }

    if (item.type === 'sleep') {
      const s = item.data;
      return `
        <div class="p-4 rounded-2xl bg-white border border-linen shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-lavender-light text-slate-700 flex items-center justify-center text-xs">
                <i class="fa-solid fa-moon"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-charcoal block">Sono: ${escapeHtml(String(s.hours))} horas</span>
                <span class="text-[10px] text-slate-400">${escapeHtml(formatPortugueseDate(s.created_at))}</span>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-xl bg-lavender/30 text-charcoal font-bold text-xs">${escapeHtml(s.quality || '')}</span>
          </div>
          ${s.notes ? `<p class="text-xs text-slate-600 italic">"${escapeHtml(s.notes)}"</p>` : ''}
        </div>
      `;
    }

    if (item.type === 'journal') {
      const j = item.data;
      return `
        <div class="p-4 rounded-2xl bg-white border border-linen shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-rose-light text-rose-900 flex items-center justify-center text-xs">
                <i class="fa-solid fa-book-bookmark"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-charcoal block">Entrada no Diário</span>
                <span class="text-[10px] text-slate-400">${escapeHtml(formatPortugueseDate(j.created_at))}</span>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full ${j.is_shared ? 'bg-sage-light text-sage-900' : 'bg-sand/30 text-clay'} text-[10px] font-bold">
              ${j.is_shared ? '<i class="fa-solid fa-user-check text-[9px]"></i> Compartilhado' : '<i class="fa-solid fa-lock text-[9px]"></i> Privado'}
            </span>
          </div>
          <p class="text-xs text-charcoal leading-relaxed whitespace-pre-line">${escapeHtml(j.content)}</p>
        </div>
      `;
    }
  }).join('');
}

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    fetchPatientData();
    initControls();
  }
});
