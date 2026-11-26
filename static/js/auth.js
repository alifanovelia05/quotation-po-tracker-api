let authToken = localStorage.getItem('jwt_token') || '';

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('formOfferDate')) {
    document.getElementById('formOfferDate').valueAsDate = new Date();
  }
  if (document.getElementById('attachPODate')) {
    document.getElementById('attachPODate').valueAsDate = new Date();
  }
  if (!authToken) {
    document.getElementById('loginModal')?.classList.remove('hidden');
  } else {
    document.getElementById('loginModal')?.classList.add('hidden');
    if (typeof loadRecords === 'function') loadRecords();
    if (typeof loadCompanies === 'function') loadCompanies();
  }
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.onsubmit = async function(e) {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value;
    const p = document.getElementById('loginPassword').value;
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();
      if (res.ok) {
        authToken = data.token;
        localStorage.setItem('jwt_token', authToken);
        const nameEl = document.getElementById('userFullName');
        const roleEl = document.getElementById('userRole');
        if (nameEl) nameEl.innerText = data.user.full_name || data.user.username;
        if (roleEl) roleEl.innerText = data.user.role;
        document.getElementById('loginModal')?.classList.add('hidden');
        if (typeof loadRecords === 'function') loadRecords();
        if (typeof loadCompanies === 'function') loadCompanies();
      } else {
        alert('Login gagal: ' + (data.error || 'Password salah'));
      }
    } catch (err) {
      alert('Gagal menghubungi server');
    }
  };
}

function logout() {
  localStorage.removeItem('jwt_token');
  authToken = '';
  location.reload();
}

function switchTab(tab) {
  ['dashboard', 'records', 'companies', 'rekap'].forEach(t => {
    document.getElementById(`view-${t}`)?.classList.add('hidden');
    const nav = document.getElementById(`nav-${t}`);
    if (nav) {
      nav.classList.remove('bg-blue-600', 'text-white');
      nav.classList.add('hover:bg-slate-800', 'text-slate-300');
    }
  });
  document.getElementById(`view-${tab}`)?.classList.remove('hidden');
  const targetNav = document.getElementById(`nav-${tab}`);
  if (targetNav) {
    targetNav.classList.add('bg-blue-600', 'text-white');
    targetNav.classList.remove('hover:bg-slate-800', 'text-slate-300');
  }

  if (tab === 'companies' && typeof loadCompanies === 'function') {
    loadCompanies();
  }
  if (tab === 'rekap' && typeof updateRekapView === 'function') {
    updateRekapView();
  }
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebarNav');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  if (!sidebar) return;
  const isHidden = sidebar.classList.contains('-translate-x-full');
  if (isHidden) {
    sidebar.classList.remove('-translate-x-full');
    backdrop?.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    backdrop?.classList.add('hidden');
  }
}

function closeMobileMenu() {
  const sidebar = document.getElementById('sidebarNav');
  const backdrop = document.getElementById('mobileMenuBackdrop');
  sidebar?.classList.add('-translate-x-full');
  backdrop?.classList.add('hidden');
}
