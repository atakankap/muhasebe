// Modern Türkçe ön muhasebe frontend JS
let selectedCompanyId = null;
let reportChart = null;

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-message');
    msg.textContent = '';
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(r => {
        if (!r.ok) throw new Error('Giriş başarısız.');
        return r.json();
    })
    .then(data => {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        msg.textContent = '';
        loadCompanies && loadCompanies();
        loadInvoices && loadInvoices();
    })
    .catch(e => {
        msg.textContent = 'Giriş başarısız: ' + (e.message || 'Hatalı kullanıcı veya şifre');
    });
}


window.addEventListener('DOMContentLoaded', function() {
    const filter = document.getElementById('invoice-type-filter');
    if (filter) {
        filter.addEventListener('change', renderInvoiceTable);
    }
});

function loadInvoices() {
    fetch('/api/faturalar', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(r => {
        if (!r.ok) {
            throw new Error('Faturalar yüklenirken hata');
        }
        return r.json();
    })
    .then(list => {
        renderInvoiceTable(list);
    })
    .catch(error => {
        console.error('Faturalar yüklenirken hata:', error);
    });
}

function renderInvoiceTable(list) {
    const filter = document.getElementById('invoice-type-filter')?.value || '';
    let filtered = list;
    if (filter) {
        filtered = list.filter(f => f.tip === filter);
    }
    
    // Tabloyu yeniden çiz
    const tableBody = document.getElementById('invoice-table-body');
    tableBody.innerHTML = '';
    
    filtered.forEach(f => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${f.id}</td>
            <td>${f.tip}</td>
            <td>${f.tarih}</td>
            <td>${f.miktar}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Sekme değiştirme fonksiyonu
function showTab(tabName) {
    // Tüm sekme içeriklerini gizle
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Tüm sekme butonlarından active sınıfını kaldır
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Seçilen sekmeyi göster
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // İlgili butonu aktif yap
    const activeButton = document.querySelector(`.tab-btn[onclick*="'${tabName}'"`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Sekmeye özel işlemler
    if (tabName === 'companies') {
        loadCompanies();
    } else if (tabName === 'invoices') {
        renderInvoiceSection();
    } else if (tabName === 'reports') {
        fillReportDropdowns();
    } else if (tabName === 'dashboard') {
        updateDashboardSummary();
    }
}

function fillReportDropdowns() {
    // Şirket dropdown
    fetch('/api/sirketler', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(r => {
        if (!r.ok) {
            throw new Error('Yetkilendirme hatası');
        }
        return r.json();
    })
    .then(list => {
        const sel = document.getElementById('report-company-select');
        sel.innerHTML = '';
        
        if (!list || list.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Şirket bulunamadı';
            sel.appendChild(opt);
            return;
        }
        
        list.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.ad;
            sel.appendChild(opt);
        });
        
        // Şirket seçimi değiştiğinde yıl ve ay seçeneklerini güncelle
        sel.addEventListener('change', updateYearAndMonthDropdowns);
        
        // Yıl ve ay seçimi değiştiğinde raporu güncelle
        document.getElementById('report-year-select').addEventListener('change', loadReport);
        document.getElementById('report-month-select').addEventListener('change', loadReport);
        
        // İlk yüklemede yıl ve ay seçeneklerini güncelle
        updateYearAndMonthDropdowns();
    })
    .catch(error => {
        console.error('Şirketler yüklenirken hata:', error);
        document.getElementById('report-company-select').innerHTML = '<option value="">Şirket bulunamadı</option>';
    });
}

// Yıl ve ay seçeneklerini güncelleyen fonksiyon
function updateYearAndMonthDropdowns() {
    const sel = document.getElementById('report-company-select');
    const companyId = sel.value || '';
    
    if (!companyId) {
        document.getElementById('report-year-select').innerHTML = '<option value="">Şirket seçiniz</option>';
        document.getElementById('report-month-select').innerHTML = '<option value="">Tümü</option>';
        return;
    }
    
    fetch('/api/faturalar?company_id=' + companyId, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(r => {
        if (!r.ok) {
            throw new Error('Faturalar yüklenirken hata');
        }
        return r.json();
    })
    .then(fats => {
        // Yıl dropdown
        const yearSel = document.getElementById('report-year-select');
        yearSel.innerHTML = '';
        
        if (!fats || fats.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Fatura bulunamadı';
            yearSel.appendChild(opt);
            return;
        }
        
        const years = [...new Set(fats.map(f => f.tarih ? f.tarih.substr(0,4) : ''))];
        years.filter(Boolean).sort().reverse().forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSel.appendChild(opt);
        });
        
        // Ay dropdown
        const monthSel = document.getElementById('report-month-select');
        monthSel.innerHTML = '<option value="">Tümü</option>';
        
        const months = [...new Set(fats.map(f => f.tarih ? f.tarih.substr(5,2) : ''))];
        months.filter(Boolean).sort().forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            monthSel.appendChild(opt);
        });
        
        // Raporu yükle
        loadReport();
    })
    .catch(error => {
        console.error('Faturalar yüklenirken hata:', error);
        document.getElementById('report-year-select').innerHTML = '<option value="">Hata</option>';
        document.getElementById('report-month-select').innerHTML = '<option value="">Hata</option>';
    });
}

