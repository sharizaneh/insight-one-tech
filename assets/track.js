/* Insight One Tech — conversion tracking (no personal data collected).
   Sends events to GA4 (gtag) when present, and always to window.dataLayer.
   Events:
     cta_click          {cta, cta_text, cta_location, page}
     template_download  {file_type, page}
     contact_click      {method, page}            (mailto / tel)
     form_start         {form, page}              (first field focused)
     generate_lead      {form, page}              (Squarespace form success = primary conversion)
   Load once per page:  <script src="https://sharizaneh.github.io/insight-one-tech/assets/track.js?v=1" defer></script> */
(function () {
  if (window.__ioTrack) return; window.__ioTrack = 1;
  window.dataLayer = window.dataLayer || [];
  var page = location.pathname.replace(/\/$/, '') || '/';

  function send(name, params) {
    params = params || {};
    params.page = page;
    try { window.dataLayer.push(Object.assign({ event: name }, params)); } catch (_) {}
    try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch (_) {}
  }
  window.ioTrack = send;

  function where(el) {
    var s = el.closest('section,[id],header,footer,nav');
    if (!s) return 'page';
    if (s.tagName === 'HEADER' || s.tagName === 'NAV') return 'nav';
    if (s.tagName === 'FOOTER') return 'footer';
    return s.id || s.getAttribute('data-section-id') || s.tagName.toLowerCase();
  }

  function classify(a) {
    var href = (a.getAttribute('href') || '').trim();
    var text = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    var low = (href + ' ' + text).toLowerCase();
    if (/^mailto:/i.test(href)) return ['contact_click', { method: 'email' }];
    if (/^tel:/i.test(href)) return ['contact_click', { method: 'phone' }];
    if (/\.xlsx(\?|$)|\.csv(\?|$)|^data:text\/csv/i.test(href) || a.hasAttribute('download') && /template/.test(low))
      return ['template_download', { file_type: /xlsx/i.test(href) ? 'xlsx' : 'csv' }];
    var cta = null;
    if (/assessment|book|discovery|pilot|get started|request|contact/.test(low) || /\/contact\b/.test(href)) cta = 'assessment';
    else if (/how-it-works|how it works/.test(low)) cta = 'how_it_works';
    else if (/\/platform\b/.test(href)) cta = 'platform';
    else if (/\/demo\b|see the demo|demo/.test(low)) cta = 'demo';
    else if (/data-template|template/.test(low)) cta = 'template_page';
    if (!cta) return null;
    return ['cta_click', { cta: cta, cta_text: text, cta_location: where(a) }];
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href],button');
    if (!a || a.tagName !== 'A') return;
    var r = classify(a);
    if (r) send(r[0], r[1]);
  }, true);

  // Squarespace forms: form_start on first focus, generate_lead when the success message appears.
  var started = typeof WeakSet === 'function' ? new WeakSet() : null;
  document.addEventListener('focusin', function (e) {
    var f = e.target.closest && e.target.closest('form');
    if (!f || (started && started.has(f))) return;
    if (started) started.add(f);
    send('form_start', { form: formName(f) });
  });
  function formName(f) {
    var h = f.closest('section') && f.closest('section').querySelector('h1,h2,h3');
    return (f.getAttribute('aria-label') || (h && h.textContent) || 'form').replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  var sent = false;
  function checkSuccess() {
    if (sent) return;
    var ok = document.querySelector('.form-submission-text:not(.hidden), .form-submission-html:not(.hidden), [data-form-submitted="true"]');
    if (ok && ok.offsetParent !== null) {
      sent = true;
      send('generate_lead', { form: 'contact', value: 1, currency: 'CAD' });
    }
  }
  if ('MutationObserver' in window) {
    new MutationObserver(checkSuccess).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
  }
})();
