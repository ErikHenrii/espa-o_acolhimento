/**
 * Espaço de Acolhimento - Jaqueline Camila
 * Authentication Logic (js/auth.js)
 * Wrapped in IIFE to avoid global scope conflicts with paciente.js/terapeuta.js
 */

(function () {
  'use strict';

  var API_BASE = '/api';

  // Authentication State
  var currentRole = 'paciente';
  var currentTab = 'login';

  // ============================================================
  // Toast helper (exposed globally)
  // ============================================================
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-exclamation';

    toast.innerHTML = '<i class="fa-solid ' + iconClass + '"></i><span>' + message + '</span>';
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

  // Expose showToast globally (paciente.js/terapeuta.js may override it)
  window.showToast = showToast;

  // ============================================================
  // ROBUST LOGOUT — used by all pages
  // ============================================================
  function logout() {
    try {
      localStorage.removeItem('espaco_token');
      localStorage.removeItem('espaco_user');
    } catch (e) {
      // Ignore storage errors
    }
    // Redirect IMMEDIATELY — no setTimeout, no toast dependency
    window.location.replace('index.html');
  }

  window.logoutApp = logout;

  // ============================================================
  // Auth guard helper for portal pages
  // ============================================================
  function requireAuth(expectedRole) {
    var token = localStorage.getItem('espaco_token');
    var userJson = localStorage.getItem('espaco_user');

    if (!token || !userJson) {
      window.location.replace('acesso.html');
      return null;
    }

    try {
      var user = JSON.parse(userJson);
      if (expectedRole && user.role !== expectedRole) {
        if (user.role === 'terapeuta') {
          window.location.replace('terapeuta.html');
        } else if (user.role === 'paciente') {
          window.location.replace('paciente.html');
        } else {
          window.location.replace('acesso.html');
        }
        return null;
      }
      return user;
    } catch (e) {
      localStorage.removeItem('espaco_token');
      localStorage.removeItem('espaco_user');
      window.location.replace('acesso.html');
      return null;
    }
  }

  window.requireAuth = requireAuth;

  // ============================================================
  // Login page initialization
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('login-form')) {
      // NO auto-redirect — login page always shows, even if session exists
      initAuthUI();
    }
  });

  function initAuthUI() {
    var rolePacienteBtn = document.getElementById('role-paciente-btn');
    var roleTerapeutaBtn = document.getElementById('role-terapeuta-btn');
    var authTabs = document.getElementById('auth-tabs');
    var tabLogin = document.getElementById('tab-login');
    var tabRegister = document.getElementById('tab-register');
    var loginForm = document.getElementById('login-form');
    var registerForm = document.getElementById('register-form');
    var toggleLoginPassBtn = document.getElementById('toggle-login-password');
    var toggleRegPassBtn = document.getElementById('toggle-reg-password');

    // Role Switcher
    rolePacienteBtn.addEventListener('click', function () {
      currentRole = 'paciente';
      rolePacienteBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 bg-white text-teal-900 shadow-md";
      roleTerapeutaBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 text-teal-100 hover:text-white";
      authTabs.classList.remove('hidden');
      document.getElementById('login-email').placeholder = "paciente@email.com";
    });

    roleTerapeutaBtn.addEventListener('click', function () {
      currentRole = 'terapeuta';
      roleTerapeutaBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 bg-white text-teal-900 shadow-md";
      rolePacienteBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 text-teal-100 hover:text-white";
      authTabs.classList.add('hidden');
      switchTab('login');
      document.getElementById('login-email').placeholder = "jaqueline@espacoacolhimento.com.br";
    });

    // Tab Switcher
    tabLogin.addEventListener('click', function () { switchTab('login'); });
    tabRegister.addEventListener('click', function () { switchTab('register'); });

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

    // Password toggles
    if (toggleLoginPassBtn) {
      toggleLoginPassBtn.addEventListener('click', function () {
        var input = document.getElementById('login-password');
        var icon = toggleLoginPassBtn.querySelector('i');
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
      toggleRegPassBtn.addEventListener('click', function () {
        var input = document.getElementById('reg-password');
        var icon = toggleRegPassBtn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.className = 'fa-solid fa-eye-slash';
        } else {
          input.type = 'password';
          icon.className = 'fa-solid fa-eye';
        }
      });
    }

    // Login Submit
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;

      if (!email || !password) {
        showToast('Por favor, preencha todos os campos.', 'error');
        return;
      }

      var submitBtn = document.getElementById('btn-login-submit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Autenticando...';

      try {
        var res = await fetch(API_BASE + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password, role: currentRole })
        });

        if (res.ok) {
          var data = await res.json();
          localStorage.setItem('espaco_token', data.token);
          localStorage.setItem('espaco_user', JSON.stringify(data.user));

          showToast('Login realizado com sucesso!', 'success');
          setTimeout(function () {
            window.location.href = currentRole === 'terapeuta' ? 'terapeuta.html' : 'paciente.html';
          }, 600);
        } else {
          var errorData = await res.json().catch(function () { return {}; });
          throw new Error(errorData.message || 'Credenciais inválidas');
        }
      } catch (err) {
        showToast(err.message || 'Erro ao fazer login. Tente novamente.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Entrar no Portal</span><i class="fa-solid fa-arrow-right text-xs"></i>';
      }
    });

    // Register Submit
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = document.getElementById('reg-name').value.trim();
      var email = document.getElementById('reg-email').value.trim();
      var password = document.getElementById('reg-password').value;
      var confirmPassword = document.getElementById('reg-confirm-password').value;

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

      var submitBtn = document.getElementById('btn-register-submit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Criando conta...';

      try {
        var res = await fetch(API_BASE + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, password: password })
        });

        if (res.ok) {
          var data = await res.json();
          localStorage.setItem('espaco_token', data.token);
          localStorage.setItem('espaco_user', JSON.stringify(data.user));

          showToast('Conta criada com sucesso! Bem-vindo(a)!', 'success');
          setTimeout(function () {
            window.location.href = 'paciente.html';
          }, 700);
        } else {
          var errorData = await res.json().catch(function () { return {}; });
          throw new Error(errorData.message || 'Erro ao cadastrar');
        }
      } catch (err) {
        showToast(err.message || 'Erro ao cadastrar. Tente novamente.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Criar Minha Conta</span><i class="fa-solid fa-heart text-xs"></i>';
      }
    });
  }
})();
