let allRecords = [];
let donutChartInstance = null;

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
    renderTable(allRecords);
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

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/80 transition-colors";
    tr.innerHTML = `
      <td class="p-3.5 text-slate-500 whitespace-nowrap">${r.offer_date ? r.offer_date.split('T')[0] : '-'}</td>
      <td class="p-3.5">
        <div class="font-semibold text-slate-800">${r.offer_item_name}</div>
        <div class="text-[10px] text-slate-400 line-clamp-1">${r.materials || '-'}</div>
      </td>
      <td class="p-3.5 whitespace-nowrap">
        <span class="font-bold uppercase text-slate-700">${r.client_company}</span>
        <span class="text-slate-400 text-[11px] block">${r.client_pic || '-'}</span>
      </td>
      <td class="p-3.5 whitespace-nowrap font-medium">${r.offer_qty} ${r.offer_unit}</td>
      <td class="p-3.5 whitespace-nowrap font-semibold">Rp ${Number(r.offer_price).toLocaleString('id-ID')}</td>
      <td class="p-3.5 whitespace-nowrap text-center">${poBadge}</td>
      <td class="p-3.5 whitespace-nowrap font-mono text-[11px] font-bold text-slate-800">${r.po_number || '-'}</td>
      <td class="p-3.5 whitespace-nowrap text-center">
        <div class="flex flex-col gap-1.5 min-w-[130px] max-w-[160px] mx-auto text-left">
          <button onclick="openDetailModal(${r.id})"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-medium transition shadow-sm">
            <i class="fa-regular fa-eye text-slate-500 w-3.5 text-center"></i>
            <span>Lihat Detail</span>
          </button>
          
          ${!isDeal ? `
            <button onclick="openAttachModal(${r.id}, '${r.offer_item_name}', ${r.offer_qty}, '${r.offer_unit}', ${r.offer_price})"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition shadow-sm">
              <i class="fa-solid fa-file-circle-plus w-3.5 text-center"></i>
              <span>Pasang PO</span>
            </button>
          ` : `
            <button onclick="openAttachModal(${r.id}, '${r.offer_item_name}', ${r.offer_qty}, '${r.offer_unit}', ${r.offer_price})"
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

function filterTable() {
  const q = document.getElementById('tableSearchInput').value.toLowerCase();
  const filtered = allRecords.filter(r => 
    (r.offer_item_name && r.offer_item_name.toLowerCase().includes(q)) ||
    (r.materials && r.materials.toLowerCase().includes(q)) ||
    (r.client_company && r.client_company.toLowerCase().includes(q)) ||
    (r.client_pic && r.client_pic.toLowerCase().includes(q)) ||
    (r.po_number && r.po_number.toLowerCase().includes(q)) ||
    (r.po_item_name && r.po_item_name.toLowerCase().includes(q))
  );
  renderTable(filtered);
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

function openAttachModal(id, itemName, qty, unit, price) {
  document.getElementById('attachTargetID').value = id;
  document.getElementById('attachOfferTargetText').innerText = `Penawaran: ${itemName} (${qty} ${unit})`;
  document.getElementById('attachPOItemName').value = itemName;
  document.getElementById('attachPOQty').value = qty;
  document.getElementById('attachPOUnit').value = unit;
  document.getElementById('attachPOPrice').value = price;
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
    po_unit: document.getElementById('attachPOUnit').value
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