function loadReport() {
    const company_id = document.getElementById('report-company-select').value;
    const yil = document.getElementById('report-year-select').value;
    const ay = document.getElementById('report-month-select').value;
    
    if (!company_id) {
        document.getElementById('report-kpis').innerHTML = '<div class="error">Şirket seçiniz</div>';
        document.getElementById('report-last10-table').innerHTML = '<div class="error">Şirket seçiniz</div>';
        document.getElementById('monthly-detail-table').querySelector('tbody').innerHTML = '<tr><td colspan="8" class="error">Şirket seçiniz</td></tr>';
        return;
    }
    
    let url = `/api/rapor/ozet?company_id=${company_id}`;
    if(yil) url += `&yil=${yil}`;
    if(ay) url += `&ay=${ay}`;
    
    // Yükleniyor mesajı göster
    document.getElementById('report-kpis').innerHTML = '<div class="loading">Yükleniyor...</div>';
    document.getElementById('report-last10-table').innerHTML = '<div class="loading">Yükleniyor...</div>';
    document.getElementById('monthly-detail-table').querySelector('tbody').innerHTML = '<tr><td colspan="8" class="loading">Yükleniyor...</td></tr>';
    
    fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Rapor yüklenirken bir hata oluştu');
        }
        return response.json();
    })
    .then(data => {
        // KPI'ları göster
        renderReportKPIs(data);
        // Tabloları göster
        renderReportTables(data);
        console.log('Rapor verileri:', data); // Hata ayıklama için
    })
    .catch(error => {
        console.error('Rapor yüklenirken hata:', error);
        document.getElementById('report-kpis').innerHTML = '<div class="error">Rapor yüklenirken hata oluştu</div>';
        document.getElementById('report-last10-table').innerHTML = '<div class="error">Rapor yüklenirken hata oluştu</div>';
        document.getElementById('monthly-detail-table').querySelector('tbody').innerHTML = '<tr><td colspan="8" class="error">Rapor yüklenirken hata oluştu</td></tr>';
        });
}

