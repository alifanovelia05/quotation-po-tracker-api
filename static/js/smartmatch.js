function toggleSmartMatchBox() {
  const box = document.getElementById('smartMatchPanel');
  const icon = document.getElementById('smartMatchToggleIcon');
  if (box.classList.contains('hidden')) {
    box.classList.remove('hidden');
    if (icon) icon.className = 'fa-solid fa-chevron-up text-xs transition-transform';
  } else {
    box.classList.add('hidden');
    if (icon) icon.className = 'fa-solid fa-chevron-down text-xs transition-transform';
  }
}

function resetSmartMatch() {
  document.getElementById('matchClient').value = '';
  document.getElementById('matchPIC').value = '';
  document.getElementById('matchKeyword').value = '';
  document.getElementById('matchQty').value = '';
  document.getElementById('matchPrice').value = '';
  document.getElementById('smartMatchResults').innerHTML = `
    <div class="p-6 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
      Masukkan data pencarian PO di atas dan klik <b>"Mulai Analisis Detektif"</b>.
    </div>
  `;
}

async function runSmartMatch() {
  const client = document.getElementById('matchClient').value.trim();
  const pic = document.getElementById('matchPIC').value.trim();
  const keyword = document.getElementById('matchKeyword').value.trim();
  const qty = document.getElementById('matchQty').value.trim();
  const price = document.getElementById('matchPrice').value.trim();

  if (!client && !keyword && !qty && !price) {
    alert('Silakan isi minimal nama klien atau kata kunci material/barang.');
    return;
  }

  let url = '/api/v1/records/smart-match?';
  if (client) url += `client=${encodeURIComponent(client)}&`;
  if (pic) url += `pic=${encodeURIComponent(pic)}&`;
  if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
  if (qty) url += `qty=${qty}&`;
  if (price) url += `price=${price}&`;

  const container = document.getElementById('smartMatchResults');
  container.innerHTML = `
    <div class="p-6 text-center text-xs text-blue-600 font-medium bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-center gap-2">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>Menganalisis kemiripan material & riwayat penawaran...</span>
    </div>
  `;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const json = await res.json();
    const results = json.data || [];

    if (results.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
          <i class="fa-solid fa-magnifying-glass text-slate-400 text-lg mb-1 block"></i>
          Tidak ditemukan penawaran aktif yang cocok dengan parameter di atas.
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    results.forEach(m => {
      const r = m.record;
      const card = document.createElement('div');
      card.className = "bg-white p-4 rounded-xl border border-blue-200/90 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3";
      
      let reasonsHTML = m.match_reasons.map(reason => 
        `<span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 border border-blue-100">
          <i class="fa-solid fa-check text-[9px]"></i>${reason}
        </span>`
      ).join('');

      card.innerHTML = `
        <div class="space-y-1 flex-1">
          <div class="flex items-center gap-2">
            <span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">Kecocokan: ${m.match_score}%</span>
            <span class="font-bold text-xs uppercase text-slate-700">${r.client_company} (PIC: ${r.client_pic || '-'})</span>
            <span class="text-[10px] text-slate-400">${r.offer_date ? r.offer_date.split('T')[0] : ''}</span>
          </div>
          <h5 class="font-bold text-xs text-slate-800">${r.offer_item_name}</h5>
          <p class="text-[11px] text-slate-500">${r.materials || 'Tidak ada spesifikasi material tercatat'}</p>
          <div class="text-[11px] font-semibold text-slate-700">Penawaran: ${r.offer_qty} ${r.offer_unit} @ Rp ${Number(r.offer_price).toLocaleString('id-ID')} (Total: Rp ${Number(r.offer_total).toLocaleString('id-ID')})</div>
          <div class="flex flex-wrap gap-1 pt-1">${reasonsHTML}</div>
        </div>
        <button onclick="openAttachModal(${r.id}, '${r.offer_item_name}', ${r.offer_qty}, '${r.offer_unit}', ${r.offer_price})"
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1.5 self-stretch md:self-center justify-center transition">
          <i class="fa-solid fa-link text-xs"></i>
          <span>Pasang PO Ini</span>
        </button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-xs text-red-500 bg-red-50 rounded-xl border border-red-200">Error menghubungi server API.</div>`;
  }
}

