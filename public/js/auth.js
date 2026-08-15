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
  // Credential Change Modal Logic
  // ============================================================
  var pendingRedirect = null;

  function openCredentialModal(isForced, redirectAfter) {
    var modal = document.getElementById('credential-modal');
    if (!modal) return;

    pendingRedirect = redirectAfter || null;

    // If forced (first login), hide the close button and overlay click
    var closeBtn = document.getElementById('cred-close');
    var overlay = document.getElementById('credential-modal');
    if (isForced) {
      if (closeBtn) closeBtn.style.display = 'none';
      modal.dataset.forced = 'true';
      // Show warning banner
      var warn = document.getElementById('cred-warning');
      if (warn) warn.classList.remove('hidden');
    } else {
      if (closeBtn) closeBtn.style.display = '';
      modal.dataset.forced = 'false';
      var warn2 = document.getElementById('cred-warning');
      if (warn2) warn2.classList.add('hidden');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  window.openCredentialModal = openCredentialModal;

  function closeCredentialModal() {
    var modal = document.getElementById('credential-modal');
    if (!modal) return;
    if (modal.dataset.forced === 'true') return; // can't close if forced
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.closeCredentialModal = closeCredentialModal;

  function handleCredentialSubmit() {
    var submitBtn = document.getElementById('btn-update-credentials');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async function () {
      var currentPass = document.getElementById('cred-current-password').value;
      var newEmail = document.getElementById('cred-new-email').value.trim();
      var newPass = document.getElementById('cred-new-password').value;
      var confirmPass = document.getElementById('cred-confirm-password').value;

      // Validation
      if (!currentPass) {
        showToast('Informe sua senha atual.', 'error');
        return;
      }

      if (!newEmail && !newPass) {
        showToast('Informe um novo e-mail ou nova senha para atualizar.', 'error');
        return;
      }

      if (newPass && newPass.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres.', 'error');
        return;
      }

      if (newPass && newPass !== confirmPass) {
        showToast('A confirmação de senha não confere.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Atualizando...';

      try {
        var token = localStorage.getItem('espaco_token');
        var res = await fetch(API_BASE + '/auth/update-credentials', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            current_password: currentPass,
            new_email: newEmail || undefined,
            new_password: newPass || undefined
          })
        });

        if (res.ok) {
          var data = await res.json();
          // Update stored user and token
          localStorage.setItem('espaco_token', data.token);
          localStorage.setItem('espaco_user', JSON.stringify(data.user));

          showToast('Credenciais atualizadas com sucesso!', 'success');

          // Close modal
          var modal = document.getElementById('credential-modal');
          if (modal) {
            modal.classList.remove('active');
            modal.dataset.forced = 'false';
          }
          document.body.style.overflow = '';

          // Clear form
          document.getElementById('cred-current-password').value = '';
          document.getElementById('cred-new-email').value = '';
          document.getElementById('cred-new-password').value = '';
          document.getElementById('cred-confirm-password').value = '';

          // Redirect if pending
          if (pendingRedirect) {
            setTimeout(function () {
              window.location.href = pendingRedirect;
            }, 800);
          }
        } else {
          var errorData = await res.json().catch(function () { return {}; });
          throw new Error(errorData.message || 'Erro ao atualizar credenciais');
        }
      } catch (err) {
        showToast(err.message || 'Erro ao atualizar credenciais. Tente novamente.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Atualizar Credenciais</span><i class="fa-solid fa-shield-halved text-xs"></i>';
      }
    });
  }

  // ============================================================
  // Login page initialization
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    // Login page initialization
    if (document.getElementById('login-form')) {
      initAuthUI();
    }
    // Initialize credential modal handler on ANY page that has the modal
    if (document.getElementById('credential-modal')) {
      handleCredentialSubmit();
      // Set up close button and overlay click
      var closeBtn = document.getElementById('cred-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () { closeCredentialModal(); });
      }
      var modal = document.getElementById('credential-modal');
      if (modal) {
        modal.addEventListener('click', function (e) {
          if (e.target === modal && modal.dataset.forced !== 'true') {
            closeCredentialModal();
          }
        });
      }
      // Check if user must change credentials (first login)
      var userJson = localStorage.getItem('espaco_user');
      if (userJson) {
        try {
          var user = JSON.parse(userJson);
          if (user.must_change_credentials) {
            setTimeout(function () {
              openCredentialModal(true, null);
            }, 500);
          }
        } catch (e) {}
      }
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
      // Hide specialty field for patient registration
      var specField = document.getElementById('reg-specialty-field');
      if (specField) specField.classList.add('hidden');
    });

    roleTerapeutaBtn.addEventListener('click', function () {
      currentRole = 'terapeuta';
      roleTerapeutaBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 bg-white text-teal-900 shadow-md";
      rolePacienteBtn.className = "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 text-teal-100 hover:text-white";
      authTabs.classList.remove('hidden');
      document.getElementById('login-email').placeholder = "terapeuta@email.com";
      // Show specialty field for therapist registration
      var specField = document.getElementById('reg-specialty-field');
      if (specField) specField.classList.remove('hidden');
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
          body: JSON.stringify({ email: email, password: password })
        });

        if (res.ok) {
          var data = await res.json();
          localStorage.setItem('espaco_token', data.token);
          localStorage.setItem('espaco_user', JSON.stringify(data.user));

          showToast('Login realizado com sucesso!', 'success');

          var targetPage = data.user.role === 'terapeuta' ? 'terapeuta.html' : 'paciente.html';

          // Check if user must change credentials (first login for therapist)
          if (data.user.must_change_credentials) {
            setTimeout(function () {
              // Redirect to the portal first, then the portal will show the modal
              // Actually, redirect to the target page and open modal there
              // We pass the flag via sessionStorage so the portal page knows to show it
              try {
                sessionStorage.setItem('espaco_must_change', '1');
              } catch (e) {}
              window.location.href = targetPage;
            }, 600);
          } else {
            setTimeout(function () {
              window.location.href = targetPage;
            }, 600);
          }
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

      var specialty = '';
      var specSelect = document.getElementById('reg-specialty');
      if (specSelect) specialty = specSelect.value;

      try {
        var res = await fetch(API_BASE + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name, email: email, password: password,
            role: currentRole,
            specialty: currentRole === 'terapeuta' ? specialty : undefined
          })
        });

        if (res.ok) {
          var data = await res.json();
          localStorage.setItem('espaco_token', data.token);
          localStorage.setItem('espaco_user', JSON.stringify(data.user));

          showToast('Conta criada com sucesso! Bem-vindo(a)!', 'success');
          setTimeout(function () {
            window.location.href = data.user.role === 'terapeuta' ? 'terapeuta.html' : 'paciente.html';
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
