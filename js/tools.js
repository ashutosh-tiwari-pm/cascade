// ============================================================
// Cascade Tools Manager
// Handles tool connections + data pulling
// Real MCP integrations + demo mode fallback
// ============================================================

window.CascadeTools = (() => {

  // Tool registry
  const TOOLS = [
    {
      id: 'github',
      name: 'GitHub',
      icon: '🐙',
      color: '#6E40C9',
      bg: 'rgba(110,64,201,0.12)',
      description: 'PRs, issues, releases',
      connectUrl: 'https://github.com/login/oauth/authorize',
      demoData: {
        summary: '12 PRs merged · 3 releases deployed · 0 incidents',
        items: [
          'Merged: Payment v2 — reduces checkout time 40% (#847)',
          'Merged: Mobile nav redesign (#851, #852, #853)',
          'Released: v2.4.1 to production (hotfix: cart bug)',
          'Released: v2.5.0-beta to staging',
          'Closed 18 issues this week',
          'Open: 3 PRs awaiting review (auth, search, API)',
          'CI/CD: 94% pass rate (2 flaky tests flagged)',
        ]
      }
    },
    {
      id: 'jira',
      name: 'Jira',
      icon: '🎯',
      color: '#0052CC',
      bg: 'rgba(0,82,204,0.12)',
      description: 'Sprints, tickets, blockers',
      connectUrl: 'https://auth.atlassian.com/authorize',
      demoData: {
        summary: '34 tickets closed · Sprint 24 at 89% · 4 blocked',
        items: [
          'Sprint 24: 34/38 story points completed (89%)',
          'Shipped: PROD-847 Payment flow v2',
          'Shipped: PROD-831 Search performance improvements',
          'In progress: PROD-860 API v3 migration (60% done)',
          'Blocked: PROD-855 — waiting on Design sign-off',
          'Blocked: PROD-858 — external dependency (Stripe)',
          'Carry-over: 4 tickets → Sprint 25',
          'New bugs: 6 opened, 8 resolved (net -2)',
        ]
      }
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: '💬',
      color: '#4A154B',
      bg: 'rgba(74,21,75,0.15)',
      description: 'Decisions, blockers, threads',
      connectUrl: 'https://slack.com/oauth/v2/authorize',
      demoData: {
        summary: '2 key decisions · 1 escalation · 47 mentions',
        items: [
          'Decision: API v3 deprecation date moved to Q4 (not Q3)',
          'Decision: Mobile app to use React Native, not Flutter',
          'Escalation: Payment provider SLA breach — resolved in 4hrs',
          'Key thread: Pricing model discussion (12 participants)',
          '#engineering: 3 incidents discussed, all resolved',
          '#product: Roadmap Q3 update shared and approved',
        ]
      }
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: '📝',
      color: '#000000',
      bg: 'rgba(255,255,255,0.06)',
      description: 'Docs, specs, roadmap',
      connectUrl: 'https://api.notion.com/v1/oauth/authorize',
      demoData: {
        summary: '3 pages updated · 1 PRD shipped · Roadmap revised',
        items: [
          'Updated: API v3 Technical Spec (major revision)',
          'Updated: Q3 Product Roadmap — Feature X moved to Q4',
          'Published: Mobile App PRD v1.0 (ready for engineering)',
          'Created: Sprint 25 planning doc',
          'Database: 12 new user research entries added',
        ]
      }
    },
    {
      id: 'linear',
      name: 'Linear',
      icon: '⚡',
      color: '#5E6AD2',
      bg: 'rgba(94,106,210,0.12)',
      description: 'Cycles, issues, velocity',
      connectUrl: 'https://linear.app/oauth/authorize',
      demoData: {
        summary: 'Cycle 12: 28 issues closed · 94% completion',
        items: [
          'Cycle 12 complete: 28/30 issues (93% velocity)',
          'Shipped: New onboarding flow (ENG-234, ENG-235)',
          'Shipped: Dashboard redesign Phase 1',
          'In progress: Real-time collaboration feature',
          'Roadmap: 3 initiatives updated',
        ]
      }
    },
    {
      id: 'gmail',
      name: 'Gmail',
      icon: '📧',
      color: '#EA4335',
      bg: 'rgba(234,67,53,0.1)',
      description: 'Stakeholder threads, approvals',
      connectUrl: 'https://accounts.google.com/o/oauth2/auth',
      demoData: {
        summary: '3 key threads · 2 approvals · 1 escalation',
        items: [
          'Approval received: Q3 roadmap (from CPO)',
          'Approval received: Budget for UX research ($15K)',
          'Escalation: Enterprise client asking for SOC2 report',
          'Key thread: Partnership discussion with [Company X]',
          'Thread: Legal review of Terms of Service update',
        ]
      }
    },
    {
      id: 'teams',
      name: 'MS Teams',
      icon: '🪟',
      color: '#4F52B2',
      bg: 'rgba(79,82,178,0.12)',
      description: 'Channel updates, decisions, meetings',
      connectUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      demoData: {
        summary: '4 channel updates · 3 decisions · 2 meeting summaries',
        items: [
          'Decision (General): Q4 hiring plan approved — 3 new engineers',
          'Decision (Product): Feature Y deprioritised in favour of API stability',
          'Meeting summary: Sprint review — velocity up 18% vs last sprint',
          'Meeting summary: Stakeholder sync — timeline confirmed with client',
          '#engineering: Azure deployment pipeline updated to v3',
          '#product: Competitor analysis doc shared and reviewed',
          'Action item: Marcus to set up staging environment by Friday',
        ]
      }
    },
    {
      id: 'outlook',
      name: 'Outlook',
      icon: '📨',
      color: '#0078D4',
      bg: 'rgba(0,120,212,0.1)',
      description: 'Executive emails, approvals, threads',
      connectUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      demoData: {
        summary: '2 approvals · 1 escalation · 5 key threads',
        items: [
          'Approval: CTO signed off on infrastructure upgrade ($40K)',
          'Approval: Legal cleared new data processing agreement',
          'Escalation: Enterprise client TechFlow flagged SLA concern',
          'Thread: Q3 board update draft — 3 rounds of feedback',
          'Thread: Renewal negotiation with Datadog — 20% discount agreed',
          'Thread: Candidate interviews — 2 offers extended this week',
        ]
      }
    },
    {
      id: 'azuredevops',
      name: 'Azure DevOps',
      icon: '☁️',
      color: '#0078D4',
      bg: 'rgba(0,120,212,0.12)',
      description: 'Work items, pipelines, sprints',
      connectUrl: 'https://app.vssps.visualstudio.com/oauth2/authorize',
      demoData: {
        summary: 'Sprint 14: 91% complete · 3 pipelines deployed · 0 failed',
        items: [
          'Sprint 14: 41/45 work items completed (91%)',
          'Pipeline: Production deploy successful — v3.2.1',
          'Pipeline: Staging deploy successful — v3.3.0-beta',
          'Pipeline: DR test completed — RTO within SLA',
          'Work item: Azure SQL migration — Phase 1 complete',
          'Work item: API gateway upgrade — in review',
          'Blocked: WORK-1204 — pending security review sign-off',
          'New: 6 bugs filed, 9 closed (net -3)',
        ]
      }
    },
  ];

  let _connected = new Set(JSON.parse(localStorage.getItem('cascade_connected') || '[]'));
  let _pulledData = {};

  function saveConnected() {
    localStorage.setItem('cascade_connected', JSON.stringify([..._connected]));
  }

  // ── RENDER TOOL LIST ──
  function renderTools() {
    const container = document.getElementById('tools-list');
    const badgeEl = document.getElementById('conn-count');
    if (!container) return;

    container.innerHTML = TOOLS.map(t => {
      const isConnected = _connected.has(t.id);
      return `<div class="tool-row">
        <div class="tool-em" style="background:${t.bg}">${t.icon}</div>
        <div class="tool-txt">
          <div class="tool-nm">${t.name}</div>
          <div class="tool-ds">${isConnected ? '✓ Connected · '+t.description : t.description}</div>
        </div>
        ${isConnected
          ? `<button class="tbtn tbtn-x" onclick="CascadeTools.disconnect('${t.id}')">Disconnect</button>`
          : `<button class="tbtn tbtn-c" onclick="CascadeTools.connect('${t.id}')">Connect</button>`
        }
      </div>`;
    }).join('');

    const count = _connected.size;
    if (badgeEl) {
      badgeEl.textContent = count + ' tool' + (count!==1?'s':'') + ' connected';
      badgeEl.className = 'conn-count' + (count > 0 ? ' has' : '');
    }
    const pullBtn = document.getElementById('pull-btn');
    if (pullBtn) pullBtn.disabled = count === 0;
  }

  // ── CONNECT / DISCONNECT ──
  function connect(toolId) {
    const tool = TOOLS.find(t => t.id === toolId);
    if (!tool) return;

    // For portfolio demo: simulate OAuth connection
    // In production: open OAuth popup with tool.connectUrl
    showConnectModal(tool);
  }

  function showConnectModal(tool) {
    // Remove existing modal
    document.getElementById('connect-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'connect-modal';
    modal.className = 'modal-bg';
    modal.innerHTML = `
      <div style="background:var(--ink2);border:1px solid var(--border2);border-radius:16px;padding:28px;width:100%;max-width:420px;margin:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:44px;height:44px;border-radius:10px;background:${tool.bg};display:flex;align-items:center;justify-content:center;font-size:1.375rem">${tool.icon}</div>
          <div>
            <div style="font-family:var(--fd);font-weight:700;font-size:1.0625rem;color:var(--t1)">Connect ${tool.name}</div>
            <div style="font-size:.8125rem;color:var(--t2)">Pulls: ${tool.description}</div>
          </div>
        </div>
        <div style="background:var(--ink3);border:1px solid var(--border);border-radius:9px;padding:12px 14px;margin-bottom:16px">
          <div style="font-size:.625rem;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Demo Mode</div>
          <div style="font-size:.8125rem;color:var(--t2);line-height:1.5">This is a portfolio demo. Connecting will use realistic sample data to show you exactly what Cascade pulls from ${tool.name}.</div>
        </div>
        <div style="font-size:.75rem;color:var(--t3);margin-bottom:16px">In production: OAuth flow opens → you grant read-only access → Cascade pulls data via ${tool.name} API/MCP.</div>
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('connect-modal').remove()" style="flex:1;padding:11px;background:transparent;border:1px solid var(--border2);border-radius:8px;color:var(--t2);font-family:var(--fb);font-size:.875rem;font-weight:600;cursor:pointer">Cancel</button>
          <button onclick="CascadeTools.confirmConnect('${tool.id}')" style="flex:1;padding:11px;background:var(--blue);border:none;border-radius:8px;color:#fff;font-family:var(--fb);font-size:.875rem;font-weight:700;cursor:pointer">Connect ${tool.name} →</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  function confirmConnect(toolId) {
    document.getElementById('connect-modal')?.remove();
    _connected.add(toolId);
    saveConnected();
    renderTools();
    if (typeof updateOnboarding === 'function') updateOnboarding();
    showToast(`✓ ${TOOLS.find(t=>t.id===toolId)?.name} connected`);
  }

  function disconnect(toolId) {
    _connected.delete(toolId);
    delete _pulledData[toolId];
    saveConnected();
    renderTools();
    if (typeof updateOnboarding === 'function') updateOnboarding();
    showToast(`${TOOLS.find(t=>t.id===toolId)?.name} disconnected`);
  }

  // ── PULL DATA ──
  async function pullData() {
    const connectedTools = TOOLS.filter(t => _connected.has(t.id));
    if (connectedTools.length === 0) return;

    const pullBtn = document.getElementById('pull-btn');
    const pullSpinner = document.getElementById('pull-spinner');
    const pullIcon = document.getElementById('pull-icon');

    if (pullBtn) pullBtn.disabled = true;
    if (pullSpinner) pullSpinner.style.display = 'block';
    if (pullIcon) pullIcon.style.display = 'none';
    if (pullBtn) pullBtn.lastChild.textContent = ' Pulling data...';

    try {
      await new Promise(r => setTimeout(r, 1800 + Math.random() * 1200));
      _pulledData = {};
      connectedTools.forEach(t => { _pulledData[t.id] = t.demoData; });
      renderPulledData(connectedTools);
    } finally {
      if (pullBtn) pullBtn.disabled = false;
      if (pullSpinner) pullSpinner.style.display = 'none';
      if (pullIcon) pullIcon.style.display = 'block';
      if (pullBtn) pullBtn.lastChild.textContent = ' Pull this week\'s activity';
    }
  }

  // ── RENDER PULLED DATA ──
  function renderPulledData(tools) {
    // Hide onboarding + pull empty
    const onboard = document.getElementById('onboard-steps');
    if (onboard) onboard.style.display = 'none';
    const pullEmpty = document.getElementById('pull-empty');
    if (pullEmpty) pullEmpty.style.display = 'none';

    const pulled = document.getElementById('pulled-data');
    if (!pulled) return;
    pulled.style.display = 'block';

    const now = new Date();
    const metaEl = document.getElementById('pulled-meta');
    if (metaEl) metaEl.textContent =
      `Pulled ${now.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${tools.length} tool${tools.length!==1?'s':''}`;

    const sections = document.getElementById('tool-sections');
    if (sections) sections.innerHTML = tools.map(t => {
      const data = _pulledData[t.id];
      if (!data) return '';
      return `<div class="tsec">
          <div class="tsec-h">
            <span class="tsec-icon">${t.icon}</span>
            <span class="tsec-name">${t.name}</span>
            <span class="tsec-sum">${data.summary}</span>
          </div>
          <div class="tsec-body">
            ${data.items.map(item => `<div class="tsec-item"><span class="tsec-dot">→</span><span>${item}</span></div>`).join('')}
          </div>
        </div>`;
    }).join('');

    // Update conn-count badge
    const connCount = document.getElementById('conn-count');
    if (connCount) {
      connCount.textContent = tools.length + ' tool' + (tools.length!==1?'s':'') + ' scanned';
      connCount.className = 'conn-count has';
    }
  }

  function getPulledData() { return _pulledData; }
  function getConnectedTools() { return TOOLS.filter(t => _connected.has(t.id)); }

  // ── DEMO MODE ──
  function preConnectForDemo(toolIds) {
    toolIds.forEach(id => _connected.add(id));
    saveConnected();
  }

  function showToast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  return { renderTools, connect, confirmConnect, disconnect, pullData, getPulledData, getConnectedTools, showToast, preConnectForDemo };
})();
