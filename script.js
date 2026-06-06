/* ============================================================
   RE-SAIKEL — script.js
   Auth (login/logout), Cart, Navigation, Counters, Calendar,
   Booking, Marketplace, Toast
   Storage: localStorage  |  Users: users.json (fetch)
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────
   AUTH — keys & helpers
───────────────────────────────────────── */
const AUTH_KEY  = 'rs_auth_user';   // currently logged-in user object
const CART_KEY  = 'rs_cart';        // array of cart item objects

function getUser()  { try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; } }
function getCart()  { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } }
function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); }

function logout() {
  localStorage.removeItem(AUTH_KEY);
  // keep the cart so it isn't lost on accidental logout
  renderNav();
  showToast('You have been logged out.');
  setTimeout(() => { window.location.href = 'index.html'; }, 900);
}

/* ─────────────────────────────────────────
   LOGIN MODAL
───────────────────────────────────────── */
function openLogin() {
  document.getElementById('loginModal').classList.add('open');
  document.getElementById('loginEmail').focus();
  document.getElementById('loginError').textContent = '';
}
function closeLogin() {
  document.getElementById('loginModal').classList.remove('open');
}

async function submitLogin(e) {
  e && e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.textContent = '';

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.';
    return;
  }

  try {
    const res   = await fetch('users.json');
    const users = await res.json();
    const user  = users.find(u => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
      errEl.textContent = 'Invalid email or password.';
      return;
    }

    // Strip password before storing
    const { password: _pw, ...safe } = user;
    localStorage.setItem(AUTH_KEY, JSON.stringify(safe));

    closeLogin();
    renderNav();
    showToast(`Welcome back, ${safe.name}! 👋`);

    // If on booking/marketplace pages, refresh cart UI
    renderCartBadge();

  } catch (err) {
    errEl.textContent = 'Could not load user data. Make sure users.json is served correctly.';
    console.error(err);
  }
}

/* ─────────────────────────────────────────
   CART MODAL
───────────────────────────────────────── */
function openCart() {
  const user = getUser();
  if (!user) {
    openLogin();
    showToast('Please log in to view your cart.');
    return;
  }
  renderCartModal();
  document.getElementById('cartModal').classList.add('open');
}
function closeCart() {
  document.getElementById('cartModal').classList.remove('open');
}

function renderCartModal() {
  const cart    = getCart();
  const body    = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:2.5rem;margin-bottom:10px;">🛒</div>
        <p>Your cart is empty.</p>
        <a href="marketplace.html" onclick="closeCart()" class="btn-dark" style="margin-top:12px;display:inline-flex;">Browse Marketplace</a>
      </div>`;
    totalEl.textContent = 'Rp 0';
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
        <button onclick="changeQty(${idx}, -1)">−</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${idx}, 1)">+</button>
      </div>
      <button class="ci-remove" onclick="removeItem(${idx})" title="Remove">✕</button>
    </div>`).join('');

  const total = cart.reduce((sum, i) => sum + i.priceNum * i.qty, 0);
  totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
}

function changeQty(idx, delta) {
  const cart = getCart();
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart(cart);
  renderCartModal();
  renderCartBadge();
}

function removeItem(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  renderCartModal();
  renderCartBadge();
  showToast('Item removed from cart.');
}

function clearCart() {
  saveCart([]);
  renderCartModal();
  renderCartBadge();
  showToast('Cart cleared.');
}

