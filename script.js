/* ===================================================
   دوچرخه‌سرا — Bicycle Store Script
=================================================== */

// ===== CART STATE =====
let cart = [];

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
        const target = document.querySelector(anchor.getAttribute('href'));
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

    cards.forEach(card => {
        const match = category === 'all' || card.dataset.category === category;
        card.style.display = match ? '' : 'none';
        if (match) {
            card.style.animation = 'fadeIn .4s ease';
        }
    });

    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === category);
    });
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
            <button class="cart-item-remove" onclick="removeFromCart(${idx})" aria-label="حذف">
                <i class="fas fa-trash"></i>
            </button>
        </div>`).join('');

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
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(e, id) {
    if (e.target === document.getElementById(id)) {
        document.getElementById(id).classList.remove('active');
        document.body.style.overflow = '';
    }
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active')
            .forEach(m => { m.classList.remove('active'); });
        document.body.style.overflow = '';
    }
});

// ===== CONTACT FORM =====
function submitForm(e) {
    e.preventDefault();
    const form    = document.getElementById('contactForm');
    const success = document.getElementById('formSuccess');

    // Simple validation
    const inputs = form.querySelectorAll('[required]');
    let valid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#B71C1C';
            valid = false;
        } else {
            input.style.borderColor = '';
        }
    });
    if (!valid) {
        showToast('لطفاً تمام فیلدهای ضروری را پر کنید');
        return;
    }

    form.style.display = 'none';
    success.style.display = 'flex';
    showToast('پیام شما با موفقیت ارسال شد!');
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

// ===== INTERSECTION OBSERVER — animate on scroll =====
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

// ===== INIT =====
renderCart();
