let allCompanies = [];

async function loadCompanies() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/v1/companies', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) return;
    const json = await res.json();
    allCompanies = json.data || [];
    renderCompaniesTable(allCompanies);
    updateCompanySummaryCards(allCompanies);
    populateOfferCompanyDropdown();
  } catch (err) {
    console.error('Gagal memuat data perusahaan:', err);
  }
}

function updateCompanySummaryCards(companies) {
  const totalCount = companies.length;
  let totalOfferVal = 0;
  let totalPOVal = 0;
  companies.forEach(c => {
    totalOfferVal += Number(c.total_offer_value) || 0;
    totalPOVal += Number(c.total_po_value) || 0;
  });

  const countEl = document.getElementById('compTotalCount');
  const offerEl = document.getElementById('compTotalOfferValue');
  const poEl = document.getElementById('compTotalPOValue');

  if (countEl) countEl.innerText = totalCount;
  if (offerEl) offerEl.innerText = 'Rp ' + totalOfferVal.toLocaleString('id-ID');
  if (poEl) poEl.innerText = 'Rp ' + totalPOVal.toLocaleString('id-ID');
}

function renderCompaniesTable(companies) {
  const tbody = document.getElementById('companiesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (companies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center p-6 text-slate-400">Belum ada perusahaan terdaftar. Klik "+ Tambah Perusahaan" untuk menambahkan.</td></tr>`;
    return;
  }

  companies.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors divide-x divide-slate-200/70';
    tr.innerHTML = `
      <td class="py-3.5 px-4 font-bold text-slate-800 uppercase text-xs text-center align-middle">${c.name}</td>
      <td class="py-3.5 px-4 text-xs text-center align-middle">
        <div class="font-medium text-slate-700">${c.default_pic || '-'}</div>
        <div class="text-[11px] text-slate-400 line-clamp-1">${c.notes || '-'}</div>
      </td>
      <td class="py-3.5 px-3 font-semibold text-slate-700 text-xs text-center align-middle">${c.total_offers || 0}</td>
      <td class="py-3.5 px-3 font-semibold text-blue-700 text-xs text-center align-middle whitespace-nowrap">Rp ${Number(c.total_offer_value || 0).toLocaleString('id-ID')}</td>
      <td class="py-3.5 px-3 font-semibold text-slate-700 text-xs text-center align-middle">${c.total_po_deals || 0}</td>
      <td class="py-3.5 px-3 font-bold text-emerald-700 text-xs text-center align-middle whitespace-nowrap">Rp ${Number(c.total_po_value || 0).toLocaleString('id-ID')}</td>
      <td class="py-3.5 px-3 text-xs text-center align-middle">
        <span class="px-2 py-0.5 rounded-full font-bold text-[11px] ${c.win_rate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}">${c.win_rate || 0}%</span>
      </td>
      <td class="py-3.5 px-3 text-center align-middle whitespace-nowrap">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="openCompanyModal(${c.id})" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition">
            <i class="fa-solid fa-pen text-blue-500"></i>
          </button>
          <button onclick="deleteCompany(${c.id})" class="px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[11px] font-medium transition">
            <i class="fa-solid fa-trash text-red-500"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterCompanies() {
  const q = (document.getElementById('companySearchInput')?.value || '').toLowerCase();
  const filtered = allCompanies.filter(c =>
    (c.name && c.name.toLowerCase().includes(q)) ||
    (c.default_pic && c.default_pic.toLowerCase().includes(q)) ||
    (c.notes && c.notes.toLowerCase().includes(q))
  );
  renderCompaniesTable(filtered);
}

function openCompanyModal(id = null) {
  const form = document.getElementById('companyForm');
  if (form) form.reset();

  if (id) {
    const comp = allCompanies.find(c => c.id === id);
    if (!comp) return;
    document.getElementById('editCompanyID').value = comp.id;
    document.getElementById('companyModalTitle').innerText = 'Edit Data Perusahaan';
    document.getElementById('formCompanyName').value = comp.name || '';
    document.getElementById('formCompanyDefaultPIC').value = comp.default_pic || '';
    document.getElementById('formCompanyNotes').value = comp.notes || '';
  } else {
    document.getElementById('editCompanyID').value = '';
    document.getElementById('companyModalTitle').innerText = 'Tambah Perusahaan Baru';
  }

  document.getElementById('companyModal').classList.remove('hidden');
}

function closeCompanyModal() {
  document.getElementById('companyModal').classList.add('hidden');
}

async function submitCompanyForm(e) {
  e.preventDefault();
  const editID = document.getElementById('editCompanyID').value;
  const payload = {
    name: document.getElementById('formCompanyName').value,
    default_pic: document.getElementById('formCompanyDefaultPIC').value,
    notes: document.getElementById('formCompanyNotes').value
  };

  const url = editID ? `/api/v1/companies/${editID}` : '/api/v1/companies';
  const method = editID ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || 'Gagal menyimpan data perusahaan');
      return;
    }
    closeCompanyModal();
    await loadCompanies();
  } catch (err) {
    alert('Koneksi server gagal');
  }
}

async function deleteCompany(id) {
  if (!confirm('Hapus perusahaan ini dari daftar? Data penawaran yang sudah ada tidak akan terhapus.')) return;
  try {
    const res = await fetch(`/api/v1/companies/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      loadCompanies();
    } else {
      alert('Gagal menghapus perusahaan');
    }
  } catch (err) {
    alert('Koneksi server gagal');
  }
}

function populateOfferCompanyDropdown(selectedValue = '') {
  const selectEl = document.getElementById('formClientCompany');
  if (!selectEl) return;

  const currentVal = selectedValue || selectEl.value || '';
  let optionsHtml = `<option value="">-- PILIH PERUSAHAAN --</option>`;
  let matched = false;

  allCompanies.forEach(c => {
    const isSel = currentVal && c.name.toLowerCase() === currentVal.toLowerCase();
    if (isSel) matched = true;
    optionsHtml += `<option value="${c.name}" ${isSel ? 'selected' : ''}>${c.name}</option>`;
  });

  if (currentVal && !matched) {
    optionsHtml += `<option value="${currentVal}" selected>${currentVal}</option>`;
  }

  selectEl.innerHTML = optionsHtml;
}

function goToAddCompanyFromOffer() {
  closeCreateModal();
  switchTab('companies');
  openCompanyModal();
}