// KPI'ları göster
// Para birimini formatla
function formatMoney(amount) {
    if (amount === undefined || amount === null) return '0.00';
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function renderReportKPIs(data) {
    const kpiArea = document.getElementById('report-kpis');
    
    // Tarih aralığı bilgisi
    const yil = document.getElementById('report-year-select').value || 'Tüm Yıllar';
    const ay = document.getElementById('report-month-select').value ? 
              document.getElementById('report-month-select').options[document.getElementById('report-month-select').selectedIndex].text : 'Tüm Aylar';
    const dateRange = ay !== 'Tümü' ? `${ay} ${yil}` : yil;
    
    // KPI kartlarını oluştur
    kpiArea.innerHTML = `
        <div class="card">
            <h3>Gelir</h3>
            <div class="kpi-value positive">${formatMoney(data.toplam_gelen)} <small>(${data.adet_gelen} adet)</small></div>
        </div>
        <div class="card">
            <h3>Gider</h3>
            <div class="kpi-value negative">${formatMoney(data.toplam_giden)} <small>(${data.adet_giden} adet)</small></div>
        </div>
        <div class="card">
            <h3>Açık Gelir</h3>
            <div class="kpi-value" style="background:#ffe066;color:#333;border:1px solid #e6c200;">${formatMoney(data.toplam_acik_gelen)} <small>(${data.adet_acik_gelen} adet)</small></div>
        </div>
        <div class="card">
            <h3>Açık Gider</h3>
            <div class="kpi-value" style="background:#ff7043;color:#fff;border:1px solid #b94c2b;">${formatMoney(data.toplam_acik_giden)} <small>(${data.adet_acik_giden} adet)</small></div>
        </div>
        <div class="card">
            <h3>Net</h3>
            <div class="kpi-value ${data.toplam_gelen - data.toplam_giden >= 0 ? 'positive' : 'negative'}">
                ${formatMoney(data.toplam_gelen - data.toplam_giden)}
            </div>
        </div>
        <div class="card">
            <h3>KDV Gelir</h3>
            <div class="kpi-value positive">${formatMoney(data.toplam_kdv_gelen)}</div>
        </div>
        <div class="card">
            <h3>KDV Gider</h3>
            <div class="kpi-value negative">${formatMoney(data.toplam_kdv_giden)}</div>
        </div>
        <div class="card">
            <h3>KDV Net</h3>
            <div class="kpi-value ${data.toplam_kdv_gelen - data.toplam_kdv_giden >= 0 ? 'positive' : 'negative'}">
                ${formatMoney(data.toplam_kdv_gelen - data.toplam_kdv_giden)}
            </div>
        </div>
    `;
}

function renderReportTables(data) {
    // Son 10 Fatura tablosu
    const tableArea = document.getElementById('report-last10-table');
    
    if (!data.son10 || data.son10.length === 0) {
        tableArea.innerHTML = '<div class="no-data">Gösterilecek fatura bulunamadı</div>';
        return;
    }
    
    tableArea.innerHTML = `
        <table class="full-width-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Tip</th>
                    <th>Müşteri/Tedarikçi</th>
                    <th>Tarih</th>
                    <th>Tutar</th>
                    <th>KDV</th>
                    <th>Para Birimi</th>
                    <th>Açıklama</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;
    const tbody = tableArea.querySelector('tbody');
    tbody.innerHTML = '';
    data.son10.forEach((f,i) => {
        let tipText = 'Gelir';
        let tipClass = 'badge-gelen';
        if (f.tip === 'giden') {
            tipText = 'Gider';
            tipClass = 'badge-giden';
        } else if (f.tip === 'acik_gelen') {
            tipText = 'Açık Gelir';
            tipClass = 'badge-acik-gelen';
        } else if (f.tip === 'acik_giden') {
            tipText = 'Açık Gider';
            tipClass = 'badge-acik-giden';
        }
        const rowClass = i%2===0 ? 'even-row' : 'odd-row';
        tbody.innerHTML += `<tr class='${rowClass}'>
            <td>${i+1}</td>
            <td><span class='badge ${tipClass}'>${tipText}</span></td>
            <td>${f.musteri_tedarikci}</td>
            <td>${f.tarih}</td>
            <td>${f.tutar}</td>
            <td>${f.kdv_tutari}</td>
            <td>${f.para_birimi}</td>
            <td>${f.aciklama||''}</td>
        </tr>`;
    });
    
    // Aylık Detaylı Rapor tablosu
    renderMonthlyDetailTable(data.aylik_detay);
}

// Aylık detaylı rapor tablosunu oluştur
function renderMonthlyDetailTable(monthlyData) {
    const table = document.getElementById('monthly-detail-table');
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (!monthlyData || monthlyData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">Veri bulunamadı</td></tr>';
        return;
    }
    
    // Verileri tarih sırasına göre sırala
    monthlyData.sort((a, b) => a.ay.localeCompare(b.ay));
    
    // Her ay için satır oluştur
    monthlyData.forEach(month => {
        const row = document.createElement('tr');
        row.classList.add('clickable-row');
        
        // Aya tıklandığında o ayın faturalarını göster
        row.addEventListener('click', function() {
            showMonthlyInvoices(month.ay);
        });
        
        // Net değerlere göre sınıf ekleme
        const netClass = month.net >= 0 ? 'positive' : 'negative';
        const kdvNetClass = month.kdv_net >= 0 ? 'positive' : 'negative';
        
        // KDV oranları detayını hazırla
        let kdvDetails = '';
        if (month.kdv_oranlari && month.kdv_oranlari.length > 0) {
            month.kdv_oranlari.forEach(kdv => {
                kdvDetails += `%${kdv.oran}: Gelir ${formatMoney(kdv.gelen)}, Gider ${formatMoney(kdv.giden)}<br>`;
            });
        }
        
        // Hücreleri oluştur
        row.innerHTML = `
            <td>${month.ay_gosterim}</td>
            <td>${formatMoney(month.gelir)}</td>
            <td>${formatMoney(month.gider)}</td>
            <td class="${netClass}">${formatMoney(month.net)}</td>
            <td>${formatMoney(month.kdv_gelir)}</td>
            <td>${formatMoney(month.kdv_gider)}</td>
            <td class="${kdvNetClass}">${formatMoney(month.kdv_net)}</td>
            <td class="kdv-detail">${kdvDetails}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Toplam satırı ekle
    const totalRow = document.createElement('tr');
    totalRow.style.fontWeight = 'bold';
    totalRow.style.backgroundColor = '#e9ecef';
    
    const totalGelir = monthlyData.reduce((sum, month) => sum + month.gelir, 0);
    const totalGider = monthlyData.reduce((sum, month) => sum + month.gider, 0);
    const totalNet = totalGelir - totalGider;
    const totalKdvGelir = monthlyData.reduce((sum, month) => sum + month.kdv_gelir, 0);
    const totalKdvGider = monthlyData.reduce((sum, month) => sum + month.kdv_gider, 0);
    const totalKdvNet = totalKdvGelir - totalKdvGider;
    
    const totalNetClass = totalNet >= 0 ? 'positive' : 'negative';
    const totalKdvNetClass = totalKdvNet >= 0 ? 'positive' : 'negative';
    
    totalRow.innerHTML = `
        <td>TOPLAM</td>
        <td>${formatMoney(totalGelir)}</td>
        <td>${formatMoney(totalGider)}</td>
        <td class="${totalNetClass}">${formatMoney(totalNet)}</td>
        <td>${formatMoney(totalKdvGelir)}</td>
        <td>${formatMoney(totalKdvGider)}</td>
        <td class="${totalKdvNetClass}">${formatMoney(totalKdvNet)}</td>
        <td></td>
    `;
    
    tbody.appendChild(totalRow);
}

// Para formatı fonksiyonu
function formatMoney(amount) {
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// Excel'e aktarma fonksiyonu
function exportToExcel() {
    const company = document.getElementById('report-company-select').options[document.getElementById('report-company-select').selectedIndex].text;
    const year = document.getElementById('report-year-select').value;
    const month = document.getElementById('report-month-select').options[document.getElementById('report-month-select').selectedIndex].text;
    
    // Excel dosyası için başlık oluştur
    let title = `${company} - `;
    title += year ? year : 'Tüm Yıllar';
    title += month && month !== 'Tümü' ? ` - ${month}` : '';
    
    // Tablo verilerini al
    const table = document.getElementById('monthly-detail-table');
    
    // Excel formatında HTML oluştur
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head>';
    html += '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
    html += '<meta name="ProgId" content="Excel.Sheet">';
    html += '<meta name="Generator" content="Microsoft Excel 11">';
    html += '<style>table, td, th { border: 1px solid black; } .positive { color: green; } .negative { color: red; }</style>';
    html += '</head><body>';
    html += '<h2>' + title + '</h2>';
    html += table.outerHTML;
    html += '</body></html>';
    
    // Dosyayı indirme
    const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rapor_${company.replace(/\s+/g, '_')}_${year || 'Tum'}_${month !== 'Tümü' ? month : 'Tum'}.xls`;
    link.click();
}

// Yazdırma fonksiyonu
function printReport() {
    const company = document.getElementById('report-company-select').options[document.getElementById('report-company-select').selectedIndex].text;
    const year = document.getElementById('report-year-select').value;
    const month = document.getElementById('report-month-select').options[document.getElementById('report-month-select').selectedIndex].text;
    
    // Yazdırma penceresi için HTML oluştur
    let title = `${company} - `;
    title += year ? year : 'Tüm Yıllar';
    title += month && month !== 'Tümü' ? ` - ${month}` : '';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>' + title + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin: 20px 0; }');
    printWindow.document.write('th, td { border: 1px solid #ddd; padding: 8px; }');
    printWindow.document.write('th { background-color: #f2f2f2; text-align: center; }');
    printWindow.document.write('td { text-align: right; }');
    printWindow.document.write('.positive { color: green; }');
    printWindow.document.write('.negative { color: red; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<h1>' + title + '</h1>');
    printWindow.document.write(document.getElementById('monthly-detail-table').outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}


function updateDashboardSummary() {
    fetch('/api/sirketler').then(r => r.json()).then(data => {
        document.querySelector('#summary-companies span').textContent = data.length;
    });
    fetch('/api/faturalar').then(r => r.json()).then(data => {
        document.querySelector('#summary-invoices span').textContent = data.length;
        if(data.length > 0) {
            let last = data[data.length-1];
            document.querySelector('#summary-last-invoice span').textContent = `${last.fatura_no} | ${last.tarih} | ${last.tutar} ${last.para_birimi}`;
        } else {
            document.querySelector('#summary-last-invoice span').textContent = '-';
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('tab-reports')){
        fillReportDropdowns();
        document.getElementById('report-company-select').addEventListener('change', loadReport);
        document.getElementById('report-year-select').addEventListener('change', loadReport);
        document.getElementById('report-month-select').addEventListener('change', loadReport);
    }

    updateDashboardSummary();
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showTab(this.getAttribute('onclick').match(/'([^']+)'/)[1]);
        });
    });
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            let tab = this.className.match(/card-([a-z]+)/)[1];
            showTab(tab);
        });
    });
    showTab('dashboard');
});

function register() {
    const username = document.getElementById('email').value; // Input ID aynı kalabilir
    const password = document.getElementById('password').value;
    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(r => r.json())
    .then(data => {
        document.getElementById('auth-message').innerText = data.mesaj || data.message;
    });
}

function login() {
    const username = document.getElementById('email').value; // Input ID aynı kalabilir
    const password = document.getElementById('password').value;
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(r => {
        if (r.ok) {
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('main-section').style.display = 'block';
            loadCompanies();
        }
        return r.json();
    })
    .then(data => {
        document.getElementById('auth-message').innerText = data.mesaj || data.message;
    });
}

function addCompany() {
    const ad = document.getElementById('company-name').value;
    fetch('/api/sirketler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad })
    })
    .then(r => r.json())
    .then(data => {
        loadCompanies();
        document.getElementById('company-name').value = '';
    });
}

function loadCompanies() {
    fetch('/api/sirketler')
    .then(r => r.json())
    .then(list => {
        // Eğer hiç şirket yoksa, 3 demirbaş şirketi ekle
        if(list.length === 0) {
            const demo = ["Lacs Group", "Leyer Poland", "Kubpol"];
            Promise.all(demo.map(name => fetch('/api/sirketler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ad: name })
            }))).then(() => loadCompanies());
            return;
        }
        const ul = document.getElementById('company-list');
        ul.innerHTML = '';
        list.forEach(c => {
            const li = document.createElement('li');
            li.innerText = c.ad;
            li.className = (selectedCompanyId === c.id) ? 'selected-company' : '';
            li.onclick = () => {
                selectedCompanyId = c.id;
                loadCompanies(); // Yeniden vurgula
                if (document.getElementById('tab-invoices').style.display !== 'none') renderInvoiceSection();
            };
            ul.appendChild(li);
        });
    });
}

function renderInvoiceSection() {
    // Şirket seçili mi kontrol et
    if (!selectedCompanyId) {
        document.getElementById('invoice-content').style.display = 'none';
        document.getElementById('invoice-empty').style.display = 'block';
        document.getElementById('invoice-company-select').innerHTML = '';
        return;
    }
    document.getElementById('invoice-content').style.display = 'block';
    document.getElementById('invoice-empty').style.display = 'none';
    // Şirket adını göster
    fetch('/api/sirketler').then(r => r.json()).then(list => {
        const sel = list.find(c => c.id === selectedCompanyId);
        document.getElementById('invoice-company-select').innerHTML = '<b>Seçili Şirket:</b> ' + (sel ? sel.ad : '');
    });
    loadInvoices();
}

function selectCompany(id) {
    selectedCompanyId = id;
    loadCompanies(); // Şirketler sekmesinde vurgula
    if (document.getElementById('tab-invoices').style.display !== 'none') renderInvoiceSection();
}

function addInvoiceModal() {
    const tip = document.getElementById('modal-invoice-type').value;
    const fatura_no = document.getElementById('modal-fatura-no').value;
    const musteri_tedarikci = document.getElementById('modal-musteri-tedarikci').value;
    const tarih = document.getElementById('modal-tarih').value;
    const tutar = parseFloat(document.getElementById('modal-tutar').value);
    const kdv_orani = parseFloat(document.getElementById('modal-kdv-orani').value);
    const aciklama = document.getElementById('modal-aciklama').value;
    const para_birimi = document.getElementById('modal-para-birimi').value;
    const odeme_yolu = document.getElementById('modal-odeme-yolu').value;
    if (!tip || !fatura_no || !musteri_tedarikci || !tarih || isNaN(tutar) || isNaN(kdv_orani) || !selectedCompanyId) {
        alert("Lütfen tüm alanları doldurun ve bir şirket seçin!");
        return;
    }
    const kdv_tutari = tutar * (kdv_orani / 100);
    fetch('/api/faturalar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip, fatura_no, musteri_tedarikci, tarih, tutar, kdv_orani, kdv_tutari, aciklama, para_birimi, company_id: selectedCompanyId, odeme_yolu })
    })
    .then(r => r.json())
    .then(data => {
        closeInvoiceModal();
        loadInvoices();
    });
}

function showInvoiceModal() {
    if (!selectedCompanyId) {
        alert("Lütfen önce bir şirket seçin!");
        return;
    }
    document.getElementById('invoice-modal').style.display = 'block';
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal').style.display = 'none';
    document.getElementById('modal-invoice-type').value = 'gelen';
    document.getElementById('modal-fatura-no').value = '';
    document.getElementById('modal-musteri-tedarikci').value = '';
    document.getElementById('modal-tarih').value = '';
    document.getElementById('modal-tutar').value = '';
    document.getElementById('modal-kdv-orani').value = '';
    document.getElementById('modal-aciklama').value = '';
    document.getElementById('modal-para-birimi').value = 'PLN';
}

// Aylık fatura listesi modalını kapat
function closeMonthlyInvoicesModal() {
    document.getElementById('monthly-invoices-modal').style.display = 'none';
}

// Aylık fatura listesi için global değişkenler
let currentPage = 1;
let totalPages = 1;
let currentMonth = '';
let currentYear = '';

// Aylık faturaları göster
function showMonthlyInvoices(monthYear) {
    // Ay ve yıl bilgisini ayır (YYYY-MM formatından)
    const [year, month] = monthYear.split('-');
    currentMonth = month;
    currentYear = year;
    currentPage = 1;
    
    // Şirket ID'sini al
    const sirketId = document.getElementById('report-company-select').value;
    
    // Modal başlığını güncelle
    document.getElementById('monthly-invoices-title').innerText = `Fatura Listesi - ${getMonthName(parseInt(month))} ${year}`;
    
    // Modalı göster
    document.getElementById('monthly-invoices-modal').style.display = 'block';
    
    // Faturaları yükle
    loadMonthlyInvoices(sirketId, year, month, currentPage);
}

// Ay adını döndür
function getMonthName(monthNumber) {
    const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return aylar[monthNumber - 1];
}

// Aylık faturaları yükle
function loadMonthlyInvoices(sirketId, year, month, page) {
    fetch(`/api/rapor/ay-faturalar?sirket_id=${sirketId}&yil=${year}&ay=${month}&sayfa=${page}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Hata: ' + data.error);
                return;
            }
            
            // Sayfalama bilgilerini güncelle
            totalPages = data.toplam_sayfa;
            currentPage = data.mevcut_sayfa;
            
            // Sayfalama kontrollerini güncelle
            updatePaginationControls();
            
            // Tabloyu doldur
            renderMonthlyInvoicesTable(data.faturalar);
        })
        .catch(error => {
            console.error('Faturalar yüklenirken hata oluştu:', error);
            alert('Faturalar yüklenirken bir hata oluştu.');
        });
}

