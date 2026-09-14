/* ===================================================
   دوچرخه‌سرا — Bicycle Store Script
=================================================== */

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('bicycleStoreCart') || '[]');

// ===== STICKY HEADER =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
    document.getElementById('scrollTop').classList.toggle('visible', window.scrollY > 400);
});

// ===== ACTIVE NAV LINK ON SCROLL =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');
window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
        if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
});

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinksEl = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinksEl.classList.toggle('open');
});
navLinksEl.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinksEl.classList.remove('open');
    });
});

// ===== SMOOTH SCROLL FOR ALL ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offset = parseInt(getComputedStyle(document.documentElement)
                .getPropertyValue('--header-h')) || 72;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// ===== PRODUCT FILTER =====
function filterProducts(category) {
    const cards   = document.querySelectorAll('.product-card');
    const buttons = document.querySelectorAll('.filter-btn');
    let visibleCount = 0;

    cards.forEach(card => {
        const match = category === 'all' || card.dataset.category === category;
        card.style.display = match ? '' : 'none';
        if (match) {
            visibleCount++;
            card.style.animation = 'fadeIn .4s ease';
        }
    });

    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === category);
    });

    if (!visibleCount) {
        cards.forEach(card => { card.style.display = ''; });
        buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'all'));
        showToast('در این دسته هنوز محصولی ثبت نشده است؛ همه محصولات نمایش داده شدند.');
    }
}

// ===== REPRESENTATIVE FILTER =====
function filterReps(region) {
    const cards   = document.querySelectorAll('.rep-card');
    const buttons = document.querySelectorAll('.rep-filter-btn');

    cards.forEach(card => {
        const match = region === 'all' || card.dataset.region === region;
        card.classList.toggle('hidden', !match);
    });

    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.region === region);
    });
}

// ===== ADD TO CART =====
function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ name, price, qty: 1 });
    }
    renderCart();
    showToast(`✓  "${name}" به سبد خرید اضافه شد`);
}

// ===== REMOVE FROM CART =====
function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