function checkoutCart() {
  const cart = getCart();
  if (cart.length === 0) { showToast('Your cart is empty.'); return; }

  // Award points: 1 pt per Rp 1000 spent (rounded), min 10 pts
  const user = getUser();
  if (user) {
    const totalSpent = cart.reduce((s, i) => s + i.priceNum * i.qty, 0);
    const ptsEarned  = Math.max(10, Math.round(totalSpent / 1000));
    user.points = (user.points || 0) + ptsEarned;
    user.totalTransactions = (user.totalTransactions || 0) + 1;
    if (!user.history) user.history = [];
    const itemNames = cart.map(i => i.name).join(', ');
    user.history.unshift({
      id: 'PU'+Date.now(), type:'purchase',
      label: cart.length === 1 ? cart[0].name : `${cart.length} items (${itemNames.slice(0,30)}…)`,
      points: ptsEarned,
      date: new Date().toISOString().slice(0,10),
      status:'completed'
    });
    localStorage.setItem('rs_auth_user', JSON.stringify(user));
    renderNav();
    saveCart([]);
    renderCartModal();
    renderCartBadge();
    closeCart();
    showToast(`✓ Order placed! You earned +${ptsEarned} Green Points! 🌿`);
  } else {
    saveCart([]);
    renderCartModal();
    renderCartBadge();
    closeCart();
    showToast('✓ Order placed! Thank you for recycling with RE-SAIKEL.');
  }
}

/* ─────────────────────────────────────────
   ADD TO CART (called from marketplace)
───────────────────────────────────────── */
function addCart(name, emoji, priceLabel, priceNum) {
  const user = getUser();
  if (!user) {
    openLogin();
    showToast('Please log in to add items to your cart.');
    return;
  }

  const cart  = getCart();
  const found = cart.find(i => i.name === name);
  if (found) {
    found.qty += 1;
  } else {
    cart.push({ name, emoji, priceLabel, priceNum, qty: 1 });
  }
  saveCart(cart);
  renderCartBadge();
  showToast(`${name} added to cart!`);
}

/* ─────────────────────────────────────────
   CART BADGE (count bubble on nav icon)
───────────────────────────────────────── */
function renderCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const user  = getUser();
  if (!user)  { badge.style.display = 'none'; return; }
  const total = getCart().reduce((s, i) => s + i.qty, 0);
  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

/* ─────────────────────────────────────────
   NAV RENDER — shows auth state
───────────────────────────────────────── */
function renderNav() {
  const user       = getUser();
  const loginBtn   = document.getElementById('nav-login-btn');
  const signinBtn  = document.getElementById('nav-signin-btn');
  const userChip   = document.getElementById('nav-user-chip');
  const userName   = document.getElementById('nav-user-name');
  const userAvatar = document.getElementById('nav-user-avatar');

  if (!loginBtn) return; // nav not on this page

  if (user) {
    loginBtn.style.display  = 'none';
    signinBtn.style.display = 'none';
    userChip.style.display  = 'flex';
    if (userName)   userName.textContent  = user.name.split(' ')[0];
    if (userAvatar) userAvatar.textContent = user.avatar || '👤';
  } else {
    loginBtn.style.display  = '';
    signinBtn.style.display = '';
    userChip.style.display  = 'none';
  }

  renderCartBadge();
}

/* ─────────────────────────────────────────
   ACTIVE NAV LINK
───────────────────────────────────────── */
function setActiveNav() {
  const page = document.body.dataset.page || 'home';
  const map  = { home: 'nl-home', services: 'nl-services', how: 'nl-how', about: 'nl-about' };
  const id   = map[page];
  if (id) { const el = document.getElementById(id); if (el) el.classList.add('active'); }
}

/* ─────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────── */
function revealPage() {
  document.querySelectorAll('.sr').forEach((el, i) => {
    setTimeout(() => el.classList.add('vis'), i * 55);
  });
}
window.addEventListener('scroll', () => {
  document.querySelectorAll('.sr:not(.vis)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 50) el.classList.add('vis');
  });
});

/* ─────────────────────────────────────────
   STAT COUNTERS
───────────────────────────────────────── */
let countersDone = false;
function runCounters() {
  if (countersDone) return; countersDone = true;
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = +el.dataset.target, suf = el.dataset.suf || '';
    let cur = 0; const inc = target / 55;
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target);
      el.textContent = Math.floor(cur).toLocaleString() + suf;
      if (cur >= target) clearInterval(t);
    }, 25);
  });
}
function initCounters() {
  const banner = document.querySelector('.stats-banner');
  if (!banner) return;
  new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) runCounters(); });
  }, { threshold: 0.4 }).observe(banner);
}

