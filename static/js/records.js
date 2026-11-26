let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let pageSize = 10;
let donutChartInstance = null;
let dateSortOrder = 'desc'; // 'desc' = terbaru duluan, 'asc' = terlama duluan

function changePageSize(size) {
  pageSize = parseInt(size, 10) || 10;
  currentPage = 1;
  renderTableWithPagination();
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTableWithPagination();
  }
}

function nextPage() {
  const maxPage = Math.ceil(filteredRecords.length / pageSize) || 1;
  if (currentPage < maxPage) {
    currentPage++;
    renderTableWithPagination();
  }
}

function goToPage(page) {
  currentPage = page;
  renderTableWithPagination();
}

function toggleDateSort() {
  dateSortOrder = dateSortOrder === 'desc' ? 'asc' : 'desc';
  const icon = document.getElementById('dateSortIcon');
  const label = document.getElementById('dateSortLabel');

  if (icon) {
    if (dateSortOrder === 'desc') {
      icon.className = 'fa-solid fa-arrow-down-wide-short text-blue-600';
      if (label) label.innerText = 'Terbaru';
    } else {
      icon.className = 'fa-solid fa-arrow-up-short-wide text-blue-600';
      if (label) label.innerText = 'Terlama';
    }
  }

  // Lakukan pengurutan pada allRecords
  allRecords.sort((a, b) => {
    const timeA = new Date(a.offer_date || 0).getTime();
    const timeB = new Date(b.offer_date || 0).getTime();
    return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  filterTable(); // Render ulang tabel sesuai hasil sort dan filter teks
}

async function loadRecords() {
  const poStatusEl = document.getElementById('filterPOStatus');
  const deliveredEl = document.getElementById('filterDelivered');
  const poStatus = poStatusEl ? poStatusEl.value : '';
  const delivered = deliveredEl ? deliveredEl.value : '';

  let url = '/api/v1/records?';
  if (poStatus) url += `po_status=${poStatus}&`;
  if (delivered) url += `delivered=${delivered}&`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.status === 401) return logout();
    const json = await res.json();
    allRecords = json.data || [];
    allRecords.sort((a, b) => {
      const timeA = new Date(a.offer_date || 0).getTime();
      const timeB = new Date(b.offer_date || 0).getTime();
      return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
    filteredRecords = [...allRecords];
    currentPage = 1;
    renderTableWithPagination();
    updateStatistics(allRecords);
  } catch (err) {
    console.error(err);
  }
}

function renderTable(records) {
  const tbody = document.getElementById('recordsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center p-6 text-slate-400">Tidak ada transaksi ditemukan.</td></tr>`;
    return;
  }

  records.forEach(r => {
    const isDeal = r.po_status === 'sudah';
    const poBadge = isDeal 
      ? `<span class="badge bg-emerald-100 text-emerald-700">SUDAH PO</span>`
      : `<span class="badge bg-amber-100 text-amber-700">BELUM PO</span>`;

    // Ambil HANYA 1 nama pertama (potong berdasarkan koma, 'dan', atau '/')
    let picDisplay = '-';
    if (r.client_pic) {
      // Ambil bagian sebelum koma atau kata 'dan' atau '/'
      let first = r.client_pic.split(/,|\/|\bdan\b/i)[0].trim();
      picDisplay = first || r.client_pic;
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition-colors divide-x divide-slate-200/70";
    tr.innerHTML = `
      <td class="py-4 px-3 text-slate-500 whitespace-nowrap text-xs text-center align-middle">${r.offer_date ? r.offer_date.split('T')[0] : '-'}</td>
      <td class="py-4 px-3 whitespace-nowrap text-xs font-semibold text-blue-700 text-center align-middle">${r.offer_number || '-'}</td>
      <td class="py-4 px-4 min-w-[220px] text-center align-middle">
        <div class="font-semibold text-slate-800 text-xs">${r.offer_item_name}</div>
        <div class="text-[10px] text-slate-400 line-clamp-1">${r.materials || '-'}</div>
      </td>
      <td class="py-4 px-3 whitespace-nowrap text-center align-middle">
        <span class="font-bold uppercase text-slate-700 text-xs block">${r.client_company}</span>
        <span class="text-slate-400 text-[11px] block truncate max-w-[90px] mx-auto" title="${r.client_pic || '-'}">${picDisplay}</span>
      </td>
      <td class="py-4 px-3 whitespace-nowrap text-xs font-medium text-slate-700 text-center align-middle">${r.offer_qty} ${r.offer_unit}</td>
      <td class="py-4 px-3 whitespace-nowrap text-xs font-semibold text-slate-800 text-center align-middle">Rp ${Number(r.offer_total || (r.offer_price * r.offer_qty)).toLocaleString('id-ID')}</td>
      <td class="py-4 px-3 whitespace-nowrap text-center align-middle">${poBadge}</td>
      <td class="py-4 px-3 whitespace-nowrap text-xs font-semibold text-slate-800 text-center align-middle">${r.po_number || '-'}</td>
      <td class="py-4 px-3 whitespace-nowrap text-center align-middle">
        <div class="flex flex-col gap-1.5 min-w-[130px] max-w-[160px] mx-auto text-left">
          <button onclick="openDetailModal(${r.id})"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition shadow-sm">
            <i class="fa-regular fa-eye text-slate-500 w-3.5 text-center"></i>
            <span>Lihat Detail</span>
          </button>
          
          ${!isDeal ? `
            <button onclick="openAttachModal(${r.id})"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition shadow-sm">
              <i class="fa-solid fa-file-circle-plus w-3.5 text-center"></i>
              <span>Pasang PO</span>
            </button>
          ` : `
            <button onclick="openAttachModal(${r.id})"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium transition shadow-sm">
              <i class="fa-solid fa-file-pen text-emerald-600 w-3.5 text-center"></i>
              <span>Edit PO</span>
            </button>
            <button onclick="deletePOOnly(${r.id})"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-medium transition shadow-sm">
              <i class="fa-solid fa-file-circle-xmark text-amber-600 w-3.5 text-center"></i>
              <span>Hapus PO</span>
            </button>
          `}

          <button onclick="openEditOfferModal(${r.id})"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition shadow-sm">
            <i class="fa-solid fa-pen text-blue-500 w-3.5 text-center"></i>
            <span>Edit Penawaran</span>
          </button>
          
          <button onclick="deleteRecordFull(${r.id})"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 text-[11px] font-medium transition shadow-sm">
            <i class="fa-solid fa-trash text-red-500 w-3.5 text-center"></i>
            <span>Hapus Data</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTableWithPagination() {
  const total = filteredRecords.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > maxPage) currentPage = maxPage;

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pageRecords = filteredRecords.slice(startIndex, endIndex);

  renderTable(pageRecords);

  // Update Pagination Info
  const infoEl = document.getElementById('paginationInfo');
  if (infoEl) {
    if (total === 0) {
      infoEl.innerText = 'Menampilkan 0 dari 0 data';
    } else {
      infoEl.innerText = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${total} data`;
    }
  }

  // Update Buttons State
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  if (btnPrev) btnPrev.disabled = currentPage <= 1;
  if (btnNext) btnNext.disabled = currentPage >= maxPage;

  // Render Page Numbers
  const numContainer = document.getElementById('paginationNumbers');
  if (numContainer) {
    numContainer.innerHTML = '';
    for (let p = 1; p <= maxPage; p++) {
      if (maxPage > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== maxPage) {
        if (p === 2 || p === maxPage - 1) {
          const dots = document.createElement('span');
          dots.className = "px-1 text-slate-400";
          dots.innerText = '...';
          numContainer.appendChild(dots);
        }
        continue;
      }
      const btn = document.createElement('button');
      btn.onclick = () => goToPage(p);
      btn.innerText = p;
      btn.className = p === currentPage
        ? "w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm"
        : "w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium";
      numContainer.appendChild(btn);
    }
  }
}

function filterTable() {
  const q = document.getElementById('tableSearchInput').value.toLowerCase();
  filteredRecords = allRecords.filter(r => 
    (r.offer_number && r.offer_number.toLowerCase().includes(q)) ||
    (r.offer_item_name && r.offer_item_name.toLowerCase().includes(q)) ||
    (r.materials && r.materials.toLowerCase().includes(q)) ||
    (r.client_company && r.client_company.toLowerCase().includes(q)) ||
    (r.client_pic && r.client_pic.toLowerCase().includes(q)) ||
    (r.po_number && r.po_number.toLowerCase().includes(q)) ||
    (r.po_item_name && r.po_item_name.toLowerCase().includes(q))
  );
  currentPage = 1;
  renderTableWithPagination();
}

function updateStatistics(records) {
  const total = records.length;
  const sudah = records.filter(r => r.po_status === 'sudah').length;
  const belum = total - sudah;
  const winRate = total > 0 ? Math.round((sudah / total) * 100) : 0;

  document.getElementById('statTotalOffers').innerText = total;
  document.getElementById('statTotalPO').innerText = sudah;
  document.getElementById('statPendingPO').innerText = belum;
  document.getElementById('statDealRate').innerText = winRate + '%';

  let sumOffer = 0;
  let sumDeal = 0;
  records.forEach(r => {
    sumOffer += Number(r.offer_total) || 0;
    if (r.po_status === 'sudah') sumDeal += Number(r.po_total) || 0;
  });

  document.getElementById('valTotalOffer').innerText = 'Rp ' + sumOffer.toLocaleString('id-ID');
  document.getElementById('valTotalDeal').innerText = 'Rp ' + sumDeal.toLocaleString('id-ID');
  const finRate = sumOffer > 0 ? Math.round((sumDeal / sumOffer) * 100) : 0;
  document.getElementById('pctDealFinancial').innerText = finRate + '%';
  document.getElementById('barDealFinancial').style.width = finRate + '%';

  renderDonutChart(sudah, belum);
}

function renderDonutChart(sudah, belum) {
  const canvas = document.getElementById('poDonutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (donutChartInstance) donutChartInstance.destroy();

  donutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Sudah PO', 'Belum PO'],
      datasets: [{
        data: [sudah, belum],
        backgroundColor: ['#10b981', '#f59e0b'],
        borderWidth: 3,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: '72%'
    }
  });
}

function openDetailModal(id) {
  const r = allRecords.find(item => item.id === id);
  if (!r) return;

  const isDeal = r.po_status === 'sudah';
  document.getElementById('detailStatusBadge').innerHTML = isDeal 
    ? `<span class="badge bg-emerald-100 text-emerald-700">SUDAH PO</span>` 
    : `<span class="badge bg-amber-100 text-amber-700">BELUM PO</span>`;

  document.getElementById('detOfferNumber').innerText = r.offer_number || '-';
  document.getElementById('detOfferItemName').innerText = r.offer_item_name || '-';
  document.getElementById('detMaterials').innerText = r.materials || 'Tidak ada catatan spesifikasi bahan.';
  document.getElementById('detClientPIC').innerText = `${r.client_company} (PIC: ${r.client_pic || '-'})`;
  document.getElementById('detOfferDate').innerText = r.offer_date ? r.offer_date.split('T')[0] : '-';
  document.getElementById('detOfferQty').innerText = `${r.offer_qty} ${r.offer_unit}`;
  document.getElementById('detOfferPrice').innerText = 'Rp ' + Number(r.offer_price).toLocaleString('id-ID');
  document.getElementById('detOfferTotal').innerText = 'Rp ' + Number(r.offer_total).toLocaleString('id-ID');

  document.getElementById('detPONumber').innerText = r.po_number || 'Belum ada PO';
  document.getElementById('detPOItemName').innerText = r.po_item_name || 'Belum ada data Nama PO';
  document.getElementById('detPODate').innerText = r.po_date ? r.po_date.split('T')[0] : '-';
  document.getElementById('detPOQty').innerText = r.po_qty ? `${r.po_qty} ${r.po_unit || ''}` : '-';
  document.getElementById('detPOPrice').innerText = r.po_price ? 'Rp ' + Number(r.po_price).toLocaleString('id-ID') : '-';
  document.getElementById('detPOTotal').innerText = r.po_total ? 'Rp ' + Number(r.po_total).toLocaleString('id-ID') : '-';
  document.getElementById('detPOVAT').innerText = (isDeal && r.po_vat) ? 'Rp ' + Number(r.po_vat).toLocaleString('id-ID') : '-';
  document.getElementById('detPOGrandTotal').innerText = (isDeal && r.po_grand_total) ? 'Rp ' + Number(r.po_grand_total).toLocaleString('id-ID') : ((isDeal && r.po_total) ? 'Rp ' + Number(r.po_total).toLocaleString('id-ID') : '-');

  const diffUnit = Number(r.unit_price_diff) || 0;
  const diffTotal = Number(r.total_price_diff) || 0;
  if (diffUnit > 0) {
    document.getElementById('detDiffPrice').innerText = `Turun Rp ${diffUnit.toLocaleString('id-ID')} / unit (Total hemat: Rp ${diffTotal.toLocaleString('id-ID')}) - ${r.notes || 'Ada diskon'}`;
  } else if (isDeal) {
    document.getElementById('detDiffPrice').innerText = `Harga sama persis (Tidak ada potongan harga)`;
  } else {
    document.getElementById('detDiffPrice').innerText = `Menunggu penerbitan PO klien`;
  }

  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

function addOfferItemCard(itemData = null, isEditMode = false) {
  const container = document.getElementById('offerItemsContainer');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'offer-item-card p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm';
  card.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="offer-item-label text-[11px] font-bold text-slate-600 uppercase tracking-wider">ITEM #1</span>
      <button type="button" onclick="removeOfferItemCard(this)"
        class="btn-remove-offer-item hidden text-[11px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 transition">
        <i class="fa-solid fa-trash-can text-[10px]"></i> Hapus
      </button>
    </div>
    <div>
      <label class="block font-semibold text-slate-600 mb-1">Nama Barang / Judul Penawaran</label>
      <input type="text" class="offer-item-name w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" required
        placeholder="Contoh: Repair Tutup Chamber SUS 304...">
    </div>
    <div>
      <label class="block font-semibold text-slate-600 mb-1">Rincian Spesifikasi / Material (Opsional)</label>
      <textarea rows="2" class="offer-item-materials w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
        placeholder="Plate SUS 304 tebal 1.5mm, Baut L M8, Welder..."></textarea>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Qty</label>
        <input type="number" class="offer-item-qty w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" required min="1" value="1" oninput="calcTotalOffer()">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Satuan</label>
        <input type="text" class="offer-item-unit w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" required placeholder="unit / pcs / lot" value="unit">
      </div>
      <div>
        <label class="block font-semibold text-slate-600 mb-1">Harga Satuan (Rp)</label>
        <input type="number" class="offer-item-price w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500" required min="0" oninput="calcTotalOffer()">
      </div>
    </div>
    <div class="text-right text-[11px] text-slate-500 pt-1">
      Subtotal Item: <span class="offer-item-subtotal font-bold text-slate-800">Rp 0</span>
    </div>
  `;

  if (itemData) {
    card.querySelector('.offer-item-name').value = itemData.offer_item_name || '';
    card.querySelector('.offer-item-materials').value = itemData.materials || '';
    card.querySelector('.offer-item-qty').value = itemData.offer_qty || 1;
    card.querySelector('.offer-item-unit').value = itemData.offer_unit || 'unit';
    card.querySelector('.offer-item-price').value = itemData.offer_price != null ? itemData.offer_price : '';
  }

  container.appendChild(card);
  refreshOfferItemLabels(isEditMode);
  calcTotalOffer();
}

function removeOfferItemCard(btn) {
  const card = btn.closest('.offer-item-card');
  if (card) card.remove();
  refreshOfferItemLabels(false);
  calcTotalOffer();
}

function refreshOfferItemLabels(isEditMode = false) {
  const cards = document.querySelectorAll('#offerItemsContainer .offer-item-card');
  cards.forEach((card, idx) => {
    const label = card.querySelector('.offer-item-label');
    if (label) label.innerText = `ITEM #${idx + 1}`;
    const btnRemove = card.querySelector('.btn-remove-offer-item');
    if (btnRemove) {
      if (!isEditMode && cards.length > 1) {
        btnRemove.classList.remove('hidden');
      } else {
        btnRemove.classList.add('hidden');
      }
    }
  });
}

function openCreateModal() {
  document.getElementById('editOfferID').value = '';
  document.getElementById('offerModalTitle').innerText = 'Form Input Penawaran Baru';
  document.getElementById('createOfferForm').reset();
  document.getElementById('formOfferDate').valueAsDate = new Date();
  document.getElementById('offerItemsContainer').innerHTML = '';

  if (typeof populateOfferCompanyDropdown === 'function') {
    populateOfferCompanyDropdown('');
  }

  const btnAdd = document.getElementById('btnAddOfferItem');
  if (btnAdd) btnAdd.classList.remove('hidden');

  addOfferItemCard(null, false);
  document.getElementById('createModal').classList.remove('hidden');
}

function openEditOfferModal(id) {
  const r = allRecords.find(item => item.id === id);
  if (!r) return;

  document.getElementById('editOfferID').value = r.id;
  document.getElementById('offerModalTitle').innerText = 'Edit Data Penawaran';
  document.getElementById('formOfferNumber').value = r.offer_number || '';
  document.getElementById('formOfferDate').value = r.offer_date ? r.offer_date.split('T')[0] : '';
  if (typeof populateOfferCompanyDropdown === 'function') {
    populateOfferCompanyDropdown(r.client_company || '');
  }
  document.getElementById('formClientCompany').value = r.client_company || '';
  document.getElementById('formClientPIC').value = r.client_pic || '';
  document.getElementById('formNotes').value = r.notes || '';

  const btnAdd = document.getElementById('btnAddOfferItem');
  if (btnAdd) btnAdd.classList.add('hidden');

  document.getElementById('offerItemsContainer').innerHTML = '';
  addOfferItemCard(r, true);
  document.getElementById('createModal').classList.remove('hidden');
}

function onSelectOfferCompany(companyName) {
  if (!companyName || typeof allCompanies === 'undefined') return;
  const comp = allCompanies.find(c => c.name.toLowerCase() === companyName.toLowerCase());
  const picInput = document.getElementById('formClientPIC');
  if (comp && comp.default_pic && picInput && !picInput.value.trim()) {
    picInput.value = comp.default_pic;
  }
}

function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
}

function calcTotalOffer() {
  const cards = document.querySelectorAll('#offerItemsContainer .offer-item-card');
  let grandTotal = 0;
  cards.forEach(card => {
    const q = Number(card.querySelector('.offer-item-qty')?.value) || 0;
    const p = Number(card.querySelector('.offer-item-price')?.value) || 0;
    const sub = q * p;
    grandTotal += sub;
    const subEl = card.querySelector('.offer-item-subtotal');
    if (subEl) subEl.innerText = 'Rp ' + sub.toLocaleString('id-ID');
  });
  document.getElementById('formOfferTotalDisplay').innerText = 'Rp ' + grandTotal.toLocaleString('id-ID');
}

async function submitOfferForm(e) {
  e.preventDefault();
  const editID = document.getElementById('editOfferID').value;
  const offerNumber = document.getElementById('formOfferNumber').value;
  const offerDate = document.getElementById('formOfferDate').value;
  const clientCompany = document.getElementById('formClientCompany').value;
  const clientPIC = document.getElementById('formClientPIC').value;
  const notes = document.getElementById('formNotes').value;

  const cards = Array.from(document.querySelectorAll('#offerItemsContainer .offer-item-card'));
  const payloads = cards.map(card => ({
    offer_number: offerNumber,
    offer_date: offerDate,
    client_company: clientCompany,
    client_pic: clientPIC,
    offer_item_name: card.querySelector('.offer-item-name').value,
    materials: card.querySelector('.offer-item-materials').value,
    offer_qty: Number(card.querySelector('.offer-item-qty').value),
    offer_unit: card.querySelector('.offer-item-unit').value,
    offer_price: Number(card.querySelector('.offer-item-price').value),
    notes: notes
  }));

  try {
    if (editID) {
      const res = await fetch(`/api/v1/records/${editID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payloads[0])
      });
      if (!res.ok) throw new Error('Gagal memperbarui penawaran');
    } else {
      for (const payload of payloads) {
        const res = await fetch('/api/v1/records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Gagal menyimpan salah satu item penawaran');
      }
    }

    closeCreateModal();
    loadRecords();
  } catch (err) {
    alert(err.message || 'Koneksi server gagal');
  }
}

async function deleteRecordFull(id) {
  if (!confirm('Yakin ingin menghapus seluruh baris transaksi penawaran ini secara permanen?')) return;
  try {
    const res = await fetch(`/api/v1/records/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      loadRecords();
    } else {
      alert('Gagal menghapus data');
    }
  } catch (err) {
    alert('Koneksi server gagal');
  }
}

async function deletePOOnly(id) {
  if (!confirm('Hapus data PO dari baris ini? Status penawaran akan kembali menjadi BELUM PO.')) return;
  try {
    const res = await fetch(`/api/v1/records/${id}/po`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      loadRecords();
    } else {
      alert('Gagal menghapus data PO');
    }
  } catch (err) {
    alert('Koneksi server gagal');
  }
}

function openAttachModal(id) {
  const r = allRecords.find(item => item.id === id);
  if (!r) return;

  document.getElementById('attachTargetID').value = r.id;
  document.getElementById('attachOfferTargetText').innerText = `Penawaran: ${r.offer_item_name} (${r.offer_qty} ${r.offer_unit})`;
  
  // Jika sudah ada data PO (mode Edit PO), tampilkan data PO yang sudah tersimpan
  if (r.po_status === 'sudah' && r.po_number) {
    document.getElementById('attachPONumber').value = r.po_number || '';
    document.getElementById('attachPOItemName').value = r.po_item_name || r.offer_item_name;
    document.getElementById('attachPODate').value = r.po_date ? r.po_date.split('T')[0] : '';
    document.getElementById('attachPOPrice').value = r.po_price != null ? r.po_price : r.offer_price;
    document.getElementById('attachPOQty').value = r.po_qty != null ? r.po_qty : r.offer_qty;
    document.getElementById('attachPOUnit').value = r.po_unit || r.offer_unit;
    
    // Tampilkan breakdown nilai jika ada
    let vat = Number(r.po_vat) || 0;
    const grand = Number(r.po_grand_total) || (Number(r.po_total) || 0);
    const sub = Number(r.po_total) || (Number(r.po_price || 0) * Number(r.po_qty || 0));

    // Jika VAT di database 0 tapi Grand Total > Sub Total, hitung otomatis selisihnya
    if (vat === 0 && grand > sub) {
      vat = grand - sub;
    }

    const vatEl = document.getElementById('attachPOVAT');
    vatEl.value = vat;
    vatEl.dataset.rate = (sub > 0 && vat > 0) ? (vat / sub).toString() : '0';
    document.getElementById('attachPOGrandTotal').value = grand;

    const totalsCard = document.getElementById('aiPOTotalsCard');
    if (totalsCard) {
      if (sub > 0 || grand > 0) {
        totalsCard.classList.remove('hidden');
        document.getElementById('aiPOSubTotalText').innerText = 'Rp ' + sub.toLocaleString('id-ID');
        document.getElementById('aiPOVATText').innerText = 'Rp ' + vat.toLocaleString('id-ID');
        document.getElementById('aiPOGrandTotalText').innerText = 'Rp ' + grand.toLocaleString('id-ID');
      } else {
        totalsCard.classList.add('hidden');
      }
    }
  } else {
    // Mode Pasang PO baru (ambil default dari penawaran)
    document.getElementById('attachPONumber').value = '';
    document.getElementById('attachPOItemName').value = r.offer_item_name;
    document.getElementById('attachPODate').valueAsDate = new Date();
    document.getElementById('attachPOQty').value = r.offer_qty;
    document.getElementById('attachPOUnit').value = r.offer_unit;
    document.getElementById('attachPOPrice').value = r.offer_price;
    const vatEl = document.getElementById('attachPOVAT');
    vatEl.value = 0;
    vatEl.dataset.rate = '0';
    document.getElementById('attachPOGrandTotal').value = 0;

    const totalsCard = document.getElementById('aiPOTotalsCard');
    if (totalsCard) totalsCard.classList.add('hidden');
  }

  // Reset input file extract
  const fileInput = document.getElementById('aiPOFileInput');
  if (fileInput) fileInput.value = '';
  const selectorBox = document.getElementById('aiPOItemSelectorBox');
  if (selectorBox) selectorBox.classList.add('hidden');
  window._lastAIExtractedPO = null;

  document.getElementById('attachModal').classList.remove('hidden');
}

function closeAttachModal() {
  document.getElementById('attachModal').classList.add('hidden');
}

function recalculateAttachPOTotals() {
  const totalsCard = document.getElementById('aiPOTotalsCard');
  if (!totalsCard || totalsCard.classList.contains('hidden')) return;

  const price = Number(document.getElementById('attachPOPrice')?.value) || 0;
  const qty = Number(document.getElementById('attachPOQty')?.value) || 0;
  const sub = price * qty;

  const vatEl = document.getElementById('attachPOVAT');
  const rate = Number(vatEl?.dataset.rate) || 0;
  const vat = Math.round(sub * rate);
  const grand = sub + vat;

  document.getElementById('aiPOSubTotalText').innerText = 'Rp ' + sub.toLocaleString('id-ID');
  document.getElementById('aiPOVATText').innerText = 'Rp ' + vat.toLocaleString('id-ID');
  document.getElementById('aiPOGrandTotalText').innerText = 'Rp ' + grand.toLocaleString('id-ID');

  if (vatEl) vatEl.value = vat;
  const grandEl = document.getElementById('attachPOGrandTotal');
  if (grandEl) grandEl.value = grand;
}

async function submitAttachPO(e) {
  e.preventDefault();
  const id = document.getElementById('attachTargetID').value;
  const payload = {
    po_number: document.getElementById('attachPONumber').value,
    po_item_name: document.getElementById('attachPOItemName').value,
    po_date: document.getElementById('attachPODate').value,
    po_price: Number(document.getElementById('attachPOPrice').value),
    po_qty: Number(document.getElementById('attachPOQty').value),
    po_unit: document.getElementById('attachPOUnit').value,
    po_vat: Number(document.getElementById('attachPOVAT')?.value) || 0,
    po_grand_total: Number(document.getElementById('attachPOGrandTotal')?.value) || 0
  };

  try {
    const res = await fetch(`/api/v1/records/${id}/attach-po`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeAttachModal();
      loadRecords();
    } else {
      alert('Gagal mengaitkan PO');
    }
  } catch (err) {
    alert('Koneksi server gagal');
  }
}

async function toggleDelivered(id, currentStatus) {
  const newStatus = currentStatus === 'sudah' ? 'belum' : 'sudah';
  await fetch(`/api/v1/records/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ is_delivered: newStatus })
  });
  loadRecords();
}


function findBestMatchingPOItemIndex(items, targetOfferName) {
  if (!items || items.length <= 1 || !targetOfferName) return 0;

  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
  const bigrams = (str) => {
    const s = str.toLowerCase().replace(/\s+/g, '');
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };

  const offerWords = normalize(targetOfferName);
  let bestIdx = 0;
  let bestScore = -1;

  items.forEach((item, idx) => {
    const itemName = item.item_name || '';
    const itemWords = normalize(itemName);
    let score = 0;

    offerWords.forEach(ow => {
      itemWords.forEach(iw => {
        if (ow === iw) {
          score += 10;
        } else if (ow.includes(iw) || iw.includes(ow)) {
          score += 6;
        } else {
          const b1 = bigrams(ow);
          const b2 = bigrams(iw);
          let overlap = 0;
          b1.forEach(g => { if (b2.has(g)) overlap++; });
          const sim = (2 * overlap) / ((b1.size + b2.size) || 1);
          if (sim >= 0.6) score += 5;
        }
      });
    });

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

function applyAIExtractedItem(idx) {
  const data = window._lastAIExtractedPO;
  if (!data || !data.items || !data.items[idx]) return;

  const item = data.items[idx];
  if (document.getElementById('attachPOItemName')) {
    document.getElementById('attachPOItemName').value = item.item_name || '';
  }
  if (document.getElementById('attachPOQty')) {
    document.getElementById('attachPOQty').value = item.qty || 1;
  }
  if (document.getElementById('attachPOUnit')) {
    document.getElementById('attachPOUnit').value = item.unit || 'unit';
  }
  if (document.getElementById('attachPOPrice')) {
    document.getElementById('attachPOPrice').value = item.unit_price || 0;
  }

  const docSub = Number(data.sub_total) || 0;
  const docGrand = Number(data.grand_total) || docSub;
  let docVat = Number(data.total_vat) || 0;
  if ((docVat === 0 && docGrand > docSub) || (docGrand > docSub && Math.abs((docSub + docVat) - docGrand) > 100)) {
    docVat = docGrand - docSub;
  }
  const vatRate = (docSub > 0 && docVat > 0) ? (docVat / docSub) : 0;

  let sub = docSub;
  let vat = docVat;
  let grand = docGrand;

  if (data.items.length > 1) {
    sub = Number(item.total_price) || ((Number(item.unit_price) || 0) * (Number(item.qty) || 1));
    vat = Math.round(sub * vatRate);
    grand = sub + vat;
  }

  const totalsCard = document.getElementById('aiPOTotalsCard');
  if (totalsCard) {
    totalsCard.classList.remove('hidden');
    document.getElementById('aiPOSubTotalText').innerText = 'Rp ' + sub.toLocaleString('id-ID');
    document.getElementById('aiPOVATText').innerText = 'Rp ' + vat.toLocaleString('id-ID');
    document.getElementById('aiPOGrandTotalText').innerText = 'Rp ' + grand.toLocaleString('id-ID');

    const vatEl = document.getElementById('attachPOVAT');
    vatEl.value = vat;
    vatEl.dataset.rate = vatRate.toString();
    document.getElementById('attachPOGrandTotal').value = grand;
  }
}

function onSelectAIItem(idx) {
  applyAIExtractedItem(Number(idx));
}

// Fungsi mengirim file PDF/Foto ke backend dan mengisi form Attach PO secara otomatis via AI
async function uploadAndExtractPO() {
  const fileInput = document.getElementById('aiPOFileInput');
  const statusEl = document.getElementById('aiExtractionStatus');
  const btnExtract = document.getElementById('btnExtractPOAI');

  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Pilih Dokumen',
      text: 'Silakan pilih file PDF atau Foto PO terlebih dahulu!'
    });
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  if (statusEl) statusEl.classList.remove('hidden');
  if (btnExtract) {
    btnExtract.disabled = true;
    btnExtract.classList.add('opacity-50');
  }

  try {
    const res = await fetch('/api/v1/records/extract-po-ai', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + authToken
      },
      body: formData
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Gagal mengekstrak dokumen');
    }

    const data = result.data;
    window._lastAIExtractedPO = data;

    if (data.po_number && document.getElementById('attachPONumber')) {
      document.getElementById('attachPONumber').value = data.po_number;
    }
    if (data.po_date && document.getElementById('attachPODate')) {
      document.getElementById('attachPODate').value = data.po_date;
    }

    const docSub = Number(data.sub_total) || 0;
    const docGrand = Number(data.grand_total) || docSub;
    let docVat = Number(data.total_vat) || 0;
    if ((docVat === 0 && docGrand > docSub) || (docGrand > docSub && Math.abs((docSub + docVat) - docGrand) > 100)) {
      docVat = docGrand - docSub;
    }

    const selectorBox = document.getElementById('aiPOItemSelectorBox');
    const selectEl = document.getElementById('aiPOItemSelect');

    let selectedSub = docSub;
    let selectedVat = docVat;
    let selectedGrand = docGrand;

    if (data.items && data.items.length > 0) {
      const targetID = Number(document.getElementById('attachTargetID')?.value);
      const targetRec = allRecords.find(r => r.id === targetID);
      const bestIdx = findBestMatchingPOItemIndex(data.items, targetRec?.offer_item_name || '');

      if (data.items.length > 1 && selectorBox && selectEl) {
        selectEl.innerHTML = data.items.map((it, idx) =>
          `<option value="${idx}" ${idx === bestIdx ? 'selected' : ''}>${idx + 1}. ${it.item_name} (Rp ${Number(it.unit_price || 0).toLocaleString('id-ID')})</option>`
        ).join('');
        selectorBox.classList.remove('hidden');
      } else if (selectorBox) {
        selectorBox.classList.add('hidden');
      }

      applyAIExtractedItem(bestIdx);
      selectedSub = Number(data.items[bestIdx].total_price) || ((Number(data.items[bestIdx].unit_price) || 0) * (Number(data.items[bestIdx].qty) || 1));
      if (data.items.length === 1) selectedSub = docSub;
      selectedVat = Number(document.getElementById('attachPOVAT')?.value) || 0;
      selectedGrand = Number(document.getElementById('attachPOGrandTotal')?.value) || selectedSub;
    } else {
      if (selectorBox) selectorBox.classList.add('hidden');
      if (data.sub_total && document.getElementById('attachPOPrice')) {
        document.getElementById('attachPOPrice').value = data.sub_total;
      }
      const totalsCard = document.getElementById('aiPOTotalsCard');
      if (totalsCard) {
        totalsCard.classList.remove('hidden');
        document.getElementById('aiPOSubTotalText').innerText = 'Rp ' + docSub.toLocaleString('id-ID');
        document.getElementById('aiPOVATText').innerText = 'Rp ' + docVat.toLocaleString('id-ID');
        document.getElementById('aiPOGrandTotalText').innerText = 'Rp ' + docGrand.toLocaleString('id-ID');
        const vatEl = document.getElementById('attachPOVAT');
        vatEl.value = docVat;
        vatEl.dataset.rate = (docSub > 0 && docVat > 0) ? (docVat / docSub).toString() : '0';
        document.getElementById('attachPOGrandTotal').value = docGrand;
      }
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Diekstrak AI!',
      html: `<b>No PO:</b> ${data.po_number || '-'}<br><b>Sub Total:</b> Rp ${selectedSub.toLocaleString('id-ID')}<br><b>PPN (VAT):</b> Rp ${selectedVat.toLocaleString('id-ID')}<br><b>Grand Total:</b> Rp ${selectedGrand.toLocaleString('id-ID')}`,
      timer: 4500
    });

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Ekstraksi Gagal',
      text: err.message
    });
  } finally {
    if (statusEl) statusEl.classList.add('hidden');
    if (btnExtract) {
      btnExtract.disabled = false;
      btnExtract.classList.remove('opacity-50');
    }
  }
}
