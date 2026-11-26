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
      <td class="py-3 px-3 text-slate-500 whitespace-nowrap text-xs">${r.offer_date ? r.offer_date.split('T')[0] : '-'}</td>
      <td class="py-3 px-3 whitespace-nowrap text-xs font-semibold text-blue-700">${r.offer_number || '-'}</td>
      <td class="py-3 px-4 min-w-[220px]">
        <div class="font-semibold text-slate-800 text-xs">${r.offer_item_name}</div>
        <div class="text-[10px] text-slate-400 line-clamp-1">${r.materials || '-'}</div>
      </td>
      <td class="py-3 px-3 whitespace-nowrap">
        <span class="font-bold uppercase text-slate-700 text-xs block">${r.client_company}</span>
        <span class="text-slate-400 text-[11px] block" title="${r.client_pic || '-'}">${picDisplay}</span>
      </td>
      <td class="py-3 px-3 whitespace-nowrap text-xs font-medium text-slate-700">${r.offer_qty} ${r.offer_unit}</td>
      <td class="py-3 px-3 whitespace-nowrap text-xs font-semibold text-slate-800">Rp ${Number(r.offer_price).toLocaleString('id-ID')}</td>
      <td class="py-3 px-3 whitespace-nowrap text-center">${poBadge}</td>
      <td class="py-3 px-3 whitespace-nowrap text-xs font-semibold text-slate-800">${r.po_number || '-'}</td>
      <td class="py-3 px-3 whitespace-nowrap text-center">
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
  document.getElementById('detPOVAT').innerText = r.po_vat ? 'Rp ' + Number(r.po_vat).toLocaleString('id-ID') : 'Rp 0';
  document.getElementById('detPOGrandTotal').innerText = r.po_grand_total ? 'Rp ' + Number(r.po_grand_total).toLocaleString('id-ID') : (r.po_total ? 'Rp ' + Number(r.po_total).toLocaleString('id-ID') : '-');

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

function openCreateModal() {
  document.getElementById('editOfferID').value = '';
  document.getElementById('offerModalTitle').innerText = 'Form Input Penawaran Baru';
  document.getElementById('createOfferForm').reset();
  document.getElementById('formOfferDate').valueAsDate = new Date();
  document.getElementById('formOfferTotalDisplay').innerText = 'Rp 0';
  document.getElementById('createModal').classList.remove('hidden');
}

function openEditOfferModal(id) {
  const r = allRecords.find(item => item.id === id);
  if (!r) return;

  document.getElementById('editOfferID').value = r.id;
  document.getElementById('offerModalTitle').innerText = 'Edit Data Penawaran';
  document.getElementById('formOfferNumber').value = r.offer_number || '';
  document.getElementById('formOfferDate').value = r.offer_date ? r.offer_date.split('T')[0] : '';
  document.getElementById('formClientCompany').value = r.client_company || '';
  document.getElementById('formClientPIC').value = r.client_pic || '';
  document.getElementById('formOfferItemName').value = r.offer_item_name || '';
  document.getElementById('formMaterials').value = r.materials || '';
  document.getElementById('formOfferQty').value = r.offer_qty || 1;
  document.getElementById('formOfferUnit').value = r.offer_unit || 'unit';
  document.getElementById('formOfferPrice').value = r.offer_price || 0;
  document.getElementById('formNotes').value = r.notes || '';
  calcTotalOffer();
  document.getElementById('createModal').classList.remove('hidden');
}

function closeCreateModal() {
  document.getElementById('createModal').classList.add('hidden');
}

function calcTotalOffer() {
  const q = Number(document.getElementById('formOfferQty').value) || 0;
  const p = Number(document.getElementById('formOfferPrice').value) || 0;
  document.getElementById('formOfferTotalDisplay').innerText = 'Rp ' + (q * p).toLocaleString('id-ID');
}