// Sayfalama kontrollerini güncelle
function updatePaginationControls() {
    // Sayfa bilgisini güncelle
    document.getElementById('page-info').innerText = `Sayfa ${currentPage} / ${totalPages}`;
    
    // Önceki sayfa butonunu kontrol et
    const prevButton = document.getElementById('prev-page');
    prevButton.disabled = currentPage <= 1;
    
    // Sonraki sayfa butonunu kontrol et
    const nextButton = document.getElementById('next-page');
    nextButton.disabled = currentPage >= totalPages;
}

// Sayfa değiştir
function changePage(direction) {
    const newPage = currentPage + direction;
    
    if (newPage < 1 || newPage > totalPages) {
        return; // Geçersiz sayfa
    }
    
    currentPage = newPage;
    
    // Şirket ID'sini al
    const sirketId = document.getElementById('report-company-select').value;
    
    // Faturaları yükle
    loadMonthlyInvoices(sirketId, currentYear, currentMonth, currentPage);
}

// Aylık fatura listesi tablosunu oluştur
function renderMonthlyInvoicesTable(invoices) {
    const tbody = document.querySelector('#monthly-invoices-table tbody');
    tbody.innerHTML = '';
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center">Bu ay için fatura bulunamadı</td></tr>';
        return;
    }
    
    // Her fatura için satır oluştur
    invoices.forEach((invoice, index) => {
        const row = document.createElement('tr');
        const isGelen = invoice.tip === 'gelen';
        const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
        const tipBadge = isGelen ? 
            `<span class='badge badge-gelen'>Gelir</span>` : 
            `<span class='badge badge-giden'>Gider</span>`;
        
        row.className = `${rowClass} ${isGelen ? 'gelen-row' : 'giden-row'}`;
        
        row.innerHTML = `
            <td>${(currentPage - 1) * 10 + index + 1}</td>
            <td>${invoice.fatura_no || '-'}</td>
            <td>${tipBadge}</td>
            <td>${invoice.musteri_tedarikci}</td>
            <td>${invoice.tarih}</td>
            <td>${formatMoney(invoice.tutar)}</td>
            <td>%${invoice.kdv_orani}</td>
            <td>${formatMoney(invoice.kdv_tutari)}</td>
            <td>${invoice.para_birimi}</td>
            <td>${invoice.odeme_yolu === 'elden' ? 'Elden' : 'Banka'}</td>
            <td>${invoice.aciklama || ''}</td>
        `;
        
        tbody.appendChild(row);
    });
    document.getElementById('modal-para-birimi').value = 'PLN';
}