/* ─────────────────────────────────────────
   CALENDAR
───────────────────────────────────────── */
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildCal() {
  const cg = document.getElementById('calGrid');
  const tb = document.getElementById('timeBox');
  if (!cg || !tb) return;

  cg.innerHTML = '';
  DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow'; el.textContent = d; cg.appendChild(el);
  });

  const startDay = new Date(2025, 4, 1).getDay();
  for (let i = 0; i < startDay; i++) {
    const e = document.createElement('div'); e.className = 'cal-day empty'; cg.appendChild(e);
  }
  for (let d = 1; d <= 31; d++) {
    const el = document.createElement('div'); el.className = 'cal-day';
    if (d < 17) el.classList.add('past');
    if (d === 17) el.classList.add('today');
    el.textContent = d;
    if (d >= 17) {
      el.addEventListener('click', () => {
        document.querySelectorAll('#calGrid .cal-day.sel').forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');
        const s = document.getElementById('sum-date'); if (s) s.textContent = `May ${d}, 2025`;
      });
    }
    cg.appendChild(el);
  }

  tb.innerHTML = '';
  ['11:00','12:00','13:00','14:00','15:00','16:00'].forEach(t => {
    const el = document.createElement('div'); el.className = 'time-slot'; el.textContent = t;
    el.addEventListener('click', () => {
      document.querySelectorAll('#timeBox .time-slot.sel').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      const s = document.getElementById('sum-time'); if (s) s.textContent = t;
    });
    tb.appendChild(el);
  });
}

/* ─────────────────────────────────────────
   BOOKING
───────────────────────────────────────── */
function selWaste(el, name) {
  document.querySelectorAll('.wtype-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  const s = document.getElementById('sum-waste'); if (s) s.textContent = name;
}
function selPartner(el, name) {
  document.querySelectorAll('.partner-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  const s = document.getElementById('sum-partner'); if (s) s.textContent = name;
}
function useLocation() {
  const input = document.getElementById('loc-input');
  const sumLoc = document.getElementById('sum-loc');
  if (input) input.value = 'Jl. Duren Sawit Baru, Jakarta Timur';
  if (sumLoc) sumLoc.textContent = 'Duren Sawit, Jakarta';
  showToast('Location set to Duren Sawit, Jakarta');
}
function initLocInput() {
  const input = document.getElementById('loc-input');
  if (!input) return;
  input.addEventListener('input', () => {
    const s = document.getElementById('sum-loc'); if (s) s.textContent = input.value || '–';
  });
}
function confirmBook() {
  const user = getUser();
  if (!user) { openLogin(); showToast('Please log in to confirm a booking.'); return; }
  const d = document.getElementById('sum-date');
  const p = document.getElementById('sum-partner');
  const w = document.getElementById('sum-waste');
  const t = document.getElementById('sum-time');
  if (!d || d.textContent === '–') { showToast('Please select a pickup date first.'); return; }
  // Save active booking to localStorage for tracking page
  const booking = {
    partner: p ? p.textContent : 'Joko Angkut',
    waste:   w ? w.textContent : 'Residential Recycling',
    time:    t ? t.textContent : '14:00',
    date:    d ? d.textContent : '',
    loc:     (document.getElementById('sum-loc') || {}).textContent || ''
  };
  localStorage.setItem('rs_active_booking', JSON.stringify(booking));
  showToast('✓ Pickup confirmed! Redirecting to tracking…');
  setTimeout(() => { window.location.href = 'pickup-tracking.html'; }, 1200);
}
function saveBook() {
  showToast('Draft saved. You can complete this anytime.');
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  const txt = document.getElementById('toastTxt');
  if (!t || !txt) return;
  txt.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ─────────────────────────────────────────
   KEYBOARD & OUTSIDE CLICK — close modals
───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLogin(); closeCart(); }
});
document.addEventListener('click', e => {
  const lm = document.getElementById('loginModal');
  const cm = document.getElementById('cartModal');
  if (lm && e.target === lm) closeLogin();
  if (cm && e.target === cm) closeCart();
});

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  renderNav();
  revealPage();
  initCounters();
  buildCal();
  initLocInput();
});
