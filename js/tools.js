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
  ];

  let _connected = new Set(JSON.parse(localStorage.getItem('cascade_connected') || '[]'));
  let _pulledData = {};

  function saveConnected() {
    localStorage.setItem('cascade_connected', JSON.stringify([..._connected]));
  }

  // ── RENDER TOOL LIST ──
  function renderTools() {
    const container = document.getElementById('tools-list');
    const countEl = document.getElementById('connected-count');
    if (!container) return;

    container.innerHTML = TOOLS.map(t => {
      const isConnected = _connected.has(t.id);
      return `
        <div class="tool-item">
          <div class="tool-icon" style="background:${t.bg}">${t.icon}</div>
          <div class="tool-info">
            <div class="tool-name">${t.name}</div>
            <div class="tool-status">${isConnected ? '✓ Connected · '+t.description : t.description}</div>
          </div>
          ${isConnected
            ? `<button class="tool-btn disconnect" onclick="CascadeTools.disconnect('${t.id}')">Disconnect</button>`
            : `<button class="tool-btn connect" onclick="CascadeTools.connect('${t.id}')">Connect</button>`
          }
        </div>`;
    }).join('');

    const count = _connected.size;
    countEl.textContent = count + ' connected';
    countEl.style.color = count > 0 ? 'var(--green)' : 'var(--t3)';

    // Enable pull button if at least one tool connected
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
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)';
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
    showToast(`✓ ${TOOLS.find(t=>t.id===toolId)?.name} connected`);
  }

  function disconnect(toolId) {
    _connected.delete(toolId);
    delete _pulledData[toolId];
    saveConnected();
    renderTools();
    showToast(`${TOOLS.find(t=>t.id===toolId)?.name} disconnected`);
  }

  // ── PULL DATA ──
  async function pullData() {
    const connectedTools = TOOLS.filter(t => _connected.has(t.id));
    if (connectedTools.length === 0) return;

    const pullBtn = document.getElementById('pull-btn');
    const pullSpinner = document.getElementById('pull-spinner');
    const pullIcon = document.getElementById('pull-icon');

    pullBtn.disabled = true;
    pullSpinner.style.display = 'block';
    pullIcon.style.display = 'none';
    pullBtn.childNodes[pullBtn.childNodes.length-1].textContent = ' Pulling data...';

    // Simulate realistic pull delay
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 1200));

    // Use demo data for each connected tool
    _pulledData = {};
    connectedTools.forEach(t => { _pulledData[t.id] = t.demoData; });

    renderPulledData(connectedTools);

    pullBtn.disabled = false;
    pullSpinner.style.display = 'none';
    pullIcon.style.display = 'block';
  }

  // ── RENDER PULLED DATA ──
  function renderPulledData(tools) {
    document.getElementById('pull-empty').style.display = 'none';
    const pulled = document.getElementById('pulled-data');
    pulled.style.display = 'block';

    const now = new Date();
    document.getElementById('pulled-meta').textContent =
      `Pulled ${now.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} · ${tools.length} tool${tools.length!==1?'s':''}`;

    const sections = document.getElementById('tool-sections');
    sections.innerHTML = tools.map(t => {
      const data = _pulledData[t.id];
      if (!data) return '';
      return `
        <div class="tool-section">
          <div class="tool-section-header">
            <span class="tool-section-icon">${t.icon}</span>
            <span class="tool-section-name">${t.name}</span>
            <span class="tool-section-count">${data.summary}</span>
          </div>
          <div class="tool-section-items">
            ${data.items.map(item => `
              <div class="tool-item-row">
                <span class="tool-item-bullet">→</span>
                <span>${item}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

    // Update agent sub
    document.getElementById('agent-sub').textContent =
      `Pulled ${tools.length} tool${tools.length!==1?'s':''} · Review and generate updates`;
  }

  function getPulledData() { return _pulledData; }
  function getConnectedTools() { return TOOLS.filter(t => _connected.has(t.id)); }

  function showToast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  return { renderTools, connect, confirmConnect, disconnect, pullData, getPulledData, getConnectedTools, showToast };
})();