let _allInvoices = [];

function loadInvoices() {
    if (!selectedCompanyId) return;
    let url = `/api/faturalar?company_id=${selectedCompanyId}`;
    const tbody = document.querySelector('#invoice-table tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading">Faturalar yükleniyor...</td></tr>';
    fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(r => {
        if (!r.ok) {
            throw new Error('Faturalar yüklenirken hata');
        }
        return r.json();
    })
    .then(list => {
        _allInvoices = list;
        renderInvoiceTable();
    })
    .catch(error => {
        tbody.innerHTML = '<tr><td colspan="10" class="error">Faturalar yüklenirken hata oluştu</td></tr>';
    });
}

function renderInvoiceTable() {
    const tbody = document.querySelector('#invoice-table tbody');
    tbody.innerHTML = '';
    if (!_allInvoices || _allInvoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="no-data">Fatura bulunamadı</td></tr>';
        return;
    }
    const filter = document.getElementById('invoice-type-filter')?.value || '';
    let filtered = _allInvoices;
    if (filter) {
        filtered = _allInvoices.filter(f => f.tip === filter);
    }
    filtered.forEach((f, i) => {
            const tr = document.createElement('tr');
            let tipText = 'Gelir';
let tipClass = 'badge-gelen';
if (f.tip === 'giden') {
    tipText = 'Gider';
    tipClass = 'badge-giden';
} else if (f.tip === 'acik_gelen') {
    tipText = 'Açık Gelir';
    tipClass = 'badge-acik-gelen';
} else if (f.tip === 'acik_giden') {
    tipText = 'Açık Gider';
    tipClass = 'badge-acik-giden';
}

tr.innerHTML = `
    <td>${i+1}</td>
    <td><span class="badge ${tipClass}">${tipText}</span></td>
                <td>${f.musteri_tedarikci}</td>
                <td>${f.tarih}</td>
                <td>${formatMoney(f.tutar)} ${f.para_birimi}</td>
                <td>%${f.kdv_orani}</td>
                <td>${formatMoney(f.kdv_tutari)}</td>
                <td>${f.para_birimi}</td>
                <td>${f.odeme_yolu === 'elden' ? 'Elden' : 'Banka'}</td>
                <td>${f.aciklama || ''}</td>
                <td>
                    <button class="delete-btn" onclick="deleteFatura(${f.id})" title="Faturayı Sil">❌</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
}

// Fatura silme fonksiyonu
function deleteFatura(faturaId) {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) {
        return; // Kullanıcı iptal ettiyse işlemi durdur
    }
    
    fetch(`/api/faturalar/${faturaId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Fatura silinirken bir hata oluştu');
        }
        return response.json();
    })
    .then(data => {
        alert('Fatura başarıyla silindi!');
        // Fatura listesini yenile
        loadInvoices();
        
        // Eğer rapor sekmesi açıksa, raporu da güncelle
        if (document.getElementById('tab-reports').style.display === 'block') {
            loadReport();
        }
    })
    .catch(error => {
        console.error('Fatura silme hatası:', error);
        alert('Fatura silinirken bir hata oluştu: ' + error.message);
    });
}
