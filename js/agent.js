// ============================================================
// Cascade Agent
// Orchestrates: data pull → Claude synthesis → 6 outputs
// ============================================================

let session = null;
let _outputs = {};
let _currentTab = 0;
let _currentTone = 'balanced';

const OUTPUT_TYPES = [
  { id: 'executive',    label: 'Executive',    audience: 'CEO · CPO · C-Suite',      emoji: '🎯' },
  { id: 'engineering',  label: 'Engineering',  audience: 'Eng Lead · Tech Team',     emoji: '⚙️' },
  { id: 'customer',     label: 'Customer',     audience: 'CS · Sales · Customers',   emoji: '🤝' },
  { id: 'board',        label: 'Board',        audience: 'Investors · Board',         emoji: '📊' },
  { id: 'slack',        label: 'Slack',        audience: 'Team · Standup',            emoji: '💬' },
  { id: 'email',        label: 'Email',        audience: 'External · Newsletter',     emoji: '✉️' },
];

async function init() {
  session = await requireAuth();
  if (!session) return;

  // Show user
  const emailEl = document.getElementById('user-email-display');
  const name = session.user.email.split('@')[0];
  if (emailEl) emailEl.textContent = name;
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

  // Load API key
  const key = localStorage.getItem('cascade_api_key') || '';
  const keyInput = document.getElementById('api-key-input');
  if (keyInput && key) keyInput.value = '••••••••••••••••';
  updateApiKeyStatus();

  // Render tools
  CascadeTools.renderTools();

  // Load history
  loadHistory();
}

// ── API KEY ──
function saveApiKey() {
  const val = document.getElementById('api-key-input')?.value.trim();
  if (!val || val.includes('•')) return;
  localStorage.setItem('cascade_api_key', val);
  document.getElementById('api-key-input').value = '••••••••••••••••';
  updateApiKeyStatus();
  CascadeTools.showToast('✓ API key saved');
}

function updateApiKeyStatus() {
  const key = localStorage.getItem('cascade_api_key');
  const dot = document.getElementById('api-dot');
  if (!dot) return;
  if (key) dot.classList.add('set');
  else dot.classList.remove('set');
}

// ── PULL DATA ──
async function pullData() {
  await CascadeTools.pullData();
}

// ── GENERATE UPDATES ──
async function generateUpdates() {
  const apiKey = localStorage.getItem('cascade_api_key');
  if (!apiKey) {
    alert('Please add your Claude API key first');
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
  genBtn.disabled = true;
  genSpinner.style.display = 'block';
  genIcon.style.display = 'none';
  document.getElementById('generate-hint').textContent = 'Generating 6 updates...';

  try {
    // Build context string from pulled data
    let dataContext = '';
    connectedTools.forEach(tool => {
      const data = pulledData[tool.id];
      if (!data) return;
      dataContext += `\n${tool.name.toUpperCase()}:\n${data.items.join('\n')}\n`;
    });

    if (extraContext) dataContext += `\nADDITIONAL CONTEXT:\n${extraContext}`;

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
    genBtn.disabled = false;
    genSpinner.style.display = 'none';
    genIcon.style.display = 'block';
    document.getElementById('generate-hint').textContent = '6 updates ready to generate';
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
  const panel = document.getElementById('outputs-panel');
  panel.classList.add('show');
  const ph = document.getElementById('out-placeholder');
  if (ph) ph.style.display = 'none';

  const tabs = document.getElementById('outputs-tabs');
  tabs.innerHTML = OUTPUT_TYPES.map((t, i) => `
    <button class="out-tab ${i===0?'active':''}" onclick="switchOutputTab(${i},this)">
      ${t.emoji} ${t.label}
    </button>`).join('');

  showOutput(0);
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchOutputTab(idx, btn) {
  _currentTab = idx;
  document.querySelectorAll('.out-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('on');
  showOutput(idx);
}

function showOutput(idx) {
  const type = OUTPUT_TYPES[idx];
  document.getElementById('output-audience').textContent = type.audience;
  document.getElementById('output-name').textContent = type.emoji + ' ' + type.label + ' Update';
  document.getElementById('output-body').textContent = _outputs[type.id] || 'Generating...';
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

function setTone(tone, btn) {
  _currentTone = tone;
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('on');
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
      <div class="hist-item" onclick="loadHistoryItem('${u.id}')">
        <div class="hist-date">${new Date(u.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
        <div class="hist-prev">${(u.outputs?.executive || 'Update generated').slice(0,80)}...</div>
        <div class="hist-pills">
          ${(u.tools_used||[]).map(t => `<span class="hist-pill">${t}</span>`).join('')}
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
