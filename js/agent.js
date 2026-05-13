// ============================================================
// Cascade Agent
// Orchestrates: data pull → Claude synthesis → 6 outputs
// ============================================================

let session = null;
let _outputs = {};
let _currentTab = 0;
let _currentTone = 'balanced';
let _lastDataContext = '';
let _focusQuery = ''; // smart search query

// ── SMART SEARCH ──
function setSearch(query) {
  _focusQuery = query;
  const input = document.getElementById('focus-query');
  if (input) input.value = query;
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = query ? 'block' : 'none';
}

function clearSearch() {
  _focusQuery = '';
  const input = document.getElementById('focus-query');
  if (input) input.value = '';
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.style.display = 'none';
}

// Wire search input live
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('focus-query');
  if (input) {
    input.addEventListener('input', e => {
      _focusQuery = e.target.value.trim();
      const clearBtn = document.getElementById('search-clear');
      if (clearBtn) clearBtn.style.display = _focusQuery ? 'block' : 'none';
    });
  }
});

const OUTPUT_TYPES = [
  { id: 'executive',    label: 'Executive',    audience: 'CEO · CPO · C-Suite',      emoji: '🎯' },
  { id: 'engineering',  label: 'Engineering',  audience: 'Eng Lead · Tech Team',     emoji: '⚙️' },
  { id: 'customer',     label: 'Customer',     audience: 'CS · Sales · Customers',   emoji: '🤝' },
  { id: 'board',        label: 'Board',        audience: 'Investors · Board',         emoji: '📊' },
  { id: 'slack',        label: 'Slack',        audience: 'Team · Standup',            emoji: '💬' },
  { id: 'email',        label: 'Email',        audience: 'External · Newsletter',     emoji: '✉️' },
];

// ── DEMO MODE ──
const IS_DEMO = new URLSearchParams(location.search).get('demo') === 'true';

async function init() {
  if (IS_DEMO) {
    initDemoMode();
    return;
  }

  session = await requireAuth();
  if (!session) return;

  // Show user
  const emailEl = document.getElementById('user-name');
  const name = session.user.email.split('@')[0];
  if (emailEl) emailEl.textContent = name;
  const avatarEl = document.getElementById('user-av');
  if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

  // Load API key — treat 'demo-mode' placeholder as not a real key
  const key = localStorage.getItem('cascade_api_key') || '';
  const isRealKey = key && key !== 'demo-mode';
  const keyInput = document.getElementById('api-key-input');
  if (keyInput && isRealKey) keyInput.value = '••••••••••••••••';
  // Set status immediately on load
  const dotEl = document.getElementById('api-dot');
  if (dotEl) dotEl.classList.toggle('on', isRealKey);
  const stEl = document.getElementById('api-status-txt');
  if (stEl) { stEl.textContent = isRealKey ? '● Set' : '● Not set'; stEl.style.color = isRealKey ? 'var(--green)' : 'var(--t3)'; }

  // Render tools
  CascadeTools.renderTools();

  // Load history
  loadHistory();

  // Wire onboarding
  updateOnboarding();
}

async function initDemoMode() {
  // Hide auth elements, show demo banner
  const signoutBtn = document.querySelector('.topbar-btn');
  if (signoutBtn) {
    signoutBtn.textContent = 'Sign up free';
    signoutBtn.onclick = () => location.href = 'login.html?mode=signup';
  }
  const emailEl = document.getElementById('user-name');
  if (emailEl) emailEl.textContent = 'demo user';
  const avatarEl = document.getElementById('user-av');
  if (avatarEl) avatarEl.textContent = 'D';

  // Show demo banner
  showDemoBanner();

  // Pre-connect 3 tools and mark API key as set
  localStorage.setItem('cascade_api_key', 'demo-mode');
  CascadeTools.preConnectForDemo(['github', 'jira', 'slack']);
  CascadeTools.renderTools();

  // Mark API key dot as live
  const dot = document.getElementById('api-dot');
  if (dot) dot.classList.add('on');
  const stEl2 = document.getElementById('api-status-txt');
  if (stEl2) { stEl2.textContent = '● Set'; stEl2.style.color = 'var(--green)'; }

  // Hide onboarding, go straight to pre-pulled state
  const onboard = document.getElementById('onboard-steps');
  if (onboard) onboard.style.display = 'none';

  // Auto-pull after short delay for dramatic effect
  await new Promise(r => setTimeout(r, 600));
  await CascadeTools.pullData();

  // Update conn-count
  const connCount = document.getElementById('conn-count');
  if (connCount) { connCount.textContent = '3 tools scanned'; connCount.className = 'conn-count has'; }

  // Show generate button area with hint
  const genHint = document.getElementById('generate-hint');
  if (genHint) genHint.innerHTML = '✦ Demo data loaded — click Generate to see AI outputs';
}

