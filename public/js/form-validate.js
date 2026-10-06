/* ============================================================
   form-validate.js — generic, reusable form enhancement
   Handles: live + submit validation, aria-invalid / error text wiring,
   honeypot, loading state, DOM status messages, and submit orchestration
   through FHTH.postLead(). Form-specific bits (field list, payload shape,
   copy) are passed in by the page's init call.

   Exposes: FHTH.validators.{required, email, phone}
            FHTH.enhanceForm(formOrId, options)

   Conventions: each field <input id="X"> pairs with an error element
   <span id="err-X" aria-live="polite">, a submit button #<submitId>, and a
   status region #<statusId> with role="status".
   ============================================================ */
(function (w) {
  'use strict';
  var d = w.document;
  var NS = w.FHTH = w.FHTH || {};

  /* Reusable validators — each returns '' when valid, or an error message. */
  var validators = {
    required: function (msg) {
      return function (v, el) {
        if (el && el.type === 'checkbox') return el.checked ? '' : (msg || 'This field is required.');
        return String(v).trim() ? '' : (msg || 'This field is required.');
      };
    },
    email: function (msg) {
      return function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? '' : (msg || 'Please enter a valid email address.');
      };
    },
    phone: function (min, msg) {
      return function (v) {
        return String(v).replace(/\D/g, '').length >= (min || 10) ? '' : (msg || 'Please enter a valid phone number.');
      };
    }
  };

  function enhanceForm(formOrId, opts) {
    var form = (typeof formOrId === 'string') ? d.getElementById(formOrId) : formOrId;
    if (!form) return null;
    opts = opts || {};

    var fields = opts.fields || [];
    var msgs = opts.messages || {};
    var errPrefix = opts.errorPrefix || 'err-';
    var statusEl = d.getElementById(opts.statusId || 'form-status');
    var submitBtn = d.getElementById(opts.submitId || 'lead-submit');
    var submitLabel = submitBtn ? submitBtn.textContent : '';

    function byId(id) { return d.getElementById(id); }
    function valueOf(el) { return el.type === 'checkbox' ? (el.checked ? 'on' : '') : el.value; }

    function setError(id, msg) {
      var el = byId(id); if (!el) return;
      var err = byId(errPrefix + id);
      if (err) err.textContent = msg;
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    function validateField(f) {
      var el = byId(f.id); if (!el) return true;
      var msg = f.validate(valueOf(el), el);
      setError(f.id, msg);
      return !msg;
    }

    /* Live validation: check on blur (text) / change (select, checkbox);
       once an error is showing, re-check on every input. */
    fields.forEach(function (f) {
      var el = byId(f.id); if (!el) return;
      var evt = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'blur';
      el.addEventListener(evt, function () { validateField(f); });
      el.addEventListener('input', function () {
        var err = byId(errPrefix + f.id);
        if (err && err.textContent) validateField(f);
      });
    });

    function setStatus(kind, text) {
      if (!statusEl) return;
      statusEl.className = 'form-status' + (kind ? ' ' + kind : '');
      statusEl.textContent = text;
    }

    function setLoading(on) {
      if (submitBtn) {
        submitBtn.disabled = on;
        submitBtn.classList.toggle('is-loading', on);
        submitBtn.textContent = on ? (opts.loadingLabel || 'Sending…') : submitLabel;
      }
      if (on) form.setAttribute('aria-busy', 'true');
      else form.removeAttribute('aria-busy');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('', '');

      // Honeypot: if filled, it's a bot — fake success, send nothing.
      if (opts.honeypot && form[opts.honeypot] && form[opts.honeypot].value.trim() !== '') {
        form.reset();
        setStatus('success', msgs.botSuccess || msgs.success || 'Thanks — your message has been sent.');
        return;
      }

      // Validate every field (marks all), keep the first invalid to focus.
      var firstInvalid = null;
      fields.forEach(function (f) {
        if (!validateField(f) && !firstInvalid) firstInvalid = byId(f.id);
      });
      if (firstInvalid) {
        setStatus('error', msgs.fixErrors || 'Please fix the highlighted fields and try again.');
        firstInvalid.focus();
        return;
      }

      var payload = opts.buildPayload ? opts.buildPayload(form) : {};

      // Optional hook: runs after validation passes, before the network call
      // (e.g. render a calculator result from client-side math).
      if (typeof opts.onValid === 'function') { try { opts.onValid(form, payload); } catch (e) {} }

      setLoading(true);
      NS.postLead(payload)
        .then(function (res) {
          if (!res || !res.ok) throw new Error('postLead did not return ok');
          if (opts.resetOnSuccess !== false) {   // calculators keep their inputs + result
            form.reset();
            fields.forEach(function (f) { setError(f.id, ''); });
          }
          setStatus('success', msgs.success || 'Thanks — your message has been sent.');
        })
        .catch(function () {
          setStatus('error', msgs.networkError || 'Something went wrong. Please try again.');
        })
        .then(function () { setLoading(false); });
    });

    return { validateField: validateField, setStatus: setStatus, setLoading: setLoading };
  }

  NS.validators = validators;
  NS.enhanceForm = enhanceForm;
})(window);