// ===== RENDER CART =====
function renderCart() {
    const itemsEl  = document.getElementById('cartItems');
    const totalEl  = document.getElementById('cartTotal');
    const badgeEl  = document.getElementById('cartBadge');

    const totalQty   = cart.reduce((s, i) => s + i.qty, 0);
    const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);
    localStorage.setItem('bicycleStoreCart', JSON.stringify(cart));

    badgeEl.textContent = totalQty;

    if (cart.length === 0) {
        itemsEl.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>سبد خرید شما خالی است</p>
            </div>`;
        totalEl.textContent = '۰ تومان';
        return;
    }

    itemsEl.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">
                    ${item.qty > 1 ? `${item.qty} × ` : ''}
                    ${formatPrice(item.price)} تومان
                </div>
            </div>
            <button class="cart-item-remove" type="button" data-cart-remove="${idx}" aria-label="حذف">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');

    itemsEl.querySelectorAll('[data-cart-remove]').forEach(button => {
        button.addEventListener('click', () => removeFromCart(Number(button.dataset.cartRemove)));
    });

    totalEl.textContent = formatPrice(totalPrice) + ' تومان';
}

function formatPrice(n) {
    return n.toLocaleString('fa-IR');
}

// ===== CART SIDEBAR TOGGLE =====
function toggleCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

// ===== MODAL =====
function openModal(id) {
    const index = Number(String(id).replace(/\D/g, '')) - 1;
    const card = document.querySelectorAll('.product-card')[index];
    const modal = document.getElementById('m1');
    if (!card || !modal) {
        showToast('اطلاعات این محصول در دسترس نیست.');
        return;
    }

    const image = card.querySelector('img');
    const cartButton = card.querySelector('.btn-add-cart');
    const cartAction = cartButton?.getAttribute('onclick') || '';
    const cartData = cartAction.match(/addToCart\('([^']+)',\s*(\d+)\)/);
    const cartName = cartButton?.dataset.cartName || cartData?.[1];
    const cartPrice = Number(cartButton?.dataset.cartPrice || cartData?.[2] || 0);
    const name = card.querySelector('.product-name')?.textContent.trim() || image?.alt || 'محصول';
    const category = card.querySelector('.product-category-tag')?.textContent.trim() || 'دوچرخه';
    const price = card.querySelector('.price-new')?.textContent.trim() || 'برای قیمت تماس بگیرید';
    const rating = card.querySelector('.product-rating')?.textContent.trim() || '';

    modal.querySelector('.modal-body img').src = image?.src || '';
    modal.querySelector('.modal-body img').alt = name;
    modal.querySelector('.modal-info h3').textContent = name;
    modal.querySelector('.modal-stars').textContent = rating;
    modal.querySelector('.modal-info p').textContent =
        `${name} از دسته ${category}، با ضمانت اصالت و امکان دریافت خدمات تخصصی پس از فروش.`;
    modal.querySelector('.modal-specs').innerHTML = `
        <li><strong>دسته‌بندی:</strong> ${category}</li>
        <li><strong>ضمانت:</strong> ضمانت اصالت کالا</li>
        <li><strong>خدمات:</strong> مونتاژ و تنظیم اولیه</li>
        <li><strong>ارسال:</strong> بسته‌بندی ایمن</li>`;
    modal.querySelector('.modal-price').textContent = price;

    const modalCartButton = modal.querySelector('.modal-info .btn');
    modalCartButton.removeAttribute('onclick');
    modalCartButton.onclick = () => {
        if (cartName && cartPrice) addToCart(cartName, cartPrice);
        closeModalById('m1');
    };

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(e, id) {
    if (e.target === document.getElementById(id)) {
        closeModalById(id);
    }
}

function closeModalById(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        document.getElementById('cartSidebar')?.classList.remove('active');
        document.getElementById('cartOverlay')?.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===== CONTACT FORM =====
function submitForm(e) {
    e.preventDefault();
    const form    = document.getElementById('contactForm');
    const success = document.getElementById('formSuccess');

    const requiredInputs = form.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
        input.value = input.value.trim();
        input.style.borderColor = input.checkValidity() ? '' : '#B71C1C';
    });

    const phoneInput = form.querySelector('#phone');
    const normalizedPhone = toEnglishDigits(phoneInput.value).replace(/[\s-]/g, '');
    if (normalizedPhone && !/^(?:0\d{10}|021\d{8})$/.test(normalizedPhone)) {
        phoneInput.setCustomValidity('شماره تماس معتبر وارد کنید.');
    } else {
        phoneInput.setCustomValidity('');
    }

    if (!form.checkValidity()) {
        form.reportValidity();
        showToast('لطفاً اطلاعات فرم را به‌صورت صحیح کامل کنید.');
        return;
    }

    form.style.display = 'none';
    success.style.display = 'flex';
    showToast('پیام شما با موفقیت ارسال شد!');
}

function toEnglishDigits(value) {
    return String(value)
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

// ===== NEWSLETTER =====
function subscribeNewsletter(e) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input.value) {
        showToast('✓  عضویت در خبرنامه با موفقیت انجام شد');
        input.value = '';
    }
}

// ===== TOAST =====
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ===== INTERACTION BINDINGS =====
// Use standard listeners so previews with strict content policies do not depend on inline handlers.
function initializeInteractions() {
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', () => filterProducts(button.dataset.filter));
    });

    document.querySelectorAll('.category-card, .footer-links a').forEach(link => {
        const inlineAction = link.getAttribute('onclick') || '';
        const match = inlineAction.match(/filterProducts\('([^']+)'\)/);
        if (!match) return;
        link.removeAttribute('onclick');
        link.dataset.productFilter = match[1];
    });

    document.querySelectorAll('[data-product-filter]').forEach(link => {
        link.addEventListener('click', () => filterProducts(link.dataset.productFilter));
    });

    document.querySelectorAll('.btn-quick-view').forEach(button => {
        const inlineAction = button.getAttribute('onclick') || '';
        const match = inlineAction.match(/openModal\('([^']+)'\)/);
        if (!match) return;
        button.removeAttribute('onclick');
        button.addEventListener('click', () => openModal(match[1]));
    });

    document.querySelectorAll('.btn-add-cart').forEach(button => {
        const inlineAction = button.getAttribute('onclick') || '';
        const match = inlineAction.match(/addToCart\('([^']+)',\s*(\d+)\)/);
        if (!match) return;
        button.dataset.cartName = match[1];
        button.dataset.cartPrice = match[2];
        button.removeAttribute('onclick');
        button.addEventListener('click', () => addToCart(match[1], Number(match[2])));
    });

    document.querySelectorAll('.rep-filter-btn').forEach(button => {
        button.removeAttribute('onclick');
        button.addEventListener('click', () => filterReps(button.dataset.region));
    });

    const cartButton = document.getElementById('cartBtn');
    cartButton.removeAttribute('onclick');
    cartButton.addEventListener('click', toggleCart);

    const cartOverlay = document.getElementById('cartOverlay');
    cartOverlay.removeAttribute('onclick');
    cartOverlay.addEventListener('click', toggleCart);

    const cartClose = document.querySelector('.cart-close');
    cartClose.removeAttribute('onclick');
    cartClose.addEventListener('click', toggleCart);
    const checkoutLink = document.querySelector('.cart-footer a');
    checkoutLink.removeAttribute('onclick');
    checkoutLink.addEventListener('click', () => {
        if (document.getElementById('cartSidebar').classList.contains('active')) toggleCart();
    });

    const modal = document.getElementById('m1');
    modal.removeAttribute('onclick');
    modal.addEventListener('click', event => {
        if (event.target === modal) closeModalById('m1');
    });
    const modalClose = document.querySelector('.modal-close');
    modalClose.removeAttribute('onclick');
    modalClose.addEventListener('click', () => closeModalById('m1'));

    const scrollTopButton = document.getElementById('scrollTop');
    scrollTopButton.removeAttribute('onclick');
    scrollTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    const contactForm = document.getElementById('contactForm');
    contactForm.removeAttribute('onsubmit');
    contactForm.addEventListener('submit', submitForm);
    const newsletterForm = document.getElementById('newsletterForm');
    newsletterForm.removeAttribute('onsubmit');
    newsletterForm.addEventListener('submit', subscribeNewsletter);

    document.querySelectorAll('[data-contact-subject]').forEach(link => {
        link.addEventListener('click', () => {
            document.getElementById('subject').value = link.dataset.contactSubject;
            document.getElementById('message').value = link.dataset.contactMessage || '';
            setTimeout(() => document.getElementById('firstName').focus(), 350);
        });
    });

    document.querySelectorAll('.btn-rep-contact').forEach(link => {
        link.addEventListener('click', () => {
            const card = link.closest('.rep-card');
            const city = card?.querySelector('.rep-city')?.textContent.trim() || 'نمایندگی';
            const phone = card?.querySelector('.rep-phone')?.textContent.trim() || '';
            showToast(`تماس با ${city}: ${phone}`);
        });
    });
}

// ===== INTERSECTION OBSERVER — animate on scroll =====
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(
        '.product-card, .service-card, .rep-card, .testimonial-card, .feature-item'
    ).forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity .5s ease, transform .5s ease';
        observer.observe(el);
    });
}

// ===== INIT =====
initializeInteractions();
renderCart();