async function submitOfferForm(e) {
  e.preventDefault();
  const editID = document.getElementById('editOfferID').value;
  const payload = {
    offer_number: document.getElementById('formOfferNumber').value,
    offer_date: document.getElementById('formOfferDate').value,
    client_company: document.getElementById('formClientCompany').value,
    client_pic: document.getElementById('formClientPIC').value,
    offer_item_name: document.getElementById('formOfferItemName').value,
    materials: document.getElementById('formMaterials').value,
    offer_qty: Number(document.getElementById('formOfferQty').value),
    offer_unit: document.getElementById('formOfferUnit').value,
    offer_price: Number(document.getElementById('formOfferPrice').value),
    notes: document.getElementById('formNotes').value
  };

  const url = editID ? `/api/v1/records/${editID}` : '/api/v1/records';
  const method = editID ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      closeCreateModal();
      loadRecords();
    } else {
      alert('Gagal menyimpan penawaran');
    }
  } catch (err) {
    alert('Koneksi server gagal');
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

    document.getElementById('attachPOVAT').value = vat;
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
    document.getElementById('attachPOVAT').value = 0;
    document.getElementById('attachPOGrandTotal').value = 0;

    const totalsCard = document.getElementById('aiPOTotalsCard');
    if (totalsCard) totalsCard.classList.add('hidden');
  }

  // Reset input file extract
  const fileInput = document.getElementById('aiPOFileInput');
  if (fileInput) fileInput.value = '';

  document.getElementById('attachModal').classList.remove('hidden');
}

function closeAttachModal() {
  document.getElementById('attachModal').classList.add('hidden');
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

    if (data.po_number && document.getElementById('attachPONumber')) {
      document.getElementById('attachPONumber').value = data.po_number;
    }
    if (data.po_date && document.getElementById('attachPODate')) {
      document.getElementById('attachPODate').value = data.po_date;
    }

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      if (document.getElementById('attachPOItemName')) {
        document.getElementById('attachPOItemName').value = item.item_name;
      }
      if (document.getElementById('attachPOQty')) {
        document.getElementById('attachPOQty').value = item.qty;
      }
      if (document.getElementById('attachPOUnit')) {
        document.getElementById('attachPOUnit').value = item.unit;
      }
      if (document.getElementById('attachPOPrice')) {
        document.getElementById('attachPOPrice').value = item.unit_price;
      }
    } else if (data.sub_total && document.getElementById('attachPOPrice')) {
      document.getElementById('attachPOPrice').value = data.sub_total;
    }

    const totalsCard = document.getElementById('aiPOTotalsCard');
    if (totalsCard) {
      totalsCard.classList.remove('hidden');
      const sub = Number(data.sub_total) || 0;
      const grand = Number(data.grand_total) || sub;
      let vat = Number(data.total_vat) || 0;

      // Jika AI membaca VAT 0 atau selisih ada (grand > sub), hitung langsung selisihnya
      if ((vat === 0 && grand > sub) || (grand > sub && Math.abs((sub + vat) - grand) > 100)) {
        vat = grand - sub;
      }

      document.getElementById('aiPOSubTotalText').innerText = 'Rp ' + sub.toLocaleString('id-ID');
      document.getElementById('aiPOVATText').innerText = 'Rp ' + vat.toLocaleString('id-ID');
      document.getElementById('aiPOGrandTotalText').innerText = 'Rp ' + grand.toLocaleString('id-ID');

      document.getElementById('attachPOVAT').value = vat;
      document.getElementById('attachPOGrandTotal').value = grand;
    }

    Swal.fire({
      icon: 'success',
      title: 'Berhasil Diekstrak AI!',
      html: `<b>No PO:</b> ${data.po_number || '-'}<br><b>Sub Total:</b> Rp ${sub.toLocaleString('id-ID')}<br><b>PPN (VAT):</b> Rp ${vat.toLocaleString('id-ID')}<br><b>Grand Total:</b> Rp ${grand.toLocaleString('id-ID')}`,
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
