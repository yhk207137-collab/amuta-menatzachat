/* Guide sign-up form → CRM contacts + Google Sheet backup (via Apps Script web app), scroll reveals, sticky CTA. */
(function () {
  // Apps Script web-app URL (Deploy → Web app → URL ending in /exec)
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyFUd9tqSYrMLyESupMnim3WPqR7NYX4tC6zbeNpuh9QOF0Hil6xjjPtKsa3J7ocom3NQ/exec';
  // The CRM's mailing list (contacts + welcome email)
  const CRM_ENDPOINT = 'https://coach-app-production-908f.up.railway.app/api/public/subscribe';
  const LIST = 'המדריך לעמותה מנצחת';

  const form = document.querySelector('[data-form]');
  const done = document.querySelector('[data-done]');
  const errBox = form.querySelector('[data-error]');
  const hint = form.querySelector('[data-hint]');
  const btn = form.querySelector('button[type=submit]');
  const nameIn = form.elements.name, emailIn = form.elements.email, phoneIn = form.elements.phone;
  const qs = new URLSearchParams(location.search);
  const source = qs.get('src') || qs.get('utm_source') || (document.referrer ? new URL(document.referrer).hostname : 'direct');

  // Visit counter for the CRM's tracking page: one tiny image per page view. The random browser id
  // lets a later sign-up, or an email link (ys=), attach these visits to the right contact.
  const VISIT_PIXEL = 'https://coach-app-production-908f.up.railway.app/api/t/v.gif';
  const newId = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(36).padStart(2, '0')).join('');
  let vid;
  try {
    vid = localStorage.getItem('vid');
    if (!/^[A-Za-z0-9_-]{8,40}$/.test(vid || '')) { vid = newId(); localStorage.setItem('vid', vid); }
  } catch (_) { vid = newId(); }
  const fromEmail = qs.get('ys') || '';
  if (fromEmail) { // keep the email's id out of links people copy and share
    qs.delete('ys');
    history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
  }
  const refHost = document.referrer ? new URL(document.referrer).hostname : '';
  new Image().src = VISIT_PIXEL + '?' + new URLSearchParams({
    v: vid, p: location.host + location.pathname, s: qs.get('src') || qs.get('utm_source') || '',
    r: refHost === location.hostname ? '' : refHost, e: fromEmail, t: Date.now(),
  });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // common typos → suggestion
  const FIX = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmal.com': 'gmail.com',
    'walla.co': 'walla.co.il', 'wala.co.il': 'walla.co.il', 'hotmial.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'yaho.com': 'yahoo.com', 'outlok.com': 'outlook.com', 'netvision.net': 'netvision.net.il' };
  function suggest() {
    const v = emailIn.value.trim().toLowerCase(), at = v.lastIndexOf('@');
    const dom = at > 0 ? v.slice(at + 1) : '', fix = FIX[dom];
    if (!fix) { hint.hidden = true; return; }
    const better = v.slice(0, at + 1) + fix;
    hint.innerHTML = 'התכוונת ל־<button type="button" dir="ltr"></button>?';
    const b = hint.querySelector('button'); b.textContent = better;
    b.onclick = () => { emailIn.value = better; hint.hidden = true; emailIn.focus(); };
    hint.hidden = false;
  }
  emailIn.addEventListener('blur', suggest);

  // Phone is optional. A filled number gets a light check for an Israeli number; one that doesn't
  // look right is pointed out once, and a second click sends it as typed, so it never blocks a sign-up.
  const ISRAELI_PHONE = /^(?:\+?972|0)(5\d{8}|7\d{8}|[23489]\d{7})$/;
  function phoneValue() {
    const raw = phoneIn.value.trim();
    if (!raw) return { value: '', ok: true };
    const m = raw.replace(/[\s\-().]/g, '').match(ISRAELI_PHONE);
    if (!m) return { value: raw.slice(0, 20), ok: false };
    const n = '0' + m[1]; // 0501234567 → 050-1234567, 021234567 → 02-1234567
    return { value: n.length === 10 ? n.slice(0, 3) + '-' + n.slice(3) : n.slice(0, 2) + '-' + n.slice(2), ok: true };
  }
  let phoneWarned = null;

  [nameIn, emailIn, phoneIn].forEach(i => i.addEventListener('input', () => { i.removeAttribute('aria-invalid'); errBox.hidden = true; }));
  const agreeIn = form.elements.agree, consentLabel = form.querySelector('.consent');
  agreeIn.addEventListener('change', () => { consentLabel.removeAttribute('aria-invalid'); errBox.hidden = true; });

  function fail(msg, field) {
    errBox.textContent = msg; errBox.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }

  function showDone(name) {
    form.hidden = true;
    done.querySelector('[data-done-name]').textContent = name.split(' ')[0] || name;
    const url = location.origin + location.pathname + '?src=share';
    done.querySelector('[data-share]').href = 'https://wa.me/?text=' + encodeURIComponent('מצאתי מדריך חינם למנהלי עמותות: איך להפסיק לכבות שריפות, להפוך תורמים לשותפים אמיתיים ולבנות עמותה יציבה ומסודרת. שווה לקבל: ' + url);
    done.hidden = false; done.focus({ preventScroll: true });
    const r = done.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight) window.scrollBy({ top: r.top - 90, behavior: 'smooth' });
  }

  let sending = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const name = nameIn.value.trim().replace(/\s+/g, ' '), email = emailIn.value.trim().toLowerCase();
    if (name.length < 2) return fail('נא לכתוב שם מלא', nameIn);
    if (!EMAIL_RE.test(email)) return fail('נראה שכתובת המייל לא תקינה', emailIn);
    if (!agreeIn.checked) {
      consentLabel.setAttribute('aria-invalid', 'true');
      return fail('כדי לקבל את המדריך צריך לסמן את תיבת האישור', agreeIn);
    }
    const phone = phoneValue();
    if (!phone.ok && phoneWarned !== phone.value) {
      phoneWarned = phone.value;
      return fail('המספר לא נראה כמו טלפון ישראלי. אפשר לתקן אותו, למחוק אותו, או ללחוץ שוב כדי לשלוח כמו שהוא.', phoneIn);
    }
    if (phone.ok && phone.value) phoneIn.value = phone.value;
    if (form.elements.website.value) return showDone(name); // bot
    sending = true; btn.setAttribute('aria-busy', 'true'); errBox.hidden = true;
    try {
      // The exact wording the person agreed to is stored with their contact as proof of consent.
      const consent = form.querySelector('[data-consent-text]').textContent.replace(/\s+/g, ' ').trim();
      const body = new URLSearchParams({ name, email, phone: phone.value, source, page: location.href.slice(0, 200), list: LIST, consent, agree: 'yes', vid });
      const post = async (url) => {
        // keepalive: the slower one keeps going after the page has moved on.
        const res = await fetch(url, { method: 'POST', body, keepalive: true });
        const data = await res.json().catch(() => ({ ok: res.ok }));
        if (!data.ok) throw new Error(data.error || 'failed');
      };
      // Either destination is enough, so the next page comes up as soon as the first one confirms.
      await new Promise((resolve, reject) => {
        let left = 2;
        [post(CRM_ENDPOINT), post(ENDPOINT)].forEach((sent) => sent.then(resolve, () => { if (--left === 0) reject(new Error('failed')); }));
      });
      try { localStorage.setItem('signedUp', name); } catch (_) {}
      location.assign('thank-you.html');
    } catch (err) {
      fail('משהו השתבש בשליחה. נסו שוב בעוד רגע, או שלחו לי הודעה בוואטסאפ: 050-4167903');
    } finally {
      sending = false; btn.removeAttribute('aria-busy');
    }
  });

  // "join" links from lower on the page → back to the form, focused
  document.querySelectorAll('a[href="#join"]').forEach(a => a.addEventListener('click', ev => {
    ev.preventDefault();
    document.getElementById('join').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { if (!form.hidden) nameIn.focus({ preventScroll: true }); }, 600);
  }));

  // scroll reveals (staggered inside a group)
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, grp = el.closest('[data-reveal-group]');
    const delay = grp ? [...grp.querySelectorAll('[data-reveal]')].indexOf(el) * 450 : 0;
    setTimeout(() => el.classList.add('in'), delay);
    io.unobserve(el);
  }), { threshold: .25 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  // sticky CTA on mobile: after the top button scrolls away, until the form at the end comes into view
  const sticky = document.querySelector('[data-sticky]');
  const seen = { top: true, form: false };
  const update = () => sticky.classList.toggle('on', !seen.top && !seen.form && !form.hidden);
  new IntersectionObserver(([en]) => { seen.top = en.isIntersecting || en.boundingClientRect.top > 0; update(); })
    .observe(document.querySelector('.hero-cta'));
  new IntersectionObserver(([en]) => { seen.form = en.isIntersecting; update(); })
    .observe(document.getElementById('join'));
})();
