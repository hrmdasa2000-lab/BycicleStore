const { chromium } = require('playwright');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080/';
const failures = [];
const checks = [];

function check(condition, message) {
    checks.push(message);
    if (!condition) failures.push(message);
}

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.BROWSER_PATH || chromium.executablePath()
    });
    const context = await browser.newContext({ locale: 'fa-IR' });
    await context.route('**/*', route => {
        const url = route.request().url();
        const localRequest = url.startsWith(baseUrl) || (baseUrl.startsWith('file:') && url.startsWith('file:'));
        return localRequest ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        localStorage.clear();
        window.scrollTo = () => {};
        Element.prototype.scrollIntoView = () => {};
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    check((await page.locator('.product-card').count()) === 16, '۱۶ کارت محصول بارگذاری می‌شود');
    check((await page.locator('.rep-card').count()) >= 7, 'کارت‌های نمایندگی بارگذاری می‌شوند');
    check((await page.locator('.view-all-wrap').count()) === 0, 'دکمه مشاهده همه محصولات حذف شده است');
    check((await page.locator('[onclick], [onsubmit]').count()) === 0, 'تعاملات پس از بارگذاری به هندلرهای inline وابسته نیستند');

    await page.evaluate(() => {
        window.__navigationScrolls = [];
        window.scrollTo = options => window.__navigationScrolls.push(options);
    });
    for (const link of await page.locator('.hero-buttons a').all()) {
        const before = await page.evaluate(() => window.__navigationScrolls.length);
        await link.click();
        check((await page.evaluate(() => window.__navigationScrolls.length)) === before + 1, `دکمه ابتدای صفحه «${await link.innerText()}» عمل می‌کند`);
    }

    for (const category of ['kids', 'electric']) {
        await page.locator(`.category-card[data-product-filter="${category}"]`).click();
        check((await page.locator(`.product-card[data-category="${category}"]:visible`).count()) > 0, `دسته سریع ${category} محصولات مرتبط را نشان می‌دهد`);
    }

    for (const button of await page.locator('.filter-btn').all()) {
        await button.click();
        check((await page.locator('.product-card:visible').count()) > 0, `فیلتر محصول «${await button.innerText()}» نتیجه دارد`);
    }

    for (const button of await page.locator('.rep-filter-btn').all()) {
        await button.click();
        check((await page.locator('.rep-card:not(.hidden)').count()) > 0, `فیلتر نمایندگی «${await button.innerText()}» نتیجه دارد`);
    }

    await page.locator('.btn-rep-contact').first().evaluate(element => {
        element.addEventListener('click', event => event.preventDefault(), { once: true, capture: true });
        element.click();
    });
    check((await page.locator('#toast').innerText()).includes('تماس با'), 'دکمه تماس نمایندگی بازخورد قابل مشاهده دارد');

    await page.locator('.banner-large [data-product-filter="mountain"]').click();
    check((await page.locator('.product-card[data-category="mountain"]:visible').count()) > 0, 'دکمه بنر آفر ویژه محصولات کوهستانی را باز می‌کند');
    await page.locator('.banner-item [data-contact-message*="لوازم جانبی"]').click();
    check((await page.locator('#message').inputValue()).includes('لوازم جانبی'), 'دکمه بنر لوازم جانبی فرم مرتبط را آماده می‌کند');
    await page.locator('.banner-item [data-repair-tab="booking"]').click();
    check(!(await page.locator('#bookingPanel').getAttribute('hidden')), 'دکمه بنر خدمات تعمیر فرم رزرو را باز می‌کند');

    const servicePresetLinks = page.locator('.services-grid [data-contact-subject]');
    for (let index = 0; index < await servicePresetLinks.count(); index++) {
        const link = servicePresetLinks.nth(index);
        const expectedMessage = await link.getAttribute('data-contact-message');
        await link.click();
        check((await page.locator('#message').inputValue()) === expectedMessage, `دکمه خدمات «${await link.innerText()}» فرم درست را آماده می‌کند`);
    }

    await page.locator('.filter-btn[data-filter="all"]').click();
    const quickButtons = page.locator('.btn-quick-view');
    for (let index = 0; index < await quickButtons.count(); index++) {
        const expectedName = (await page.locator('.product-card').nth(index).locator('.product-name').innerText()).trim();
        await quickButtons.nth(index).evaluate(element => element.click());
        check(await page.locator('#m1').evaluate(element => element.classList.contains('active')), `نمایش سریع محصول ${index + 1} باز می‌شود`);
        check((await page.locator('#m1 .modal-info h3').innerText()).trim() === expectedName, `اطلاعات نمایش سریع محصول ${index + 1} درست است`);
        await page.locator('#m1 .modal-close').click();
        check((await page.locator('body').evaluate(element => element.style.overflow)) === '', `نمایش سریع محصول ${index + 1} بدون قفل اسکرول بسته می‌شود`);
    }

    await quickButtons.first().evaluate(element => element.click());
    await page.locator('#m1 .modal-info .btn').click();
    check((await page.locator('#cartBadge').innerText()).trim() === '1', 'دکمه افزودن به سبد داخل نمایش سریع کار می‌کند');

    const addButtons = page.locator('.product-card .btn-add-cart');
    for (let index = 0; index < await addButtons.count(); index++) {
        await addButtons.nth(index).click();
    }
    check((await page.locator('#cartBadge').innerText()).trim() === '17', 'همه دکمه‌های افزودن به سبد کار می‌کنند');
    await page.locator('#cartBtn').click();
    check(await page.locator('#cartSidebar').evaluate(element => element.classList.contains('active')), 'دکمه سبد خرید پنل را باز می‌کند');
    await page.locator('.cart-item-remove').first().click();
    check((await page.locator('#cartBadge').innerText()).trim() === '15', 'دکمه حذف، ردیف محصول و تعداد آن را از سبد کم می‌کند');
    await page.locator('.cart-close').click();
    check(!(await page.locator('#cartSidebar').evaluate(element => element.classList.contains('active'))), 'دکمه بستن سبد کار می‌کند');
    await page.locator('#cartBtn').click();
    await page.locator('#cartOverlay').click({ position: { x: 1000, y: 5 } });
    check(!(await page.locator('#cartSidebar').evaluate(element => element.classList.contains('active'))), 'کلیک روی پس‌زمینه سبد را می‌بندد');
    await page.locator('#cartBtn').click();
    await page.keyboard.press('Escape');
    check(!(await page.locator('#cartSidebar').evaluate(element => element.classList.contains('active'))), 'کلید Escape سبد خرید را می‌بندد');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#hamburger').click();
    check(await page.locator('#navLinks').evaluate(element => element.classList.contains('open')), 'دکمه منوی موبایل کار می‌کند');
    await page.locator('#hamburger').click();
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.locator('.repair-hero [data-repair-tab="tracking"]').click();
    check(!(await page.locator('#trackingPanel').getAttribute('hidden')), 'دکمه پیگیری در معرفی سامانه، تب درست را باز می‌کند');
    await page.locator('.repair-hero [data-repair-tab="booking"]').click();
    check(!(await page.locator('#bookingPanel').getAttribute('hidden')), 'دکمه رزرو در معرفی سامانه، تب درست را باز می‌کند');

    await page.locator('[data-repair-tab="tracking"].repair-tab').focus();
    await page.keyboard.press('ArrowLeft');
    check(await page.locator('#adminTab').getAttribute('aria-selected') === 'true', 'تب‌های تعمیرات با صفحه‌کلید جابه‌جا می‌شوند');
    await page.locator('#bookingTab').click();

    const today = await page.locator('#repairDate').getAttribute('min');
    await page.locator('#repairFullName').fill('علی رضایی');
    await page.locator('#repairPhone').fill('۰۹۱۲۳۴۵۶۷۸۹');
    await page.locator('#repairBikeType').selectOption({ index: 1 });
    await page.locator('#repairService').selectOption({ index: 2 });
    check((await page.locator('#repairEstimate').innerText()).includes('۶۵۰٬۰۰۰'), 'برآورد هزینه با انتخاب خدمت به‌روز می‌شود');
    await page.locator('#repairBranch').selectOption({ index: 1 });
    await page.locator('#repairDate').fill(today);
    await page.locator('#repairNotes').fill('تنظیم کامل ترمز و دنده');
    await page.locator('#repairBookingForm input[name="consent"]').check();
    await page.locator('#repairFullName').fill('ع');
    await page.locator('#repairBookingForm button[type="submit"]').click();
    check(await page.locator('#repairBookingSuccess').getAttribute('hidden') !== null, 'فرم رزرو نام ناقص را رد می‌کند');
    await page.locator('#repairFullName').fill('علی رضایی');
    await page.locator('#repairPhone').fill('0912345');
    await page.locator('#repairBookingForm button[type="submit"]').click();
    check(await page.locator('#repairBookingSuccess').getAttribute('hidden') !== null, 'فرم رزرو شماره موبایل ناقص را رد می‌کند');
    await page.locator('#repairPhone').fill('۰۹۱۲۳۴۵۶۷۸۹');
    await page.locator('#repairBookingForm button[type="submit"]').click();
    check(!(await page.locator('#repairBookingSuccess').getAttribute('hidden')), 'فرم رزرو معتبر ثبت می‌شود');

    const trackingCode = (await page.locator('#newTrackingCode').innerText()).trim();
    check(/^BS-\d{4}-\d{4}$/.test(trackingCode), 'کد پیگیری معتبر تولید می‌شود');
    await page.locator('#trackNewRequest').click();
    check((await page.locator('#trackingResult').innerText()).includes(trackingCode), 'دکمه پیگیری درخواست تازه نتیجه را نمایش می‌دهد');

    await page.locator('#adminTab').click();
    await page.locator('[data-request-code="BS-DEMO-1405"] [data-admin-save]').click();
    check((await page.locator('#toast').innerText()).includes('نمونه است'), 'ردیف نمونه پنل تعمیرگاه قابل ویرایش نیست');
    const requestCard = page.locator(`.admin-request-card[data-request-code="${trackingCode}"]`);
    check((await requestCard.count()) === 1, 'درخواست تازه در پنل تعمیرگاه نمایش داده می‌شود');
    await requestCard.locator('[data-field="status"]').selectOption({ label: 'آماده تحویل' });
    await requestCard.locator('[data-field="cost"]').fill('820000');
    await requestCard.locator('[data-admin-save]').click();

    await page.locator('#trackingTab').click();
    await page.locator('#trackingCode').fill(trackingCode.toLowerCase());
    await page.locator('#repairTrackingForm button[type="submit"]').click();
    const trackingText = await page.locator('#trackingResult').innerText();
    check(trackingText.includes('آماده تحویل'), 'تغییر وضعیت پنل در پیگیری دیده می‌شود');
    check(trackingText.includes('۸۲۰٬۰۰۰'), 'هزینه نهایی پنل در پیگیری دیده می‌شود');

    await page.locator('#trackingCode').fill('BS-NOT-FOUND');
    await page.locator('#repairTrackingForm button[type="submit"]').click();
    check((await page.locator('#trackingResult').innerText()).includes('پیدا نشد'), 'کد پیگیری نامعتبر پیام مناسب دارد');
    await page.locator('#useDemoTracking').click();
    check((await page.locator('#trackingResult').innerText()).includes('BS-DEMO-1405'), 'دکمه کد نمونه کار می‌کند');
    await page.locator('#viewLastRequest').click();
    check((await page.locator('#trackingResult').innerText()).includes(trackingCode), 'دکمه آخرین درخواست، درخواست واقعی کاربر را نشان می‌دهد');

    await page.locator('#firstName').click();
    check(await page.locator('#firstName').evaluate(element => document.activeElement === element), 'فیلدهای فرم تماس فوکوس می‌گیرند');
    await page.locator('#email').fill('invalid-email');
    await page.locator('#firstName').fill('سارا');
    await page.locator('#lastName').fill('محمدی');
    await page.locator('#message').fill('درخواست مشاوره');
    await page.locator('#contactForm button[type="submit"]').click();
    check(await page.locator('#contactForm').isVisible(), 'فرم تماس ایمیل نامعتبر را رد می‌کند');
    await page.locator('#email').fill('sara@example.com');
    await page.locator('#phone').fill('۰۹۱۲۳۴۵۶۷۸۹');
    await page.locator('#contactForm button[type="submit"]').click();
    check(await page.locator('#formSuccess').isVisible(), 'فرم تماس معتبر ارسال می‌شود');

    await page.locator('.newsletter-form input').fill('news@example.com');
    await page.locator('.newsletter-form button').click();
    check((await page.locator('.newsletter-form input').inputValue()) === '', 'فرم خبرنامه معتبر ارسال و پاک می‌شود');

    for (const link of await page.locator('a[href="#"]').all()) {
        await link.evaluate(element => element.click());
    }
    check(pageErrors.length === 0, 'تعامل با لینک‌های جایگزین خطای JavaScript نمی‌سازد');

    await page.evaluate(() => {
        window.__scrollTopCalled = false;
        window.scrollTo = options => {
            if (typeof options === 'object' && options.top === 0) window.__scrollTopCalled = true;
        };
    });
    await page.locator('#scrollTop').evaluate(element => element.click());
    check(await page.evaluate(() => window.__scrollTopCalled), 'دکمه بازگشت به بالا فرمان اسکرول را اجرا می‌کند');

    await page.setViewportSize({ width: 390, height: 844 });
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (horizontalOverflow > 1) {
        const offenders = await page.evaluate(() => [...document.querySelectorAll('body *')]
            .filter(element => {
                const rect = element.getBoundingClientRect();
                return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
            })
            .slice(0, 20)
            .map(element => ({
                tag: element.tagName,
                id: element.id,
                className: String(element.className),
                left: Math.round(element.getBoundingClientRect().left),
                right: Math.round(element.getBoundingClientRect().right)
            })));
        console.error(`MOBILE_OVERFLOW ${horizontalOverflow}: ${JSON.stringify(offenders)}`);
    }
    check(horizontalOverflow <= 1, 'نمای موبایل اسکرول افقی ناخواسته ندارد');

    check(pageErrors.length === 0, `اجرای کامل بدون خطای صفحه است${pageErrors.length ? `: ${pageErrors.join(' | ')}` : ''}`);

    console.log(`PASS ${checks.length - failures.length}/${checks.length}`);
    if (failures.length) {
        console.error(failures.map(item => `FAIL: ${item}`).join('\n'));
        await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
        process.exit(1);
    }
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
    process.exit(0);
})().catch(error => {
    console.error(error);
    process.exit(1);
});
