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


  // ── TOOL LOGOS ──
  const TOOL_LOGOS = {
    github: `<svg viewBox="0 0 24 24" fill="#24292E"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>`,
    jira: `<svg viewBox="0 0 24 24"><path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.004-1.005z" fill="#2684FF"/><path d="M6.308 6.308h11.57a5.218 5.218 0 0 1-5.231 5.215h-2.13v2.052A5.218 5.218 0 0 1 5.3 18.79V7.313a1.005 1.005 0 0 1 1.008-1.005z" fill="#2684FF" opacity=".7"/><path d="M1.047 1.047h11.572a5.218 5.218 0 0 1-5.232 5.215H5.256v2.052A5.218 5.218 0 0 1 .04 13.529V2.052A1.005 1.005 0 0 1 1.047 1.047z" fill="#2684FF" opacity=".5"/></svg>`,
    slack: `<svg viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01E5A"/></svg>`,
    notion: `<svg viewBox="0 0 24 24"><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933z" fill="black"/></svg>`,
    linear: `<svg viewBox="0 0 24 24"><path d="M.846 16.349 7.65 23.154a8.128 8.128 0 0 1-6.804-6.805zM0 12.522l11.478 11.478A8.153 8.153 0 0 1 8.41 23.83L.17 15.59A8.153 8.153 0 0 1 0 12.522zM.875 8.875l14.25 14.25a8.21 8.21 0 0 1-2.198 1.073L1.8 11.073A8.21 8.21 0 0 1 .875 8.875zM2.786 5.786l15.428 15.428a8.145 8.145 0 0 1-1.571 1.177L3.963 7.357a8.145 8.145 0 0 1 1.177-1.57l-.354-.001zM5.467 3.467l15.066 15.066A8.107 8.107 0 0 1 19.32 19.8L4.2 4.68a8.107 8.107 0 0 1 1.267-1.213zM8.88 1.875l13.245 13.245c-.234.575-.52 1.124-.855 1.637L7.243 2.73c.513-.336 1.062-.622 1.637-.855zM12.522 0l11.478 11.478A8.153 8.153 0 0 1 23.83 14.41L9.59.17A8.153 8.153 0 0 1 12.522 0zM16.349.846a8.128 8.128 0 0 1 6.805 6.804L16.349.846z" fill="#5E6AD2"/></svg>`,
    gmail: `<svg viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>`,
    teams: `<svg viewBox="0 0 24 24"><path d="M20.625 7.125H13.5a.875.875 0 0 0-.875.875v6.125c0 .482.393.875.875.875h7.125a.875.875 0 0 0 .875-.875V8a.875.875 0 0 0-.875-.875z" fill="#5059C9"/><circle cx="17.0625" cy="4.875" r="2.125" fill="#5059C9"/><path d="M10.875 8.75H3.375A.875.875 0 0 0 2.5 9.625v5.875c0 .482.393.875.875.875h7.5a.875.875 0 0 0 .875-.875V9.625a.875.875 0 0 0-.875-.875z" fill="#7B83EB"/><circle cx="7.125" cy="5.875" r="2.375" fill="#7B83EB"/></svg>`,
    outlook: `<svg viewBox="0 0 24 24"><rect width="15" height="15" rx="2" fill="#0078D4"/><path d="M7.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="white"/><rect x="13" y="8" width="11" height="8" rx="1" fill="#0078D4"/><path d="M13 8l5.5 3.5L24 8" stroke="white" stroke-width="1.2" fill="none"/></svg>`,
    azuredevops: `<svg viewBox="0 0 24 24"><path d="M0 17.326v-10.65l4.01-4.463 6.844-2.213v21.886l-6.844-1.25zM24 5.715l-7.5-5.715v3.75l-6.938 1.875v13.125l6.938 1.875V9.09L24 7.965z" fill="#0078D4"/></svg>`
  };

  function getToolLogo(id) {
    return TOOL_LOGOS[id] || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#888"/></svg>';
  }

  // ── RENDER TOOL LIST ──
  function renderTools() {
    const container = document.getElementById('tools-list');
    const badgeEl = document.getElementById('conn-count');
    if (!container) return;

    container.innerHTML = TOOLS.map(t => {
      const isConnected = _connected.has(t.id);
      return `<div class="tool-item">
        <div class="tool-icon" style="background:${t.bg};padding:4px">${getToolLogo(t.id)}</div>
        <div class="tool-info">
          <div class="tool-name">${t.name}</div>
          <div class="tool-desc">${isConnected ? '✓ '+t.description : t.description}</div>
        </div>
        ${isConnected
          ? `<button class="t-btn t-btn-x" onclick="CascadeTools.disconnect('${t.id}')">Disconnect</button>`
          : `<button class="t-btn t-btn-c" onclick="CascadeTools.connect('${t.id}')">Connect</button>`
        }
      </div>`;
    }).join('');

    const count = _connected.size;
    if (badgeEl) {
      badgeEl.textContent = count + ' tool' + (count!==1?'s':'') + ' connected';
      badgeEl.className = 'tools-badge' + (count > 0 ? ' has' : '');
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
    document.getElementById('connect-modal')?.classList.remove('open');

    const modalOverlay = document.getElementById('connect-modal');
    const modal = document.getElementById('modal-content');
    if (!modalOverlay || !modal) return;
    
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
    document.getElementById('connect-modal')?.classList.remove('open');
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
    pulled.classList.add('show');

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

    // Show context card
    const ctxCard = document.getElementById('ctx-card');
    if (ctxCard) ctxCard.classList.add('show');
    // Update conn-count badge
    const connCount = document.getElementById('conn-count');
    if (connCount) {
      connCount.textContent = tools.length + ' tool' + (tools.length!==1?'s':'') + ' scanned';
      connCount.className = 'tools-badge has';
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
