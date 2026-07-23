/* ============================================================
   calculator-ui.js — wires #calc-form to FHTH.calc + the lead pipeline.
   Call FHTH.initCalculator(config) once the program config is loaded.
   ============================================================ */
(function (w) {
  'use strict';
  var d = w.document;
  var NS = w.FHTH = w.FHTH || {};

  function el(id) { return d.getElementById(id); }
  function val(id) { var e = el(id); return e ? e.value : ''; }
  function numVal(id) { var n = parseFloat(val(id)); return isFinite(n) ? n : 0; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  var GATE = {
    pass: { cls: 'gate-pass', label: 'Likely OK' },
    fail: { cls: 'gate-fail', label: 'Over limit' },
    pending: { cls: 'gate-pending', label: 'Pending verification' }
  };
  function gateRow(name, state, detail) {
    var g = GATE[state] || GATE.pending;
    return '<li><span class="gate-badge ' + g.cls + '">' + g.label + '</span> ' + esc(name) +
      (detail ? ' <span class="gate-detail">' + esc(detail) + '</span>' : '') + '</li>';
  }

  function renderEstimate(c) {
    var out = el('calc-results');
    if (!out) return;
    var m = c.monthly, dti = c.dti, e = c.eligibility;
    var clampNote = c.dpa_clamp === 'ceiling' ? ' (capped at the $35,000 program maximum)'
      : c.dpa_clamp === 'floor' ? ' (raised to the $10,000 program minimum)' : '';
    var fundingLabel = c.funding_option === 'bond' ? 'Bond' : 'TBA';

    var html = '';
    html += '<h3>Your estimate</h3>';

    html += '<div class="calc-headline">' +
      '<span class="calc-figure">' + money(c.dpa) + '</span>' +
      '<span class="calc-figure-label">estimated assistance — a <strong>repayable second mortgage</strong>' + clampNote + '</span>' +
      '</div>';
    html += '<p class="calc-sub">Based on a first mortgage of <strong>' + money(c.first_mortgage) +
      '</strong> (purchase price minus a ' + (Math.round(c.min_down_display * 10) / 10) + '% base down payment of ' + money(c.base_down) + ').</p>';

    // Rate used (from config, by funding option + loan type).
    if (c.rate != null) {
      html += '<p class="calc-sub"><strong>Assumed first-mortgage rate: ' + (c.rate * 100).toFixed(3) + '%</strong> — ' +
        esc(fundingLabel) + ' program, as of ' + esc(c.rate_as_of || '') + '. Rates change daily; your lender confirms the rate at lock.</p>';
    }

    // Monthly PITI.
    html += '<div class="table-wrap"><table class="comparison"><thead><tr><th>Estimated monthly payment</th><th>Amount</th></tr></thead><tbody>';
    html += '<tr><td>Principal &amp; interest</td><td>' + (m.principal_interest == null ? 'Lender-confirmed' : money(m.principal_interest)) + '</td></tr>';
    html += '<tr><td>Mortgage insurance</td><td>' + (m.mortgage_insurance == null ? '<em>Confirmed by your lender</em>' : money(m.mortgage_insurance)) + '</td></tr>';
    html += '<tr><td>Property taxes</td><td>' + money(m.taxes) + '</td></tr>';
    html += '<tr><td>Homeowner&rsquo;s insurance</td><td>' + money(m.insurance) + '</td></tr>';
    html += '<tr><td>HOA</td><td>' + money(m.hoa) + '</td></tr>';
    html += '<tr><td><strong>Estimated total' + (m.mi_estimated ? '' : ' (excl. MI)') + '</strong></td><td><strong>' + money(m.total_piti) + '</strong></td></tr>';
    html += '<tr><td>Hometown Heroes assistance (repayable 2nd mortgage)</td><td><strong>$0/mo</strong></td></tr>';
    html += '</tbody></table></div>';
    if (!m.mi_estimated) {
      html += '<p class="calc-note">Mortgage insurance is <strong>confirmed by your lender</strong> — the current program guide does not publish the MI rate, so it is not included in the total above.</p>';
    }
    html += '<p class="calc-note">The assistance is a <strong>deferred, repayable second mortgage</strong>: it adds <strong>$0 to your monthly payment</strong> and <strong>$0 to your DTI</strong> — but the full ' + money(c.dpa) + ' is due when you sell, refinance, or pay off the first mortgage. It is not a grant and is never forgiven.</p>';

    if (dti.front != null) {
      html += '<p class="calc-note"><strong>Debt-to-income:</strong> ~' + dti.front + '% front-end, ~' + dti.back + '% back-end (AUS-approved limit is 50%; manual underwriting caps at 43%). The repayable second mortgage contributes 0%.</p>';
    } else {
      html += '<p class="calc-note"><strong>Debt-to-income:</strong> add your income and monthly debts above to estimate DTI.</p>';
    }

    // Eligibility gates (funding-aware).
    html += '<h4>Eligibility checks (' + esc(fundingLabel) + ' income basis)</h4><ul class="gate-list">';
    html += gateRow('Household income within county limit', e.income_limit,
      e.income_limit === 'pending' ? '2026 ' + fundingLabel + ' income table not yet loaded' : (e.income_limit_value ? 'limit ' + money(e.income_limit_value) : ''));
    html += gateRow('Purchase price within county limit', e.purchase_price_cap,
      e.purchase_price_cap === 'pending' ? '2026 price limits not yet loaded' : (e.purchase_price_cap_value ? 'limit ' + money(e.purchase_price_cap_value) : ''));
    html += '</ul>';

    // Payback comparison — the site's editorial angle.
    html += '<h4>Repayable vs. forgivable — the trade-off</h4>';
    html += '<div class="proscons-grid">' +
      '<div class="proscons-card cons"><h3>Hometown Heroes (this estimate)</h3><ul class="proscons-list">' +
      '<li><strong>Repayable</strong> second mortgage — never forgiven.</li>' +
      '<li>$0/month while you live there.</li>' +
      '<li>Full ' + money(c.dpa) + ' due at sale, refinance, or payoff.</li>' +
      '</ul></div>' +
      '<div class="proscons-card pros"><h3>County forgivable grant</h3><ul class="proscons-list">' +
      '<li><strong>Forgiven</strong> after 5&ndash;15 years.</li>' +
      '<li>Becomes permanent equity you keep.</li>' +
      '<li>$0 owed once the forgiveness period ends.</li>' +
      '</ul></div></div>';

    html += '<p class="calc-disclaimer">Estimate only. Not a loan approval, commitment to lend, or offer of assistance. Figures are approximate, depend on inputs you provided, and exclude some costs. Actual rate, mortgage insurance, fees, and eligibility are set by the lender and Florida Housing Finance Corporation. Hometown Heroes assistance is a repayable second mortgage, not a grant.</p>';

    out.innerHTML = html;
    out.hidden = false;
  }

  NS.initCalculator = function (config) {
    var form = el('calc-form');
    if (!form || !NS.enhanceForm || !NS.calc) return;

    function minDownDisplay(key) {
      var lt = config.loan_types[key];
      return lt ? lt.min_down_pct * 100 : 0;
    }
    function fundingChoice() { return 'tba'; } // selector added in the funding-option commit

    NS.enhanceForm(form, {
      honeypot: 'company_website',
      submitId: 'calc-submit',
      statusId: 'calc-status',
      resetOnSuccess: false,
      loadingLabel: 'Calculating…',
      fields: [
        { id: 'calc_price', validate: function (v) { return parseFloat(v) > 0 ? '' : 'Enter a purchase price.'; } },
        { id: 'calc_loan_type', validate: NS.validators.required('Select a loan type.') },
        { id: 'first_name', validate: NS.validators.required('Please enter your first name.') },
        { id: 'last_name', validate: NS.validators.required('Please enter your last name.') },
        { id: 'email', validate: NS.validators.email() },
        { id: 'phone', validate: NS.validators.phone(10, 'Please enter a valid phone number (at least 10 digits).') },
        { id: 'consent', validate: NS.validators.required('Please agree to be contacted so we can send your estimate.') }
      ],
      messages: {
        success: 'Your estimate is below. A licensed specialist will follow up to confirm the numbers.',
        botSuccess: 'Your estimate is below.',
        fixErrors: 'Please fix the highlighted fields to see your estimate.',
        networkError: 'Your estimate is shown below, but we could not send your details. Please try again, or call (602) 344-9333.'
      },
      buildPayload: function (form) {
        var input = {
          price: numVal('calc_price'),
          loan_type: val('calc_loan_type'),
          funding_option: fundingChoice(),
          term_years: config.dpa.term_years || 30,
          annual_tax: numVal('calc_tax'),
          annual_insurance: numVal('calc_insurance'),
          monthly_hoa: numVal('calc_hoa'),
          annual_income: numVal('calc_income'),
          monthly_debts: numVal('calc_debts'),
          county: val('calc_county') || null
        };
        var est = NS.calc.estimate(config, input);
        var consentEl = el('calc-consent-text');
        return {
          source: 'calculator',
          page_url: w.location.href,
          submitted_at: new Date().toISOString(),
          contact: {
            first_name: form.first_name.value.trim(),
            last_name: form.last_name.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim()
          },
          profile: { occupation: null, county: input.county, timeline: null },
          calculator: {
            inputs: input,
            funding_option: est.funding_option,
            rate: est.rate,
            rate_as_of: config.rates && config.rates.as_of,
            min_down_display: minDownDisplay(input.loan_type),
            dpa: est.dpa.dpa,
            dpa_clamp: est.dpa.clamp,
            first_mortgage: est.first_mortgage,
            base_down: est.base_down,
            monthly: est.monthly,
            upfront_mortgage_insurance: est.upfront_mortgage_insurance,
            dti: est.dti,
            eligibility: est.eligibility
          },
          consent: { tcpa: form.consent.checked, text: consentEl ? consentEl.textContent.replace(/\s+/g, ' ').trim() : '' },
          meta: NS.getAttribution()
        };
      },
      onValid: function (form, payload) { renderEstimate(payload.calculator); }
    });
  };
})(window);
