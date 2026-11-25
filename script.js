/* SalesGrid local marketing experience — all interactive demos run without a server. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fixed navigation + reading progress.
  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  let scheduled = false;
  function updateScroll() {
    const y = window.scrollY || 0;
    header.classList.toggle('scrolled', y > 35);
    const height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.width = `${Math.min(100, 100 * y / height)}%`;
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  updateScroll();

  const menuButton = $('#menuToggle');
  const navLinks = $('#navLinks');
  function closeMenu() { navLinks.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); }
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
  $$('#navLinks a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => { if (!header.contains(e.target)) closeMenu(); });

  // Scroll reveals: fallback stays visible in browsers without observers.
  const revealElements = $$('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealElements.forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    revealElements.forEach(el => observer.observe(el));
  }

  // Hero interactive light + very subtle movement. No motion for reduced-motion users.
  const heroPanel = $('#heroPanel');
  if (heroPanel && !reduceMotion && window.matchMedia('(min-width: 1001px)').matches) {
    heroPanel.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const bounds = heroPanel.getBoundingClientRect();
      const x = (e.clientX - bounds.left) / bounds.width - .5;
      const y = (e.clientY - bounds.top) / bounds.height - .5;
      heroPanel.style.transform = `perspective(1000px) rotateY(${-5 + x * 5}deg) rotateX(${3 - y * 4}deg)`;
      heroPanel.style.setProperty('--mx', `${(x + .5) * 100}%`);
      heroPanel.style.setProperty('--my', `${(y + .5) * 100}%`);
    });
    heroPanel.addEventListener('pointerleave', () => { heroPanel.style.transform = ''; });
  }

  // Demonstration data: number cards in the hero are explicitly illustrative.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const heroCounts = $$('.count-up');
    heroCounts.forEach(el => el.textContent = '0');
    const countObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      heroCounts.forEach(el => {
        const target = Number(el.dataset.target);
        const started = performance.now();
        const duration = 920;
        function tick(now) {
          const pct = Math.min(1, (now - started) / duration);
          const eased = 1 - Math.pow(1 - pct, 4);
          el.textContent = String(Math.round(target * eased));
          if (pct < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
      countObserver.disconnect();
    }, { threshold: .1 });
    countObserver.observe(heroPanel);
  }

  // Accessible keyboard-friendly intelligence lab tabs.
  const labTabs = $$('.lab-tab');
  const panels = { stock: $('#panelStock'), coach: $('#panelCoach') };
  function activateLab(tab, focus = false) {
    const name = tab.dataset.lab;
    labTabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    Object.entries(panels).forEach(([key, panel]) => {
      const active = key === name;
      panel.hidden = !active;
      panel.classList.toggle('hidden', !active);
    });
    if (focus) tab.focus();
  }
  labTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateLab(tab));
    tab.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      let next = e.key === 'Home' ? 0 : e.key === 'End' ? labTabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + labTabs.length) % labTabs.length;
      activateLab(labTabs[next], true);
    });
  });

  // FreshStock simulation: intentionally simple demonstrative rule.
  // Historical average - 35% of recent unsold returns, capped to available stock.
  // The group's actual chosen algorithm must be determined through design/testing.
  const salesRange = $('#salesRange');
  const returnsRange = $('#returnsRange');
  const availableRange = $('#availableRange');
  const approvalStatus = $('#approvalStatus');
  const approveButton = $('#approveButton');
  let approved = false;
  function setRangeFill(range) {
    const min = Number(range.min), max = Number(range.max), value = Number(range.value);
    range.style.setProperty('--fill', `${(value - min) / (max - min) * 100}%`);
  }
  function refreshStock(changed = false) {
    const average = Number(salesRange.value);
    const returns = Number(returnsRange.value);
    const available = Number(availableRange.value);
    const unconstrained = Math.max(0, Math.round(average - returns * .35));
    const recommendation = Math.min(unconstrained, available);
    $('#salesValue').textContent = String(average);
    $('#returnsValue').textContent = String(returns);
    $('#availableValue').textContent = String(available);
    $('#recommendValue').textContent = String(recommendation);
    $('#baseBar').style.height = `${Math.max(8, 100 * average / 280)}%`;
    $('#recBar').style.height = `${Math.max(8, 100 * recommendation / 280)}%`;
    [salesRange, returnsRange, availableRange].forEach(setRangeFill);
    const reason = available < unconstrained
      ? `Illustrative adjustment: ${average} average sales − ${Math.round(returns * .35)} return allowance; stock available caps the plan at ${available}.`
      : `Illustrative adjustment: ${average} average sales − ${Math.round(returns * .35)} return allowance. Stock availability has been checked.`;
    $('#recommendReason').textContent = reason;
    if (changed) approved = false;
    approvalStatus.classList.toggle('approved', approved);
    approvalStatus.innerHTML = approved ? '<span></span> Approved demo' : '<span></span> Pending review';
    approveButton.classList.toggle('approved', approved);
    approveButton.innerHTML = approved
      ? '<svg class="icon"><use href="#i-check"></use></svg> Sample plan approved'
      : '<svg class="icon"><use href="#i-check"></use></svg> Approve sample loading plan';
  }
  [salesRange, returnsRange, availableRange].forEach(range => range.addEventListener('input', () => refreshStock(true)));
  approveButton.addEventListener('click', () => { approved = true; refreshStock(); });
  refreshStock();

  // Smart Coach sample fictional accounts; suggestions have explicit rationale.
  const coachExamples = {
    shopA: {
      product: 'Consider extra bread', productReason: 'Past orders suggest steady demand for bread on this route.',
      caution: 'Check recent bun returns', cautionReason: 'Previous visit recorded unsold buns. Review quantity first.', target: '68% of today\'s target'
    },
    shopB: {
      product: 'Review sandwich bun demand', productReason: 'Recent orders show a recurring preference for sandwich buns.',
      caution: 'Review outstanding credit', cautionReason: 'Account balance may require a manager review before confirming.', target: '74% of today\'s target'
    },
    shopC: {
      product: 'Ask about the usual assortment', productReason: 'A repeat purchase pattern suggests checking common products first.',
      caution: 'Confirm return quantities', cautionReason: 'Recent unsold items were recorded. Avoid assuming demand.', target: '82% of today\'s target'
    }
  };
  $('#customerSelect').addEventListener('change', e => {
    const sample = coachExamples[e.target.value];
    if (!sample) return;
    $('#coachProduct').textContent = sample.product;
    $('#coachProductReason').textContent = sample.productReason;
    $('#coachCaution').textContent = sample.caution;
    $('#coachCautionReason').textContent = sample.cautionReason;
    $('#coachTarget').textContent = sample.target;
  });

  // Clickable day-in-the-life flow; all copy is derived from the proposed system workflow.
  const workflows = [
    { role: 'SALES MANAGER', title: 'Map out the day.', desc: 'Assign a daily route and customer list to each sales representative.', visual: '<div class="scene-list"><div><span>Route 01 · North</span><b>Assigned</b></div><div><span>Route 02 · Central</span><b>Assigned</b></div><div><span>Route 03 · South</span><b>Ready</b></div></div>' },
    { role: 'REP + WAREHOUSE', title: 'Plan the van load.', desc: 'Review FreshStock estimates and approve a loading plan before departure.', visual: '<div class="scene-stack"><div style="--r:-6deg"><strong>120</strong><small>SALES AVG.</small></div><span>→</span><div style="--r:5deg"><strong>114</strong><small>SUGGESTED</small></div></div>' },
    { role: 'SALES REPRESENTATIVE', title: 'Visit. Check in. Sell.', desc: 'Record customer visits, credit-aware orders, returns and collections—even during temporary connectivity loss.', visual: '<div class="scene-mobile"><div><span>Customer visit</span><b>Checked in ✓</b></div><div><span>Order status</span><b>Saved offline</b></div><div><span>Credit</span><b>Review shown</b></div></div>' },
    { role: 'FIELD + DISPATCH', title: 'Bring every team in sync.', desc: 'When connectivity returns, orders synchronize so the warehouse can see confirmed orders and update dispatch status.', visual: '<div class="scene-sync"><span><svg class="icon"><use href="#i-route"></use></svg> Field app</span><i>↔</i><span><svg class="icon"><use href="#i-box"></use></svg> Warehouse</span></div>' },
    { role: 'MANAGEMENT + DECISION SUPPORT', title: 'Review and improve.', desc: 'Compare recorded sales and unsold returns with loading estimates to inform the next route.', visual: '<div class="scene-report"><i style="--height:46%"></i><i style="--height:72%"></i><i style="--height:62%"></i><i style="--height:90%"></i><i style="--height:76%"></i><i style="--height:99%"></i><i style="--height:85%"></i></div>' }
  ];
  const stepButtons = $$('.workflow-step');
  let currentStep = 0;
  const flowScene = $('#flowScene');
  function showStep(index, focus = false) {
    currentStep = Math.max(0, Math.min(workflows.length - 1, index));
    const data = workflows[currentStep];
    stepButtons.forEach((button, i) => {
      const selected = i === currentStep;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $('#sceneStep').textContent = `STEP 0${currentStep + 1} / 05`;
    $('#sceneRole').textContent = data.role;
    $('#sceneTitle').textContent = data.title;
    $('#sceneDescription').textContent = data.desc;
    $('#sceneVisual').innerHTML = data.visual; // authored static content only
    $('#flowPrev').disabled = currentStep === 0;
    $('#flowNext').disabled = currentStep === workflows.length - 1;
    flowScene.setAttribute('aria-labelledby', `flowTab${currentStep}`);
    const body = $('.scene-body');
    body.style.animation = 'none'; void body.offsetWidth; body.style.animation = '';
    if (focus) stepButtons[currentStep].focus();
  }
  stepButtons.forEach((button, i) => {
    button.addEventListener('click', () => showStep(i));
    button.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      e.preventDefault();
      showStep(e.key === 'Home' ? 0 : e.key === 'End' ? workflows.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + workflows.length) % workflows.length, true);
    });
  });
  $('#flowPrev').addEventListener('click', () => showStep(currentStep - 1));
  $('#flowNext').addEventListener('click', () => showStep(currentStep + 1));

  // Local-only CTA (not a real lead collection endpoint).
  // No private information is transmitted by this demo; inputs remain on this device.
  const storageKey = 'salesgrid-local-demo-enquiries-v1';
  const form = $('#contactForm');
  const message = $('#formMessage');
  let inMemoryEntries = []; // Fallback for browser modes that block localStorage.
  function getEntries() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch (_) { return inMemoryEntries; }
  }
  function flashMessage(copy, error = false) {
    message.textContent = copy;
    message.classList.toggle('error', error);
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const entry = {
      submitted_at: new Date().toISOString(),
      name: (data.get('name') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      organisation: (data.get('organisation') || '').toString().trim(),
      role: (data.get('role') || '').toString(),
      message: (data.get('message') || '').toString().trim()
    };
    const entries = getEntries();
    entries.push(entry);
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
      flashMessage('Saved locally for demonstration. Nothing was sent to SalesGrid or a server.');
      form.reset();
    } catch (_) {
      inMemoryEntries = entries;
      flashMessage('Saved in this page for the demo (browser storage is restricted). Export it before closing the tab.');
      form.reset();
    }
  });
  $('#exportEnquiries').addEventListener('click', () => {
    const entries = getEntries();
    if (!entries.length) { flashMessage('No demo enquiries saved yet.', true); return; }
    const headings = ['submitted_at','name','email','organisation','role','message'];
    function csvCell(value) {
      let str = String(value == null ? '' : value);
      // Prevent spreadsheet formula execution when a CSV is opened.
      if (/^[\s]*[=+@-]/.test(str)) str = "'" + str;
      return '"' + str.replace(/"/g,'""') + '"';
    }
    const csv = [headings.join(','), ...entries.map(row => headings.map(field => csvCell(row[field])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'salesgrid-local-demo-enquiries.csv'; link.style.display = 'none';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    flashMessage(`${entries.length} demo entr${entries.length === 1 ? 'y' : 'ies'} exported to CSV.`);
  });
  $('#clearEnquiries').addEventListener('click', () => {
    const entries = getEntries();
    if (!entries.length) { flashMessage('There are no saved demo enquiries.'); return; }
    if (!window.confirm(`Delete ${entries.length} locally saved demo entr${entries.length === 1 ? 'y' : 'ies'} from this browser?`)) return;
    inMemoryEntries = [];
    try { localStorage.removeItem(storageKey); } catch (_) { /* in-memory mode */ }
    flashMessage('Saved demo entries cleared.');
  });
})();
