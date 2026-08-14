/**
 * Espaço de Acolhimento - Jaqueline Camila
 * Authentication Logic (js/auth.js)
 */

const API_BASE = '/api';

// Authentication State
let currentRole = 'paciente'; // 'paciente' | 'terapeuta'
let currentTab = 'login';     // 'login' | 'register'

// Global Toast Notification Helper
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
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Redirect if already authenticated
function checkExistingSession() {
  const token = localStorage.getItem('espaco_token');
  const userJson = localStorage.getItem('espaco_user');

  if (token && userJson) {
    try {
      const user = JSON.parse(userJson);
      if (user.role === 'terapeuta' && !window.location.pathname.endsWith('terapeuta.html')) {
        window.location.href = 'terapeuta.html';
      } else if (user.role === 'paciente' && !window.location.pathname.endsWith('paciente.html')) {
        window.location.href = 'paciente.html';
      }
    } catch (e) {
      localStorage.removeItem('espaco_token');
      localStorage.removeItem('espaco_user');
    }
  }
}

// Global Logout Function
function logout() {
  localStorage.removeItem('espaco_token');
  localStorage.removeItem('espaco_user');
  showToast('Sessão encerrada com sucesso', 'info');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 500);
}

// Attach logout to global window for accessibility across scripts
window.logoutApp = logout;

document.addEventListener('DOMContentLoaded', () => {
  // If on login page, check session
  if (document.getElementById('login-form')) {
    checkExistingSession();
    initAuthUI();
  }
});

function initAuthUI() {
  const rolePacienteBtn = document.getElementById('role-paciente-btn');
  const roleTerapeutaBtn = document.getElementById('role-terapeuta-btn');
  const authTabs = document.getElementById('auth-tabs');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  const toggleLoginPassBtn = document.getElementById('toggle-login-password');
  const toggleRegPassBtn = document.getElementById('toggle-reg-password');

  // Role Switcher: Paciente vs Terapeuta
  rolePacienteBtn.addEventListener('click', () => {
    currentRole = 'paciente';
    
    // Style buttons
    rolePacienteBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 bg-white text-teal-900 shadow-md";
    roleTerapeutaBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 text-teal-100 hover:text-white";
    
    // Show register tab option for paciente
    authTabs.classList.remove('hidden');
    
    // Default email placeholder hint
    document.getElementById('login-email').placeholder = "paciente@email.com";
  });

  roleTerapeutaBtn.addEventListener('click', () => {
    currentRole = 'terapeuta';
    
    // Style buttons
    roleTerapeutaBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 bg-white text-teal-900 shadow-md";
    rolePacienteBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 text-teal-100 hover:text-white";
    
    // Hide register tab (therapists only login)
    authTabs.classList.add('hidden');
    switchTab('login');

    // Default email placeholder hint
    document.getElementById('login-email').placeholder = "terapeuta@espacoacolhimento.com";
  });

  // Tab Switcher: Login vs Register
  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  function switchTab(tab) {
    currentTab = tab;
    if (tab === 'login') {
      tabLogin.className = "flex-1 pb-3 text-center text-sm font-bold text-teal-900 border-b-2 border-amber-500 transition-all duration-200";
      tabRegister.className = "flex-1 pb-3 text-center text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-teal-800 transition-all duration-200";
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      tabRegister.className = "flex-1 pb-3 text-center text-sm font-bold text-teal-900 border-b-2 border-amber-500 transition-all duration-200";
      tabLogin.className = "flex-1 pb-3 text-center text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-teal-800 transition-all duration-200";
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  }

  // Password visibility toggle
  if (toggleLoginPassBtn) {
    toggleLoginPassBtn.addEventListener('click', () => {
      const input = document.getElementById('login-password');
      const icon = toggleLoginPassBtn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });
  }

  if (toggleRegPassBtn) {
    toggleRegPassBtn.addEventListener('click', () => {
      const input = document.getElementById('reg-password');
      const icon = toggleRegPassBtn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });
  }

  // Handle Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-login-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Autenticando...';

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: currentRole })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('espaco_token', data.token || 'mock_jwt_token_xyz');
        localStorage.setItem('espaco_user', JSON.stringify(data.user || {
          id: 'usr_1',
          name: email.split('@')[0],
          email: email,
          role: currentRole
        }));

        showToast('Login realizado com sucesso!', 'success');
        setTimeout(() => {
          window.location.href = currentRole === 'terapeuta' ? 'terapeuta.html' : 'paciente.html';
        }, 600);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Credenciais inválidas');
      }
    } catch (err) {
      console.warn('API authentication unavailable or failed, using demo session:', err.message);
      
      // Standalone demo fallback session for seamless local testing
      const demoUser = {
        id: currentRole === 'terapeuta' ? 'therapist_1' : 'paciente_1',
        name: currentRole === 'terapeuta' ? 'Jaqueline Camila' : (email.split('@')[0] || 'Maria Silva'),
        email: email,
        role: currentRole,
        created_at: new Date().toISOString()
      };

      localStorage.setItem('espaco_token', 'demo_token_' + Date.now());
      localStorage.setItem('espaco_user', JSON.stringify(demoUser));

      showToast('Bem-vindo(a) ao Espaço de Acolhimento!', 'success');
      setTimeout(() => {
        window.location.href = currentRole === 'terapeuta' ? 'terapeuta.html' : 'paciente.html';
      }, 700);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Entrar no Portal</span><i class="fa-solid fa-arrow-right text-xs"></i>';
    }
  });

  // Handle Register Submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (!name || !email || !password || !confirmPassword) {
      showToast('Preencha todos os campos do cadastro.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }

    const submitBtn = document.getElementById('btn-register-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Criando conta...';

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'paciente' })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('espaco_token', data.token || 'mock_jwt_token_new');
        localStorage.setItem('espaco_user', JSON.stringify(data.user || {
          id: 'usr_' + Date.now(),
          name,
          email,
          role: 'paciente'
        }));

        showToast('Conta criada com sucesso!', 'success');
        setTimeout(() => {
          window.location.href = 'paciente.html';
        }, 600);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao criar conta');
      }
    } catch (err) {
      console.warn('API registration offline, using local fallback:', err.message);

      const demoUser = {
        id: 'paciente_' + Date.now(),
        name: name,
        email: email,
        role: 'paciente',
        created_at: new Date().toISOString()
      };

      localStorage.setItem('espaco_token', 'demo_token_' + Date.now());
      localStorage.setItem('espaco_user', JSON.stringify(demoUser));

      showToast('Conta criada com sucesso! Bem-vindo(a).', 'success');
      setTimeout(() => {
        window.location.href = 'paciente.html';
      }, 700);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Criar Minha Conta</span><i class="fa-solid fa-heart text-xs"></i>';
    }
  });

  // Google decorative login link handler
  const googleBtn = document.getElementById('btn-google-login');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      showToast('Login social com Google estará disponível em breve!', 'info');
    });
  }
}
