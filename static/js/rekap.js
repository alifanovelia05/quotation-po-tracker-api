let currentRekapRecords = [];

function updateRekapView() {
  const period = document.getElementById('rekapPeriodSelect').value;
  
  if (period === 'all') {
    currentRekapRecords = [...allRecords];
  } else {
    const [year, sem] = period.split('-');
    currentRekapRecords = allRecords.filter(r => {
      const dateStr = r.offer_date || r.po_date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const y = d.getFullYear().toString();
      const m = d.getMonth() + 1; // 1-12
      if (y !== year) return false;
      if (sem === 's1') return m >= 1 && m <= 6;
      if (sem === 's2') return m >= 7 && m <= 12;
      return true;
    });
  }

  // Update Summary Stats
  const total = currentRekapRecords.length;
  const dealCount = currentRekapRecords.filter(r => r.po_status === 'sudah').length;
  let sumOffer = 0;
  let sumDeal = 0;

  currentRekapRecords.forEach(r => {
    sumOffer += Number(r.offer_total) || 0;
    if (r.po_status === 'sudah') {
      sumDeal += Number(r.po_total) || 0;
    }
  });

  document.getElementById('rekapStatTotal').innerText = total;
  document.getElementById('rekapStatDeal').innerText = dealCount;
  document.getElementById('rekapStatNominalOffer').innerText = 'Rp ' + sumOffer.toLocaleString('id-ID');
  document.getElementById('rekapStatNominalDeal').innerText = 'Rp ' + sumDeal.toLocaleString('id-ID');
  document.getElementById('rekapRowCount').innerText = `${total} baris data`;

  // Render Table Preview
  const tbody = document.getElementById('rekapTableBody');
  tbody.innerHTML = '';

  if (currentRekapRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center p-6 text-slate-400">Tidak ada data untuk periode ini.</td></tr>`;
    return;
  }

  currentRekapRecords.forEach((r, idx) => {
    const isDeal = r.po_status === 'sudah';
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="p-3 text-slate-400 font-mono text-[11px]">${idx + 1}</td>
      <td class="p-3 text-slate-600 whitespace-nowrap">${r.offer_date ? r.offer_date.split('T')[0] : '-'}</td>
      <td class="p-3 font-mono font-bold text-blue-700 whitespace-nowrap text-[11px]">${r.offer_number || '-'}</td>
      <td class="p-3 whitespace-nowrap">
        <span class="font-bold text-slate-700 uppercase">${r.client_company}</span>
        <span class="text-slate-400 text-[10px] block">${r.client_pic || '-'}</span>
      </td>
      <td class="p-3 font-medium text-slate-800">${r.offer_item_name}</td>
      <td class="p-3 whitespace-nowrap text-slate-600">${r.offer_qty} ${r.offer_unit}</td>
      <td class="p-3 whitespace-nowrap font-semibold text-slate-800">Rp ${Number(r.offer_price).toLocaleString('id-ID')}</td>
      <td class="p-3 whitespace-nowrap text-center">
        <span class="badge ${isDeal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
          ${isDeal ? 'SUDAH PO' : 'BELUM PO'}
        </span>
      </td>
      <td class="p-3 whitespace-nowrap font-mono font-bold text-slate-800 text-[11px]">${r.po_number || '-'}</td>
      <td class="p-3 text-slate-600 whitespace-nowrap">${r.po_date ? r.po_date.split('T')[0] : '-'}</td>
      <td class="p-3 whitespace-nowrap font-semibold text-emerald-700">${r.po_price ? 'Rp ' + Number(r.po_price).toLocaleString('id-ID') : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function downloadRekapExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Library Excel sedang dimuat, silakan coba 2 detik lagi.');
    return;
  }

  if (!currentRekapRecords || currentRekapRecords.length === 0) {
    alert('Tidak ada data yang dapat diexport.');
    return;
  }

  const periodSelect = document.getElementById('rekapPeriodSelect');
  const periodText = periodSelect.options[periodSelect.selectedIndex].text;

  // Format baris Excel
  const excelData = currentRekapRecords.map((r, i) => ({
    "No": i + 1,
    "Tgl Penawaran": r.offer_date ? r.offer_date.split('T')[0] : '-',
    "No Surat Penawaran": r.offer_number || '-',
    "Klien": r.client_company,
    "PIC Klien": r.client_pic || '-',
    "Nama Barang / Pekerjaan": r.offer_item_name,
    "Spesifikasi / Material": r.materials || '-',
    "Qty": r.offer_qty,
    "Satuan": r.offer_unit,
    "Harga Satuan Penawaran (Rp)": Number(r.offer_price) || 0,
    "Total Penawaran (Rp)": Number(r.offer_total) || 0,
    "Status Dokumen": r.po_status === 'sudah' ? 'SUDAH PO' : 'BELUM PO',
    "Nomor PO Klien": r.po_number || '-',
    "Nama Barang di PO": r.po_item_name || '-',
    "Tgl PO Masuk": r.po_date ? r.po_date.split('T')[0] : '-',
    "Harga Satuan PO Deal (Rp)": Number(r.po_price) || 0,
    "Total Nilai PO Deal (Rp)": Number(r.po_total) || 0,
    "Selisih Diskon (Rp)": Number(r.total_price_diff) || 0,
    "Catatan": r.notes || '-'
  }));

  // Buat Worksheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Atur lebar kolom otomatis
  const colWidths = [
    { wch: 4 },  // No
    { wch: 14 }, // Tgl Penawaran
    { wch: 16 }, // Klien
    { wch: 14 }, // PIC
    { wch: 35 }, // Nama Barang
    { wch: 30 }, // Spek
    { wch: 6 },  // Qty
    { wch: 8 },  // Satuan
    { wch: 18 }, // Harga Penawaran
    { wch: 18 }, // Total Penawaran
    { wch: 14 }, // Status
    { wch: 16 }, // No PO
    { wch: 30 }, // Nama Barang PO
    { wch: 14 }, // Tgl PO
    { wch: 18 }, // Harga PO
    { wch: 18 }, // Total PO
    { wch: 16 }, // Diskon
    { wch: 20 }  // Catatan
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Argra Teknik Mandiri");

  // Nama file rapi sesuai tanggal
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Rekap_ArgraTeknikMandiri_${timestamp}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
