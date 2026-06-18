/* ============================================================
   RE-SAIKEL — script.js  (final clean build)
   Auth, Cart, Nav, Toast, Calendar, Booking, Counters
   ============================================================ */
'use strict';

const AUTH_KEY = 'rs_auth_user';
const CART_KEY = 'rs_cart';

function getUser()   { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } }
function getCart()   { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }

/* ─── TOAST (top-center, typed) ─── */
function showToast(type, msg) {
  if (arguments.length === 1) { msg = type; type = 'info'; }
  const t = document.getElementById('toast');
  if (!t) return;
  const icons = { success:'fa-check-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle', error:'fa-times-circle' };
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas ${icons[type]||icons.info}"></i><span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3600);
}

/* ─── LOGOUT ─── */
function logout() {
  localStorage.removeItem(AUTH_KEY);
  renderNav();
  showToast('success', 'You have been logged out.');
  setTimeout(() => { window.location.href = 'index.html'; }, 900);
}

/* ─── LOGIN MODAL ─── */
function openLogin() {
  const m = document.getElementById('loginModal');
  if (!m) return;
  m.classList.add('open');
  const ee = document.getElementById('loginEmailErr');
  const pe = document.getElementById('loginPassErr');
  const er = document.getElementById('loginError');
  const btn = document.getElementById('loginSubmitBtn');
  if (ee) ee.textContent = '';
  if (pe) pe.textContent = '';
  if (er) er.textContent = '';
  if (btn) { btn.disabled = false; btn.innerHTML = 'LOG IN'; }
  setTimeout(() => { const f = document.getElementById('loginEmail'); if (f) f.focus(); }, 50);
}
function closeLogin() {
  const m = document.getElementById('loginModal');
  if (m) m.classList.remove('open');
}

async function submitLogin(e) {
  e && e.preventDefault();
  const emailEl  = document.getElementById('loginEmail');
  const passEl   = document.getElementById('loginPassword');
  const errEl    = document.getElementById('loginError');
  const emailErr = document.getElementById('loginEmailErr');
  const passErr  = document.getElementById('loginPassErr');
  const btn      = document.getElementById('loginSubmitBtn');
  if (!emailEl || !passEl) return;

  errEl.textContent = '';
  emailErr.textContent = '';
  passErr.textContent = '';

  const email    = emailEl.value.trim().toLowerCase();
  const password = passEl.value;

  let valid = true;
  if (!email) { emailErr.textContent = 'Email address is required.'; valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailErr.textContent = 'Enter a valid email address.'; valid = false; }
  if (!password) { passErr.textContent = 'Password is required.'; valid = false; }
  if (!valid) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Signing in…';

  try {
    const res   = await fetch('users.json');
    const users = await res.json();
    const user  = users.find(u => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
      btn.disabled = false;
      btn.innerHTML = 'LOG IN';
      errEl.textContent = 'Incorrect email or password. Please try again.';
      emailEl.focus();
      return;
    }

    btn.innerHTML = '<i class="fas fa-check-circle" style="margin-right:6px;"></i>Logged in!';
    const { password: _pw, ...safe } = user;
    localStorage.setItem(AUTH_KEY, JSON.stringify(safe));

    setTimeout(() => {
      closeLogin();
      renderNav();
      renderCartBadge();
      showToast('success', `Welcome back, ${safe.name}! 👋`);
    }, 500);

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = 'LOG IN';
    errEl.textContent = 'Could not connect. Please ensure the server is running.';
    console.error(err);
  }
}

/* ─── CART ─── */
function openCart() {
  if (!getUser()) { openLogin(); showToast('info', 'Please log in to view your cart.'); return; }
  renderCartModal();
  document.getElementById('cartModal').classList.add('open');
}
function closeCart() {
  const m = document.getElementById('cartModal');
  if (m) m.classList.remove('open');
}

