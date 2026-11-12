/* Free consult meeting: talks to the CRM (counter, free times, booking, moving, canceling). */
(function () {
  // The Railway address: kosher filters let it through, unlike new domains.
  var API = 'https://coach-app-production-908f.up.railway.app/api/public/consult';
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]api=local\b/.test(location.search)) API = 'http://localhost:4000/api/public/consult';

  function req(path, opts) {
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return { ok: false }; }).then(function (d) {
        if (!r.ok || d.ok === false) { var e = new Error(d.message || d.error || 'failed'); e.code = d.error; e.data = d; throw e; }
        return d;
      });
    });
  }
  function stored(k) { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } }

  var TZ = 'Asia/Jerusalem';
  var dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
  var time = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var weekday = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, weekday: 'long' });
  var dm = new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: 'numeric', month: 'numeric' });

  window.Consult = {
    get: function (path) { return req(path); },
    post: function (path, body) { return req(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); },
    stored: stored,
    digits: function (s) { return String(s || '').replace(/\D/g, ''); },
    formData: function (form) {
      var o = {};
      Array.prototype.forEach.call(form.elements, function (el) { if (el.name) o[el.name] = el.value.trim(); });
      return o;
    },
    // Whatever the person typed in the guide form fills these in.
    prefill: function (form) {
      var map = { name: 'signedUp', email: 'signedUpEmail', phone: 'signedUpPhone' };
      Object.keys(map).forEach(function (k) { var el = form.elements[k]; if (el && !el.value) el.value = stored(map[k]); });
    },
    dayKey: function (d) { return dayKey.format(d); },
    time: function (d) { return time.format(d); },
    weekday: function (d) { return weekday.format(d); },
    dm: function (d) { return dm.format(d); },
  };
})();
