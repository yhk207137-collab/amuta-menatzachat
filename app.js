/* Sign-up form → CRM contacts + Google Sheet backup (via Apps Script web app), scroll reveals, sticky CTA. */
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
  const nameIn = form.elements.name, emailIn = form.elements.email;
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
  [nameIn, emailIn].forEach(i => i.addEventListener('input', () => { i.removeAttribute('aria-invalid'); errBox.hidden = true; }));
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
    done.querySelector('[data-share]').href = 'https://wa.me/?text=' + encodeURIComponent('מצאתי מייל שבועי קצר עם כלים אמיתיים לשיווק, פרסום וגיוס כספים לעמותות. שווה להצטרף: ' + url);
    done.hidden = false; done.focus({ preventScroll: true });
    const r = done.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight) window.scrollBy({ top: r.top - 90, behavior: 'smooth' });
    if (window.stageCelebrate) window.stageCelebrate(name);
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
      return fail('כדי להירשם צריך לסמן את תיבת האישור לקבלת המייל', agreeIn);
    }
    if (form.elements.website.value) return showDone(name); // bot
    sending = true; btn.setAttribute('aria-busy', 'true'); errBox.hidden = true;
    try {
      // The exact wording the person agreed to is stored with their contact as proof of consent.
      const consent = form.querySelector('[data-consent-text]').textContent.replace(/\s+/g, ' ').trim();
      const body = new URLSearchParams({ name, email, source, page: location.href.slice(0, 200), list: LIST, consent, agree: 'yes', vid });
      const post = async (url) => {
        const res = await fetch(url, { method: 'POST', body });
        const data = await res.json().catch(() => ({ ok: res.ok }));
        if (!data.ok) throw new Error(data.error || 'failed');
      };
      // Either destination is enough; the other one is a backup.
      const results = await Promise.allSettled([post(CRM_ENDPOINT), post(ENDPOINT)]);
      if (!results.some((r) => r.status === 'fulfilled')) throw new Error('failed');
      try { localStorage.setItem('signedUp', name); } catch (_) {}
      showDone(name);
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

  // sticky CTA on mobile once the hero form is off screen (and not after signing up)
  const sticky = document.querySelector('[data-sticky]');
  new IntersectionObserver(([en]) => sticky.classList.toggle('on', !en.isIntersecting && !form.hidden && en.boundingClientRect.top < 0))
    .observe(document.getElementById('join'));
})();