function renderCartModal() {
  const cart    = getCart();
  const body    = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty"><div style="font-size:2.4rem;margin-bottom:10px">🛒</div><p>Your cart is empty.</p><a href="marketplace.html" onclick="closeCart()" class="btn-dark" style="margin-top:12px;display:inline-flex;font-size:.78rem;">Browse Marketplace</a></div>`;
    if (totalEl) totalEl.textContent = 'Rp 0';
    return;
  }

  body.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="ci-ico">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">${item.priceLabel}</div>
      </div>
      <div class="ci-qty">
        <button onclick="changeQty(${idx},-1)" aria-label="Decrease">−</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${idx},1)" aria-label="Increase">+</button>
      </div>
      <button class="ci-remove" onclick="removeItem(${idx})" aria-label="Remove item">✕</button>
    </div>`).join('');

  if (totalEl) totalEl.textContent = 'Rp ' + cart.reduce((s,i) => s + i.priceNum * i.qty, 0).toLocaleString('id-ID');
}

function changeQty(idx, delta) {
  const cart = getCart();
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart(cart); renderCartModal(); renderCartBadge();
}
function removeItem(idx) {
  const cart = getCart(); cart.splice(idx, 1);
  saveCart(cart); renderCartModal(); renderCartBadge();
  showToast('info', 'Item removed from cart.');
}
function clearCart() {
  saveCart([]); renderCartModal(); renderCartBadge();
  showToast('info', 'Cart cleared.');
}

function checkoutCart() {
  const cart = getCart();
  if (!cart.length) { showToast('warning', 'Your cart is empty.'); return; }
  const user = getUser();
  if (user) {
    const total     = cart.reduce((s,i) => s + i.priceNum * i.qty, 0);
    const pts       = Math.max(10, Math.round(total / 1000));
    user.points     = (user.points || 0) + pts;
    user.totalTransactions = (user.totalTransactions || 0) + 1;
    if (!user.history) user.history = [];
    user.history.unshift({
      id:'PU'+Date.now(), type:'purchase',
      label: cart.length===1 ? cart[0].name : `${cart.length} items`,
      points: pts,
      date: new Date().toISOString().slice(0,10),
      status:'completed'
    });
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    renderNav();
    saveCart([]); renderCartModal(); renderCartBadge(); closeCart();
    showToast('success', `✓ Order placed! You earned +${pts} Green Points! 🌿`);
  } else {
    saveCart([]); renderCartModal(); renderCartBadge(); closeCart();
    showToast('success', '✓ Order placed! Thank you for recycling with RE-SAIKEL.');
  }
}

function addCart(name, emoji, priceLabel, priceNum) {
  if (!getUser()) { openLogin(); showToast('info', 'Please log in to add items to your cart.'); return; }
  const cart  = getCart();
  const found = cart.find(i => i.name === name);
  if (found) found.qty += 1; else cart.push({ name, emoji, priceLabel, priceNum, qty:1 });
  saveCart(cart); renderCartBadge();
  showToast('success', `${name} added to cart!`);
}

function renderCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  if (!getUser()) { badge.style.display = 'none'; return; }
  const total = getCart().reduce((s,i) => s + i.qty, 0);
  badge.textContent = total > 99 ? '99+' : total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

/* ─── NAV RENDER ─── */
function renderNav() {
  const user      = getUser();
  const loginBtn  = document.getElementById('nav-login-btn');
  const signupBtn = document.getElementById('nav-signin-btn');
  const userChip  = document.getElementById('nav-user-chip');
  if (!loginBtn) return;

  if (user) {
    loginBtn.style.display  = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    userChip.style.display = 'flex';
    const n = document.getElementById('nav-user-name');
    const a = document.getElementById('nav-user-avatar');
    if (n) n.textContent = user.name.split(' ')[0];
    if (a) a.textContent = user.avatar || '👤';

    // Update mobile menu for logged-in state
    const mobLogin    = document.getElementById('mob-login-action');
    const mobUserInfo = document.getElementById('mob-user-info');
    if (mobLogin)    mobLogin.style.display    = 'none';
    if (mobUserInfo) mobUserInfo.style.display = 'flex';
    const mobName   = document.getElementById('mob-user-name-text');
    const mobAvatar = document.getElementById('mob-user-avatar-text');
    if (mobName)   mobName.textContent   = user.name;
    if (mobAvatar) mobAvatar.textContent = user.avatar || '👤';
  } else {
    loginBtn.style.display  = '';
    if (signupBtn) signupBtn.style.display = '';
    userChip.style.display = 'none';
    const mobLogin    = document.getElementById('mob-login-action');
    const mobUserInfo = document.getElementById('mob-user-info');
    if (mobLogin)    mobLogin.style.display    = 'flex';
    if (mobUserInfo) mobUserInfo.style.display = 'none';
  }
  renderCartBadge();
}

/* ─── HAMBURGER MENU ─── */
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  if (!menu) return;
  const open = menu.classList.toggle('open');
  if (btn) {
    btn.setAttribute('aria-expanded', open);
    btn.innerHTML = open ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
  }
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn  = document.getElementById('hamburgerBtn');
  if (!menu || !menu.classList.contains('open')) return;
  menu.classList.remove('open');
  if (btn) { btn.setAttribute('aria-expanded','false'); btn.innerHTML = '<i class="fas fa-bars"></i>'; }
  document.body.style.overflow = '';
}

/* ─── ACTIVE NAV ─── */
function setActiveNav() {
  const page = document.body.dataset.page || 'home';
  const map  = { home:'nl-home', services:'nl-services', how:'nl-how', about:'nl-about' };
  const id   = map[page];
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    const mob = document.getElementById('mob-' + id);
    if (mob) mob.classList.add('active');
  }
}

/* ─── SCROLL REVEAL ─── */
function revealPage() {
  document.querySelectorAll('.sr').forEach((el, i) => setTimeout(() => el.classList.add('vis'), i * 55));
}
window.addEventListener('scroll', () => {
  document.querySelectorAll('.sr:not(.vis)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 50) el.classList.add('vis');
  });
}, { passive: true });

/* ─── STAT COUNTERS ─── */
function initCounters() {
  const banner = document.querySelector('.stats-banner');
  if (!banner) return;
  // Pre-render final values immediately (no flash of 0)
  document.querySelectorAll('[data-target]').forEach(el => {
    el.textContent = (+el.dataset.target).toLocaleString() + (el.dataset.suf || '');
  });
  let animated = false;
  new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || animated) return;
      animated = true;
      document.querySelectorAll('[data-target]').forEach(el => {
        const target = +el.dataset.target, suf = el.dataset.suf || '';
        let cur = 0; const inc = target / 55;
        const t = setInterval(() => {
          cur = Math.min(cur + inc, target);
          el.textContent = Math.floor(cur).toLocaleString() + suf;
          if (cur >= target) clearInterval(t);
        }, 25);
      });
    });
  }, { threshold: 0.3 }).observe(banner);
}

/* ─── CALENDAR ─── */
const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
function buildCal() {
  const cg = document.getElementById('calGrid');
  const tb = document.getElementById('timeBox');
  if (!cg || !tb) return;

  cg.innerHTML = '';
  DOW.forEach(d => { const e = document.createElement('div'); e.className='cal-dow'; e.textContent=d; cg.appendChild(e); });

  const startDay = new Date(2025, 4, 1).getDay();
  for (let i = 0; i < startDay; i++) { const e = document.createElement('div'); e.className='cal-day empty'; cg.appendChild(e); }
  for (let d = 1; d <= 31; d++) {
    const el = document.createElement('div'); el.className='cal-day';
    if (d < 17) el.classList.add('past');
    if (d === 17) el.classList.add('today');
    el.textContent = d;
    if (d >= 17) {
      el.addEventListener('click', () => {
        cg.querySelectorAll('.cal-day.sel').forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');
        updateSummary('sum-date', `May ${d}, 2025`);
        updateSummary('mob-sum-date', `May ${d}, 2025`);
      });
    }
    cg.appendChild(el);
  }

  tb.innerHTML = '';
  ['11:00','12:00','13:00','14:00','15:00','16:00'].forEach(t => {
    const el = document.createElement('div'); el.className='time-slot'; el.textContent=t;
    el.addEventListener('click', () => {
      tb.querySelectorAll('.time-slot.sel').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      updateSummary('sum-time', t);
      updateSummary('mob-sum-time', t);
    });
    tb.appendChild(el);
  });
}

/* ─── BOOKING — live summary + edit jumps ─── */
function updateSummary(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  el.classList.remove('sum-updated');
  void el.offsetWidth;
  el.classList.add('sum-updated');
}

// Sync both desktop sidebar and mobile inline summary
function syncSummaries(field, val) {
  updateSummary('sum-' + field, val);
  updateSummary('mob-sum-' + field, val);
}

function selWaste(el, name) {
  document.querySelectorAll('.wtype-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  syncSummaries('waste', name);
}
function selPartner(el, name) {
  document.querySelectorAll('.partner-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  syncSummaries('partner', name);
}
function useLocation() {
  const input = document.getElementById('loc-input');
  if (input) input.value = 'Jl. Duren Sawit Baru, Jakarta Timur';
  syncSummaries('loc', 'Duren Sawit, Jakarta');
  showToast('success', 'Location set to Duren Sawit, Jakarta');
}
function initLocInput() {
  const input = document.getElementById('loc-input');
  if (!input) return;
  input.addEventListener('input', () => syncSummaries('loc', input.value || '–'));
}

function jumpToStep(stepId) {
  const el = document.getElementById(stepId);
  if (!el) return;
  el.scrollIntoView({ behavior:'smooth', block:'start' });
  el.classList.add('step-highlight');
  setTimeout(() => el.classList.remove('step-highlight'), 1400);
}

function confirmBook() {
  if (!getUser()) { openLogin(); showToast('warning', 'Please log in to confirm a booking.'); return; }
  const dateEl = document.getElementById('sum-date') || document.getElementById('mob-sum-date');
  const timeEl = document.getElementById('sum-time') || document.getElementById('mob-sum-time');
  const d = dateEl?.textContent;
  const t = timeEl?.textContent;

  if (!d || d === '–') { showToast('warning', 'Please select a pickup date.'); jumpToStep('step3'); return; }
  if (!t || t === '–') { showToast('warning', 'Please select a time slot.');   jumpToStep('step3'); return; }

  const booking = {
    partner: document.getElementById('sum-partner')?.textContent || 'Joko Angkut',
    waste:   document.getElementById('sum-waste')?.textContent   || 'Residential Recycling',
    time: t, date: d,
    loc: document.getElementById('sum-loc')?.textContent || ''
  };
  localStorage.setItem('rs_active_booking', JSON.stringify(booking));
  showToast('success', '✓ Booking confirmed! Redirecting to tracking…');
  setTimeout(() => { window.location.href = 'pickup-tracking.html'; }, 1200);
}
function saveBook() { showToast('info', 'Draft saved. You can complete this anytime.'); }

/* ─── KEYBOARD + OUTSIDE CLICK ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLogin(); closeCart(); closeMobileMenu(); }
});
document.addEventListener('click', e => {
  const lm   = document.getElementById('loginModal');
  const cm   = document.getElementById('cartModal');
  const mob  = document.getElementById('mobileMenu');
  const hbtn = document.getElementById('hamburgerBtn');
  if (lm && e.target === lm) closeLogin();
  if (cm && e.target === cm) closeCart();
  if (mob && mob.classList.contains('open') && !mob.contains(e.target) && !hbtn?.contains(e.target)) closeMobileMenu();
});

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  renderNav();
  revealPage();
  initCounters();
  buildCal();
  initLocInput();
});