function revealPage() {
  document.querySelectorAll('.sr').forEach((el, i) => {
    setTimeout(() => el.classList.add('vis'), i * 55);
  });
}

window.addEventListener('scroll', () => {
  document.querySelectorAll('.sr:not(.vis)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 50) {
      el.classList.add('vis');
    }
  });
});

function setActiveNav() {
  const page = document.body.dataset.page || 'home';
  const map = {
    home: 'nl-home',
    services: 'nl-services',
    how: 'nl-how',
    about: 'nl-about',
  };
  const id = map[page];
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
}

let countersDone = false;

function runCounters() {
  if (countersDone) return;
  countersDone = true;
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = +el.dataset.target;
    const suf    = el.dataset.suf || '';
    let cur      = 0;
    const inc    = target / 55;
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
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) runCounters(); });
  }, { threshold: 0.4 });
  obs.observe(banner);
}


const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildCal() {
  const cg = document.getElementById('calGrid');
  const tb = document.getElementById('timeBox');
  if (!cg || !tb) return;


  cg.innerHTML = '';
  DOW.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-dow';
    el.textContent = d;
    cg.appendChild(el);
  });

  const startDay = new Date(2026, 19, 1).getDay();
  for (let i = 0; i < startDay; i++) {
    const e = document.createElement('div');
    e.className = 'cal-day empty';
    cg.appendChild(e);
  }
  for (let d = 1; d <= 31; d++) {
    const el = document.createElement('div');
    el.className = 'cal-day';
    if (d < 17) el.classList.add('past');
    if (d === 17) el.classList.add('today');
    el.textContent = d;
    if (d >= 17) {
      el.addEventListener('click', () => {
        document.querySelectorAll('#calGrid .cal-day.sel').forEach(x => x.classList.remove('sel'));
        el.classList.add('sel');
        const sumDate = document.getElementById('sum-date');
        if (sumDate) sumDate.textContent = `May ${d}, 2025`;
      });
    }
    cg.appendChild(el);
  }

  tb.innerHTML = '';
  ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].forEach(t => {
    const el = document.createElement('div');
    el.className = 'time-slot';
    el.textContent = t;
    el.addEventListener('click', () => {
      document.querySelectorAll('#timeBox .time-slot.sel').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      const sumTime = document.getElementById('sum-time');
      if (sumTime) sumTime.textContent = t;
    });
    tb.appendChild(el);
  });
}

function selWaste(el, name) {
  document.querySelectorAll('.wtype-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  const el2 = document.getElementById('sum-waste');
  if (el2) el2.textContent = name;
}

function selPartner(el, name) {
  document.querySelectorAll('.partner-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  const el2 = document.getElementById('sum-partner');
  if (el2) el2.textContent = name;
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
    const sumLoc = document.getElementById('sum-loc');
    if (sumLoc) sumLoc.textContent = input.value || '–';
  });
}

function confirmBook() {
  const d = document.getElementById('sum-date');
  const p = document.getElementById('sum-partner');
  if (!d || d.textContent === '–') {
    showToast('Please select a pickup date first.');
    return;
  }
  const partner = p ? p.textContent : 'your partner';
  showToast(`✓ Pickup confirmed! ${partner} will contact you soon.`);
}

function saveBook() {
  showToast('Draft saved. You can complete this anytime.');
}

function addCart(name) {
  showToast(`${name} added to your cart!`);
}


function showToast(msg) {
  const t   = document.getElementById('toast');
  const txt = document.getElementById('toastTxt');
  if (!t || !txt) return;
  txt.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  revealPage();
  initCounters();
  buildCal();
  initLocInput();
});