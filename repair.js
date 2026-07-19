/* Bicycle Store repair service demo — device-local persistence for GitHub Pages */
(function () {
    'use strict';

    const STORAGE_KEY = 'bicycleStoreRepairRequests';
    const LAST_KEY = 'bicycleStoreLastRepairCode';
    const STATUSES = ['ثبت‌شده', 'بررسی اولیه', 'منتظر قطعه', 'درحال تعمیر', 'آماده تحویل'];
    const panels = {
        booking: document.getElementById('bookingPanel'),
        tracking: document.getElementById('trackingPanel'),
        admin: document.getElementById('adminPanel')
    };

    if (!panels.booking) return;

    const demoRequest = {
        id: 'demo-request',
        code: 'BS-DEMO-1405',
        fullName: 'مشتری نمونه',
        phone: '09120000000',
        bikeType: 'کوهستان',
        serviceType: 'سرویس دوره‌ای',
        branch: 'تهران — ونک',
        date: new Date().toISOString().slice(0, 10),
        notes: 'تنظیم ترمز، دنده و بررسی زنجیر',
        status: 'درحال تعمیر',
        estimate: 650000,
        finalCost: 780000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const toEnglishDigits = (value) => String(value)
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

    const formatMoney = (value) => {
        const amount = Number(value || 0);
        return amount ? `${amount.toLocaleString('fa-IR')} تومان` : 'پس از بررسی';
    };

    const formatDate = (value) => {
        if (!value) return '—';
        try {
            return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value));
        } catch {
            return value;
        }
    };

    function getRequests() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(stored) ? stored : [];
        } catch {
            return [];
        }
    }

    function saveRequests(requests) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }

    function getAllRequests() {
        const requests = getRequests();
        return requests.some(item => item.code === demoRequest.code)
            ? requests
            : [demoRequest, ...requests];
    }

    function generateTrackingCode() {
        const year = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(new Date());
        const random = Math.floor(1000 + Math.random() * 9000);
        return `BS-${year}-${random}`;
    }

    function activateTab(tabName, shouldScroll) {
        Object.entries(panels).forEach(([name, panel]) => {
            const active = name === tabName;
            panel.hidden = !active;
            panel.classList.toggle('active', active);
        });
        document.querySelectorAll('.repair-tab').forEach(tab => {
            const active = tab.dataset.repairTab === tabName;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', String(active));
        });
        if (tabName === 'admin') renderAdmin();
        if (shouldScroll) {
            document.getElementById('repair-center').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function renderTracking(request) {
        const result = document.getElementById('trackingResult');
        result.hidden = false;
        if (!request) {
            result.innerHTML = '<div class="tracking-empty"><i class="fas fa-circle-exclamation"></i><p>درخواستی با این کد پیدا نشد. کد را دوباره بررسی کنید.</p></div>';
            return;
        }

        const currentStep = Math.max(0, STATUSES.indexOf(request.status));
        const timeline = STATUSES.map((status, index) =>
            `<div class="timeline-step ${index <= currentStep ? 'done' : ''}">${status}</div>`
        ).join('');

        result.innerHTML = `
            <article class="tracking-card">
                <div class="tracking-card-head">
                    <div>
                        <span>کد پیگیری</span>
                        <h4>${escapeHtml(request.code)}</h4>
                    </div>
                    <div class="status-pill"><i class="fas fa-wrench"></i> ${escapeHtml(request.status)}</div>
                </div>
                <div class="repair-timeline">${timeline}</div>
                <div class="tracking-details">
                    <div><span>مشتری</span><strong>${escapeHtml(request.fullName)}</strong></div>
                    <div><span>نوع خدمت</span><strong>${escapeHtml(request.serviceType)}</strong></div>
                    <div><span>مرکز خدمات</span><strong>${escapeHtml(request.branch)}</strong></div>
                    <div><span>تاریخ مراجعه</span><strong>${formatDate(request.date)}</strong></div>
                    <div><span>دوچرخه</span><strong>${escapeHtml(request.bikeType)}</strong></div>
                    <div><span>برآورد اولیه</span><strong>${formatMoney(request.estimate)}</strong></div>
                    <div><span>هزینه تأییدشده</span><strong>${formatMoney(request.finalCost)}</strong></div>
                    <div><span>آخرین به‌روزرسانی</span><strong>${formatDate(request.updatedAt)}</strong></div>
                </div>
            </article>`;
        localStorage.setItem(LAST_KEY, request.code);
        updateReminder();
    }

    function trackCode(code) {
        const normalized = String(code || '').trim().toUpperCase();
        const request = getAllRequests().find(item => item.code.toUpperCase() === normalized);
        document.getElementById('trackingCode').value = normalized;
        renderTracking(request);
        return request;
    }

    function renderAdmin() {
        const requests = getAllRequests();
        const summary = document.getElementById('repairAdminSummary');
        const list = document.getElementById('repairAdminList');
        const activeCount = requests.filter(item => item.status !== STATUSES.at(-1)).length;
        const waitingCount = requests.filter(item => item.status === 'منتظر قطعه').length;
        const readyCount = requests.filter(item => item.status === STATUSES.at(-1)).length;
        const totalValue = requests.reduce((sum, item) => sum + Number(item.finalCost || 0), 0);

        summary.innerHTML = [
            ['کل درخواست‌ها', requests.length.toLocaleString('fa-IR')],
            ['درحال انجام', activeCount.toLocaleString('fa-IR')],
            ['منتظر قطعه', waitingCount.toLocaleString('fa-IR')],
            ['آماده تحویل', readyCount.toLocaleString('fa-IR')]
        ].map(([label, value]) => `<div class="admin-summary-card"><span>${label}</span><strong>${value}</strong></div>`).join('');
        summary.title = `مجموع هزینه‌های ثبت‌شده: ${formatMoney(totalValue)}`;

        if (!requests.length) {
            list.innerHTML = '<div class="admin-empty">هنوز درخواستی ثبت نشده است.</div>';
            return;
        }

        list.innerHTML = requests.map(request => `
            <article class="admin-request-card" data-request-code="${escapeHtml(request.code)}">
                <div>
                    <h4>${escapeHtml(request.fullName)} <small>— ${escapeHtml(request.code)}</small></h4>
                    <p>${escapeHtml(request.serviceType)} برای دوچرخه ${escapeHtml(request.bikeType)}</p>
                    <div class="admin-request-meta">
                        <span><i class="fas fa-location-dot"></i> ${escapeHtml(request.branch)}</span>
                        <span><i class="fas fa-calendar"></i> ${formatDate(request.date)}</span>
                        <span><i class="fas fa-phone"></i> ${escapeHtml(request.phone)}</span>
                    </div>
                </div>
                <div class="admin-request-control">
                    <label class="sr-only" for="status-${escapeHtml(request.id)}">وضعیت</label>
                    <select id="status-${escapeHtml(request.id)}" data-field="status">
                        ${STATUSES.map(status => `<option value="${status}" ${status === request.status ? 'selected' : ''}>${status}</option>`).join('')}
                    </select>
                    <label class="sr-only" for="cost-${escapeHtml(request.id)}">هزینه نهایی</label>
                    <input id="cost-${escapeHtml(request.id)}" data-field="cost" type="number" min="0" step="10000" value="${Number(request.finalCost || 0)}" placeholder="هزینه نهایی">
                    <button type="button" class="btn btn-primary" data-admin-save="${escapeHtml(request.code)}">ثبت تغییر</button>
                </div>
            </article>`).join('');
    }

    function updateAdminRequest(code, card) {
        if (code === demoRequest.code) {
            showToast('این ردیف نمونه است؛ برای ویرایش، یک درخواست جدید ثبت کنید.');
            return;
        }
        const requests = getRequests();
        const request = requests.find(item => item.code === code);
        if (!request) return;
        request.status = card.querySelector('[data-field="status"]').value;
        request.finalCost = Number(card.querySelector('[data-field="cost"]').value || 0);
        request.updatedAt = new Date().toISOString();
        if (request.status === STATUSES.at(-1) && !request.nextServiceAt) {
            const next = new Date();
            next.setMonth(next.getMonth() + 3);
            request.nextServiceAt = next.toISOString();
        }
        saveRequests(requests);
        renderAdmin();
        updateReminder();
        showToast(`وضعیت ${request.code} به‌روزرسانی شد.`);
    }

    function updateReminder() {
        const text = document.getElementById('serviceReminderText');
        const lastCode = localStorage.getItem(LAST_KEY);
        const request = getAllRequests().find(item => item.code === lastCode);
        if (!request) return;
        if (request.nextServiceAt) {
            text.textContent = `سرویس بعدی ${request.bikeType} برای ${formatDate(request.nextServiceAt)} پیشنهاد شده است.`;
        } else {
            text.textContent = `آخرین درخواست شما ${request.code} است و اکنون در مرحله «${request.status}» قرار دارد.`;
        }
    }

    document.querySelectorAll('[data-repair-tab]').forEach(button => {
        button.addEventListener('click', () => activateTab(button.dataset.repairTab, !button.classList.contains('repair-tab')));
    });

    const dateInput = document.getElementById('repairDate');
    dateInput.min = new Date().toISOString().slice(0, 10);

    document.getElementById('repairService').addEventListener('change', event => {
        const option = event.target.selectedOptions[0];
        const price = Number(option?.dataset.price || 0);
        document.getElementById('repairEstimate').textContent = option?.value
            ? (price ? `از ${formatMoney(price)}` : 'بازدید اولیه رایگان')
            : 'انتخاب خدمت';
    });

    document.getElementById('repairBookingForm').addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const phone = toEnglishDigits(formData.get('phone')).replace(/\s|-/g, '');
        if (!/^09\d{9}$/.test(phone)) {
            showToast('شماره موبایل را به‌صورت صحیح وارد کنید.');
            document.getElementById('repairPhone').focus();
            return;
        }

        let code = generateTrackingCode();
        const requests = getRequests();
        while (requests.some(item => item.code === code)) code = generateTrackingCode();
        const serviceOption = document.getElementById('repairService').selectedOptions[0];
        const request = {
            id: `repair-${Date.now()}`,
            code,
            fullName: String(formData.get('fullName')).trim(),
            phone,
            bikeType: formData.get('bikeType'),
            serviceType: formData.get('serviceType'),
            branch: formData.get('branch'),
            date: formData.get('date'),
            notes: String(formData.get('notes') || '').trim(),
            status: STATUSES[0],
            estimate: Number(serviceOption?.dataset.price || 0),
            finalCost: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        requests.unshift(request);
        saveRequests(requests);
        localStorage.setItem(LAST_KEY, code);
        document.getElementById('newTrackingCode').textContent = code;
        document.getElementById('repairBookingSuccess').hidden = false;
        form.reset();
        document.getElementById('repairEstimate').textContent = 'انتخاب خدمت';
        updateReminder();
        showToast('درخواست تعمیر با موفقیت ثبت شد.');
    });

    document.getElementById('trackNewRequest').addEventListener('click', () => {
        activateTab('tracking', false);
        trackCode(document.getElementById('newTrackingCode').textContent);
    });

    document.getElementById('repairTrackingForm').addEventListener('submit', event => {
        event.preventDefault();
        trackCode(new FormData(event.currentTarget).get('trackingCode'));
    });

    document.getElementById('useDemoTracking').addEventListener('click', () => trackCode(demoRequest.code));

    document.getElementById('repairAdminList').addEventListener('click', event => {
        const button = event.target.closest('[data-admin-save]');
        if (!button) return;
        updateAdminRequest(button.dataset.adminSave, button.closest('.admin-request-card'));
    });

    document.getElementById('viewLastRequest').addEventListener('click', () => {
        activateTab('tracking', true);
        const code = localStorage.getItem(LAST_KEY) || demoRequest.code;
        trackCode(code);
    });

    updateReminder();
})();