function showDemoBanner() {
  const bar = document.createElement('div');
  bar.style.cssText = 'background:linear-gradient(90deg,rgba(94,114,255,.15),rgba(155,109,255,.15));border-bottom:1px solid rgba(94,114,255,.2);padding:8px 28px;display:flex;align-items:center;justify-content:space-between;font-size:.8125rem;flex-shrink:0';
  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;color:rgba(242,244,255,.7)">
      <span style="background:var(--blue);color:#fff;font-size:.625rem;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.05em">DEMO</span>
      You're viewing a live demo with sample data — no account needed.
    </div>
    <a href="login.html?mode=signup" style="color:var(--blue);font-weight:700;font-size:.8125rem;text-decoration:none">Create free account →</a>`;
  // Insert after topbar
  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.after(bar);
}

// ── ONBOARDING ──
function updateOnboarding() {
  const storedKey = localStorage.getItem('cascade_api_key') || '';
  const hasKey = storedKey && storedKey !== 'demo-mode';
  const hasTools = CascadeTools.getConnectedTools().length > 0;

  const s1 = document.getElementById('step-1');
  const s2 = document.getElementById('step-2');
  const s3 = document.getElementById('step-3');
  const s1n = document.getElementById('step-1-num');
  const s2n = document.getElementById('step-2-num');
  const s3n = document.getElementById('step-3-num');
  const s1a = document.getElementById('step-1-cta');
  const pullEmpty = document.getElementById('pull-empty');
  const onboard = document.getElementById('onboard-steps');
  const dot = document.getElementById('api-dot');

  // API dot
  if (dot) { dot.classList.toggle('on', hasKey); }
  const statusTxt = document.getElementById('api-status-txt');
  if (statusTxt) {
    statusTxt.textContent = hasKey ? '● Set' : '● Not set';
    statusTxt.style.color = hasKey ? 'var(--green)' : 'var(--t3)';
  }

  if (!hasKey) {
    // Step 1 active
    setStep(s1, 'active'); setStep(s2, 'inactive'); setStep(s3, 'inactive');
    if (s1n) s1n.textContent = '1';
    if (s2n) s2n.textContent = '2';
    if (s3n) s3n.textContent = '3';
    if (pullEmpty) pullEmpty.style.display = 'none';
    if (onboard) onboard.style.display = 'block';
    return;
  }

  if (!hasTools) {
    // Step 1 done, Step 2 active
    setStep(s1, 'done'); setStep(s2, 'active'); setStep(s3, 'inactive');
    if (s1n) s1n.textContent = '✓';
    if (s2n) s2n.textContent = '2';
    if (s3n) s3n.textContent = '3';
    if (s1a) s1a.style.display = 'none';
    if (pullEmpty) pullEmpty.style.display = 'none';
    if (onboard) onboard.style.display = 'block';
    return;
  }

  // Steps 1+2 done, Step 3 active
  setStep(s1, 'done'); setStep(s2, 'done'); setStep(s3, 'active');
  if (s1n) s1n.textContent = '✓';
  if (s2n) s2n.textContent = '✓';
  if (s3n) s3n.textContent = '3';
  if (s1a) s1a.style.display = 'none';

  // Hide onboarding, show pull button
  if (onboard) onboard.style.display = 'none';
  if (pullEmpty) pullEmpty.style.display = 'block';
}

function setStep(el, state) {
  if (!el) return;
  el.className = 'step ' + state;
  // make inactive non-clickable
  el.style.pointerEvents = state === 'inactive' ? 'none' : '';
}

function focusApiKey() {
  const input = document.getElementById('api-key-input');
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.style.borderColor = 'var(--blue)';
    setTimeout(() => input.style.borderColor = '', 2000);
  }
}

function focusTools() {
  const toolsList = document.getElementById('tools-list');
  if (toolsList) toolsList.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Flash first connect button
  const firstBtn = toolsList?.querySelector('.tbtn-c');
  if (firstBtn) {
    firstBtn.style.background = 'rgba(94,114,255,.3)';
    setTimeout(() => firstBtn.style.background = '', 1500);
  }
}

// ── API KEY ──
function saveApiKey() {
  const val = document.getElementById('api-key-input')?.value.trim();
  if (!val || val.includes('•')) return;
  localStorage.setItem('cascade_api_key', val);
  document.getElementById('api-key-input').value = '••••••••••••••••';
  // Update dot immediately without waiting for updateOnboarding
  const dot = document.getElementById('api-dot');
  if (dot) dot.classList.add('on');
  const statusTxt = document.getElementById('api-status-txt');
  if (statusTxt) { statusTxt.textContent = '● Set'; statusTxt.style.color = 'var(--green)'; }
  CascadeTools.showToast('✓ API key saved');
  updateOnboarding();
}

function updateApiKeyStatus() {
  updateOnboarding();
}

// ── PULL DATA ──
async function pullData() {
  await CascadeTools.pullData();
}

// ── GENERATE UPDATES ──
async function generateUpdates() {
  let apiKey = localStorage.getItem('cascade_api_key');

  // Demo mode with no real key — prompt to add one
  if (IS_DEMO && apiKey === 'demo-mode') {
    const key = prompt('To generate AI updates, enter your Claude API key:\n(Get one free at console.anthropic.com)');
    if (!key || !key.startsWith('sk-')) {
      CascadeTools.showToast('⚠ Valid API key needed to generate updates');
      return;
    }
    localStorage.setItem('cascade_api_key', key);
    apiKey = key;
    const dot = document.getElementById('api-dot');
    if (dot) dot.classList.add('live');
  }

  if (!apiKey || apiKey === 'demo-mode') {
    alert('Please add your Claude API key in the sidebar first');
    return;
  }

  const pulledData = CascadeTools.getPulledData();
  const connectedTools = CascadeTools.getConnectedTools();
  const extraContext = document.getElementById('extra-context')?.value || '';

  if (Object.keys(pulledData).length === 0 && !extraContext) {
    alert('Pull data from your tools first');
    return;
  }

  // Loading state
  const genBtn = document.getElementById('generate-btn');
  const genSpinner = document.getElementById('gen-spinner');
  const genIcon = document.getElementById('gen-icon');
  const genHint = document.getElementById('generate-hint');
  if (genBtn) genBtn.disabled = true;
  if (genSpinner) genSpinner.style.display = 'block';
  if (genIcon) genIcon.style.display = 'none';
  if (genHint) genHint.textContent = 'Generating 6 updates...';

  try {
    // Build context string from pulled data
    let dataContext = '';
    connectedTools.forEach(tool => {
      const data = pulledData[tool.id];
      if (!data) return;
      dataContext += `\n${tool.name.toUpperCase()}:\n${data.items.join('\n')}\n`;
    });

    if (extraContext) dataContext += `\nADDITIONAL CONTEXT:\n${extraContext}`;

    // Apply focus query if set
    const focusQuery = document.getElementById('focus-query')?.value.trim() || '';
    if (focusQuery) {
      dataContext += `\n\nFOCUS INSTRUCTION: The user wants the update to specifically focus on: "${focusQuery}". Emphasise and prioritise information related to this in all 6 outputs. Still include critical blockers, key decisions, and major wins even if not directly related.`;
    }

    _lastDataContext = dataContext;

    // Show focus badge in generate hint
    const genHint = document.getElementById('generate-hint');
    if (genHint) {
      genHint.innerHTML = focusQuery
        ? `✦ Generating with focus: <span class="search-active-badge">${focusQuery}</span>`
        : '✦ Generating 6 stakeholder updates...';
    }

    // Run all 6 in parallel
    await Promise.allSettled(OUTPUT_TYPES.map(async type => {
      try {
        const output = await callClaude(type.id, dataContext, apiKey);
        _outputs[type.id] = output;
      } catch(e) {
        _outputs[type.id] = `[Error generating ${type.label} update: ${e.message}]`;
      }
    }));

    // Render outputs
    renderOutputs();

    // Save to history
    await saveToHistory(dataContext);

  } catch(e) {
    alert('Generation failed: ' + e.message);
  } finally {
    if (genBtn) genBtn.disabled = false;
    if (genSpinner) genSpinner.style.display = 'none';
    if (genIcon) genIcon.style.display = 'block';
    if (genHint) genHint.textContent = '✦ 6 stakeholder updates ready';
  }
}

async function callClaude(outputType, dataContext, apiKey) {
  const toneInstructions = {
    balanced: 'professional and clear',
    formal: 'formal and structured',
    casual: 'conversational and friendly',
    concise: 'very brief — maximum 5 bullet points or 3 short paragraphs',
  };

  const prompts = {
    executive: `You are writing a weekly product update for the C-suite (CEO, CPO, CTO).
Tone: ${toneInstructions[_currentTone]}. Lead with impact, not activity.
Format: 3-5 bullet points max. Include: what shipped, what's delayed, what you need from leadership.
No technical jargon. Start with the most important thing.

Here's what happened this week:
${dataContext}

Write the executive update now. No preamble.`,

    engineering: `You are writing a weekly technical update for the engineering team and tech lead.
Tone: ${toneInstructions[_currentTone]}. Include technical detail — sprint velocity, PRs, blockers, tech debt.
Format: Structured sections — Shipped / In Progress / Blocked / Next Sprint.
Use specific numbers where available.

Here's what happened this week:
${dataContext}

Write the engineering update now. No preamble.`,

    customer: `You are writing a weekly update for customer success and sales teams to share with customers.
Tone: ${toneInstructions[_currentTone]}. Positive framing. No internal drama or technical failures.
Focus: What shipped that helps customers, what's coming next, any known issues with ETA.
Format: Short paragraphs, customer-friendly language.

Here's what happened this week:
${dataContext}

Write the customer-facing update now. No preamble.`,

    board: `You are writing a weekly update for the board and investors.
Tone: ${toneInstructions[_currentTone]}. Strategic framing. Metrics-led. Connect product activity to business outcomes.
Include: KPI movements, strategic progress, risks and mitigations.
Format: Executive prose with key metrics called out.

Here's what happened this week:
${dataContext}

Write the board update now. No preamble.`,

    slack: `You are writing a Slack standup update for the team channel.
Tone: casual, emoji-friendly. Max 6 lines. Use emoji bullets.
Include: shipped this week, what's in progress, any blockers.
Add @mention placeholders where relevant (e.g. "@design team").

Here's what happened this week:
${dataContext}

Write the Slack standup now. No preamble.`,

    email: `You are writing a weekly email update for external stakeholders.
Tone: ${toneInstructions[_currentTone]}. Professional, formatted for email.
Start with a subject line on its own line: "Subject: [subject]"
Then a greeting, 2-3 short paragraphs, and a sign-off.

Here's what happened this week:
${dataContext}

Write the email update now. Start with the subject line.`,
  };

  const resp = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompts[outputType] }]
    })
  });

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message || 'API error');
  return data.content[0].text.trim();
}

// ── RENDER OUTPUTS ──
function renderOutputs() {
  // Build tabs in drawer
  const tabs = document.getElementById('outputs-tabs');
  if (tabs) tabs.innerHTML = OUTPUT_TYPES.map((t, i) => `
    <button class="out-tab ${i===0?'active':''}" onclick="switchOutputTab(${i},this)">
      ${t.emoji} ${t.label}
    </button>`).join('');

  showOutput(0);

  // Show focus query in drawer if set
  const focusQuery = document.getElementById('focus-query')?.value.trim() || '';
  const drawerTitle = document.querySelector('.drawer-title');
  if (drawerTitle) {
    drawerTitle.innerHTML = focusQuery
      ? `Your <em>stakeholder updates</em> &nbsp;<span class="search-active-badge">⚡ ${focusQuery}</span>`
      : `Your <em>stakeholder updates</em>`;
  }

  // Open the modal
  const overlay = document.getElementById('outputs-overlay');
  if (overlay) overlay.classList.add('open');
  // Hide reopen button since modal is open
  const reopenRow = document.getElementById('reopen-row');
  if (reopenRow) reopenRow.style.display = 'none';
}

function closeOutputs() {
  const overlay = document.getElementById('outputs-overlay');
  if (overlay) overlay.classList.remove('open');
  // Show reopen button so user doesn't have to regenerate
  const reopenRow = document.getElementById('reopen-row');
  if (reopenRow && Object.keys(_outputs).length > 0) reopenRow.style.display = 'block';
}

function reopenOutputs() {
  const overlay = document.getElementById('outputs-overlay');
  if (overlay) overlay.classList.add('open');
}

function switchOutputTab(idx, btn) {
  _currentTab = idx;
  document.querySelectorAll('.out-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('on');
  showOutput(idx);
}

// ── MARKDOWN RENDERER ──
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr>')
    // Unordered lists
    .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li in ul
    .replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs — wrap lines not already in a block tag
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      if (/^<(h[123]|ul|ol|li|hr|blockquote)/.test(trimmed)) return trimmed;
      return '<p>' + trimmed + '</p>';
    })
    .join('\n')
    // Clean up extra breaks
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p><br><\/p>/g, '');
  return html;
}

function showOutput(idx) {
  const type = OUTPUT_TYPES[idx];
  const bodyEl = document.getElementById('output-body');
  if (!bodyEl) return;
  const raw = _outputs[type.id] || '';
  bodyEl.innerHTML = raw ? renderMarkdown(raw) : '<p style="color:var(--t3)">Generating...</p>';
}

function copyCurrentOutput() {
  const type = OUTPUT_TYPES[_currentTab];
  const text = _outputs[type.id] || '';
  navigator.clipboard.writeText(text).then(() => {
    CascadeTools.showToast('✓ Copied to clipboard');
  });
}

function copyAll() {
  const all = OUTPUT_TYPES.map(t =>
    `=== ${t.emoji} ${t.label.toUpperCase()} UPDATE ===\n${_outputs[t.id] || ''}`
  ).join('\n\n' + '─'.repeat(50) + '\n\n');
  navigator.clipboard.writeText(all).then(() => {
    CascadeTools.showToast('✓ All 6 updates copied');
  });
}

async function setTone(tone, btn) {
  if (_currentTone === tone) return;
  _currentTone = tone;

  // Update button states
  document.querySelectorAll('.tone-btn').forEach(b => {
    b.classList.remove('on');
    b.disabled = false;
  });
  btn.classList.add('on');

  // No outputs yet — just store preference
  const currentType = OUTPUT_TYPES[_currentTab];
  if (!currentType || !_outputs[currentType.id]) return;

  const apiKey = localStorage.getItem('cascade_api_key');
  if (!apiKey) return;

  // Use stored context from last generate run
  const dataContext = _lastDataContext;
  if (!dataContext) return;

  // Show loading in output body
  const bodyEl = document.getElementById('output-body');
  if (bodyEl) bodyEl.innerHTML = '<p style="color:var(--t3)">Rewriting in ' + tone + ' tone...</p>';

  // Disable all tone buttons while regenerating
  document.querySelectorAll('.tone-btn').forEach(b => b.disabled = true);

  try {
    const newOutput = await callClaude(currentType.id, dataContext, apiKey);
    _outputs[currentType.id] = newOutput;
    if (bodyEl) bodyEl.innerHTML = renderMarkdown(newOutput);
  } catch(e) {
    if (bodyEl) bodyEl.innerHTML = renderMarkdown(_outputs[currentType.id] || '');
    CascadeTools.showToast('⚠ Tone rewrite failed — showing original');
  } finally {
    document.querySelectorAll('.tone-btn').forEach(b => b.disabled = false);
  }
}

// ── HISTORY ──
async function saveToHistory(context) {
  if (!session) return;
  try {
    const tools = CascadeTools.getConnectedTools().map(t => t.name);
    await supabaseClient.from('cascade_updates').insert({
      user_id: session.user.id,
      tools_used: tools,
      data_context: context.slice(0, 2000),
      outputs: _outputs,
      created_at: new Date().toISOString(),
    });
    loadHistory();
  } catch(e) { console.warn('History save failed:', e.message); }
}

async function loadHistory() {
  if (!session) return;
  try {
    const { data } = await supabaseClient
      .from('cascade_updates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const el = document.getElementById('history-list');
    if (!el) return;

    if (!data || data.length === 0) {
      el.innerHTML = '<div class="hist-empty">No updates yet</div>';
      return;
    }

    el.innerHTML = data.map(u => `
      <div class="hist-card" onclick="loadHistoryItem('${u.id}')">
        <div class="hist-date">${new Date(u.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
        <div class="hist-prev">${(u.outputs?.executive || 'Update generated').slice(0,80)}...</div>
        <div class="hist-tags">
          ${(u.tools_used||[]).map(t => `<span class="hist-tag">${t}</span>`).join('')}
        </div>
      </div>`).join('');
  } catch(e) { console.warn('History load failed:', e.message); }
}

async function loadHistoryItem(id) {
  const { data } = await supabaseClient
    .from('cascade_updates')
    .select('*')
    .eq('id', id)
    .single();
  if (!data) return;
  _outputs = data.outputs || {};
  renderOutputs();
  CascadeTools.showToast('✓ Previous update loaded');
}

init();
