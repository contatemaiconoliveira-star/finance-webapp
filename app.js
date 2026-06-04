const sourceOptionsByScope = {
  business: ["Pix", "Asaas", "Eduzz", "Green", "Boleto"],
  personal: ["Cartao A", "Cartao B", "Pix"],
};

const sourceOptionsByKind = {
  income: {
    business: ["Pix", "Asaas", "Eduzz", "Green", "Boleto"],
    personal: ["Cartao A", "Cartao B", "Pix"],
  },
  expense: {
    business: ["Cartao de credito Maicon", "Cartao de credito Vanessa empresarial", "Pix", "Boleto"],
    personal: ["Cartao Maicon", "Cartao Vanessa pessoal", "Cartao Vanessa empresarial", "Pix Vanessa", "Pix Maicon"],
  },
};

const sourceOptions = [
  ...new Set([
    ...sourceOptionsByKind.income.business,
    ...sourceOptionsByKind.expense.business,
    ...sourceOptionsByKind.income.personal,
    ...sourceOptionsByKind.expense.personal,
  ]),
];

const supabaseConfig = {
  url: "https://ezaehjggbgapbeyceinb.supabase.co",
  anonKey: "sb_publishable_HGWRPacMNINT6csFphH2yw_ZD6FrsJe",
};

const state = {
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  view: "business",
  transactions: [],
  invoices: [],
  remoteReady: false,
  session: null,
};

const els = {
  authScreen: document.querySelector("#authScreen"),
  loginForm: document.querySelector("#loginForm"),
  authMessage: document.querySelector("#authMessage"),
  logoutButton: document.querySelector("#logoutButton"),
  sidebar: document.querySelector(".sidebar"),
  appShell: document.querySelector(".app-shell"),
  monthSelect: document.querySelector("#monthSelect"),
  yearSelect: document.querySelector("#yearSelect"),
  incomeKpi: document.querySelector("#incomeKpi"),
  expenseKpi: document.querySelector("#expenseKpi"),
  balanceKpi: document.querySelector("#balanceKpi"),
  focusLabel: document.querySelector("#focusLabel"),
  focusKpi: document.querySelector("#focusKpi"),
  scopeBanner: document.querySelector("#scopeBanner"),
  viewEyebrow: document.querySelector("#viewEyebrow"),
  viewTitle: document.querySelector("#viewTitle"),
  transactionForm: document.querySelector("#transactionForm"),
  expenseTransactionForm: document.querySelector("#expenseTransactionForm"),
  quickForm: document.querySelector("#quickForm"),
  expenseQuickForm: document.querySelector("#expenseQuickForm"),
  quickSource: document.querySelector("#quickSource"),
  expenseQuickSource: document.querySelector("#expenseQuickSource"),
  invoiceForm: document.querySelector("#invoiceForm"),
  transactionsList: document.querySelector("#transactionsList"),
  allTransactionsList: document.querySelector("#allTransactionsList"),
  directionCards: document.querySelector("#directionCards"),
  invoiceSummary: document.querySelector("#invoiceSummary"),
  invoiceList: document.querySelector("#invoiceList"),
  incomePie: document.querySelector("#incomePie"),
  expensePie: document.querySelector("#expensePie"),
  incomeChartLegend: document.querySelector("#incomeChartLegend"),
  expenseChartLegend: document.querySelector("#expenseChartLegend"),
  incomeChartTotal: document.querySelector("#incomeChartTotal"),
  expenseChartTotal: document.querySelector("#expenseChartTotal"),
  incomeTransactionsList: document.querySelector("#incomeTransactionsList"),
  expenseTransactionsList: document.querySelector("#expenseTransactionsList"),
  incomeListTotal: document.querySelector("#incomeListTotal"),
  expenseListTotal: document.querySelector("#expenseListTotal"),
  installmentPanel: document.querySelector("#installmentPanel"),
  sourceFilter: document.querySelector("#sourceFilter"),
  searchInput: document.querySelector("#searchInput"),
  storageStatus: document.querySelector("#storageStatus"),
  exportButton: document.querySelector("#exportButton"),
  seedButton: document.querySelector("#seedButton"),
  clearButton: document.querySelector("#clearButton"),
  editDialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  closeEditButton: document.querySelector("#closeEditButton"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2026, index, 1))
);
const incomeChartColors = ["#34d399", "#60a5fa", "#22d3ee", "#a78bfa", "#fbbf24", "#4ade80"];
const expenseChartColors = ["#ef4444", "#f97316", "#ec4899", "#7f1d1d", "#facc15", "#be123c"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsISO(date, monthsToAdd) {
  const parsed = new Date(`${date}T12:00:00`);
  const day = parsed.getDate();
  const target = new Date(parsed.getFullYear(), parsed.getMonth() + monthsToAdd, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseMoney(value) {
  const text = String(value || "").trim().replace(/[^\d,.-]/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
}

function monthKey(date) {
  const parsed = new Date(`${date}T12:00:00`);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

function activeMonthKey() {
  return monthKey(state.month.toISOString().slice(0, 10));
}

function activeScope() {
  return document.querySelector("[data-view].active")?.dataset.view || state.view;
}

function scopeLabel(scope) {
  return scope === "business" ? "Empresa" : "Pessoal";
}

function kindLabel(kind) {
  return kind === "income" ? "Entrada" : "Saida";
}

function signedAmount(item) {
  return item.kind === "income" ? item.amount : -item.amount;
}

function saveLocal() {
  localStorage.setItem("direction.transactions", JSON.stringify(state.transactions));
  localStorage.setItem("direction.invoices", JSON.stringify(state.invoices));
}

function loadLocalFallback() {
  state.transactions = JSON.parse(localStorage.getItem("direction.transactions") || "[]").map(normalizeTransaction);
  state.invoices = JSON.parse(localStorage.getItem("direction.invoices") || "[]").map(normalizeInvoice);
}

function saveSession(session) {
  state.session = session;
  localStorage.setItem("direction.supabaseSession", JSON.stringify(session));
}

function clearSession() {
  state.session = null;
  state.remoteReady = false;
  state.transactions = [];
  state.invoices = [];
  localStorage.removeItem("direction.supabaseSession");
}

function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem("direction.supabaseSession") || "null");
    if (session?.access_token && session?.refresh_token) state.session = session;
  } catch (error) {
    clearSession();
  }
}

function sessionExpiresSoon() {
  if (!state.session?.expires_at) return false;
  return state.session.expires_at * 1000 - Date.now() < 60000;
}

function supabaseHeaders(extra = {}) {
  const token = state.session?.access_token || supabaseConfig.anonKey;
  return {
    apikey: supabaseConfig.anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function authRequest(path, body) {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseConfig.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || payload.message || "Nao foi possivel entrar.");
  }
  return payload;
}

async function refreshSessionIfNeeded() {
  if (!state.session?.refresh_token || !sessionExpiresSoon()) return;
  const session = await authRequest("token?grant_type=refresh_token", {
    refresh_token: state.session.refresh_token,
  });
  saveSession(session);
}

async function supabaseRequest(path, options = {}) {
  await refreshSessionIfNeeded();
  const response = await fetch(`${supabaseConfig.url}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function toDbTransaction(item) {
  return {
    id: item.id,
    transaction_date: item.date,
    amount: item.amount,
    description: item.description,
    scope: item.scope,
    source: item.source,
    kind: item.kind,
    installment_id: item.installment_id,
    installment_number: item.installment_number,
    installment_count: item.installment_count,
    installment_total: item.installment_total,
    created_at: item.created_at,
  };
}

function fromDbTransaction(item) {
  return normalizeTransaction({
    id: item.id,
    date: item.transaction_date,
    amount: item.amount,
    description: item.description,
    scope: item.scope,
    source: item.source,
    kind: item.kind,
    installment_id: item.installment_id,
    installment_number: item.installment_number,
    installment_count: item.installment_count,
    installment_total: item.installment_total,
    created_at: item.created_at,
  });
}

function toDbInvoice(item) {
  return {
    id: item.id,
    source: item.source,
    scope: item.scope,
    month_key: item.month_key,
    total: item.total,
    due_date: item.due_date,
    created_at: item.created_at,
  };
}

function fromDbInvoice(item) {
  return normalizeInvoice(item);
}

async function loadRemote() {
  const [transactions, invoices] = await Promise.all([
    supabaseRequest("finance_transactions?select=*&order=transaction_date.desc,created_at.desc"),
    supabaseRequest("finance_invoice_checks?select=*&order=created_at.desc"),
  ]);
  state.transactions = transactions.map(fromDbTransaction);
  state.invoices = invoices.map(fromDbInvoice);
  state.remoteReady = true;
  saveLocal();
  els.storageStatus.textContent = "Supabase conectado";
}

async function loadData() {
  if (!state.session?.access_token) {
    state.remoteReady = false;
    return;
  }
  try {
    await loadRemote();
  } catch (error) {
    state.remoteReady = false;
    els.storageStatus.textContent = "Login sem sincronizar";
    console.warn("Supabase indisponivel:", error.message);
    throw error;
  }
}

async function insertRemoteTransactions(records) {
  if (!state.remoteReady) return;
  await supabaseRequest("finance_transactions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(records.map(toDbTransaction)),
  });
}

async function updateRemoteTransaction(record) {
  if (!state.remoteReady) return;
  await supabaseRequest(`finance_transactions?id=eq.${encodeURIComponent(record.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbTransaction(record)),
  });
}

async function deleteRemoteTransaction(id) {
  if (!state.remoteReady) return;
  await supabaseRequest(`finance_transactions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

async function insertRemoteInvoice(record) {
  if (!state.remoteReady) return;
  await supabaseRequest("finance_invoice_checks", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toDbInvoice(record)),
  });
}

async function deleteRemoteInvoice(id) {
  if (!state.remoteReady) return;
  await supabaseRequest(`finance_invoice_checks?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

function normalizeTransaction(item) {
  const scope = item.scope || "personal";
  const kind = item.kind || item.type || "expense";
  const scopeSources = sourceOptionsByKind[kind]?.[scope] || sourceOptionsByScope[scope] || sourceOptionsByScope.personal;
  const source = sourceOptions.includes(item.source) ? item.source : scopeSources[0];
  return {
    id: item.id || createId(),
    date: item.date || item.due_date || todayISO(),
    amount: Number(item.amount) || 0,
    description: item.description || item.category || "Sem descricao",
    scope,
    source,
    kind,
    installment_id: item.installment_id || null,
    installment_number: Number(item.installment_number) || null,
    installment_count: Number(item.installment_count) || null,
    installment_total: Number(item.installment_total) || null,
    created_at: item.created_at || new Date().toISOString(),
  };
}

function belongsToScope(item, scope) {
  const validSources = sourceOptionsByKind[item.kind]?.[scope] || sourceOptionsByScope[scope] || [];
  return item.scope === scope && validSources.includes(item.source);
}

function normalizeInvoice(item) {
  const scope = item.scope || "personal";
  const scopeSources = sourceOptionsByScope[scope] || sourceOptionsByScope.personal;
  return {
    id: item.id || createId(),
    source: scopeSources.includes(item.source) ? item.source : scopeSources[0],
    total: Number(item.total) || 0,
    due_date: item.due_date || todayISO(),
    scope,
    month_key: item.month_key || activeMonthKey(),
    created_at: item.created_at || new Date().toISOString(),
  };
}

function currentScopeItems() {
  const source = els.sourceFilter.value;
  const scope = activeScope();
  return state.transactions
    .filter((item) => belongsToScope(item, scope))
    .filter((item) => monthKey(item.date) === activeMonthKey())
    .filter((item) => source === "all" || item.source === source)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}

function totals(items) {
  const income = items.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = items.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.amount, 0);
  return { income, expenses, balance: income - expenses };
}

function groupExpensesByDescription(items) {
  const grouped = new Map();
  items
    .filter((item) => item.kind === "expense")
    .forEach((item) => grouped.set(item.description, (grouped.get(item.description) || 0) + item.amount));
  return [...grouped.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);
}

function renderKpis(items) {
  const summary = totals(items);
  const expenseShare = summary.income > 0 ? Math.round((summary.expenses / summary.income) * 100) : 0;
  const burnRate = summary.expenses > 0 ? Math.round((summary.balance / summary.expenses) * 100) : 0;
  const scope = activeScope();

  els.incomeKpi.textContent = brl.format(summary.income);
  els.expenseKpi.textContent = brl.format(summary.expenses);
  els.balanceKpi.textContent = brl.format(summary.balance);
  els.focusLabel.textContent = scope === "business" ? "Margem operacional" : "Consumo da renda";
  els.focusKpi.textContent = scope === "business" ? `${burnRate}%` : `${expenseShare}%`;
  els.focusKpi.className = scope === "business" && burnRate < 0 ? "negative" : "";
}

function renderDirection(items) {
  const grouped = groupExpensesByDescription(items);
  const summary = totals(items);
  const scope = activeScope();
  const viewSources = sourceOptionsByScope[scope];
  const topExpense = grouped[0];
  const recurringSources = viewSources
    .map((source) => ({
      source,
      total: items.filter((item) => item.kind === "expense" && item.source === source).reduce((sum, item) => sum + item.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)[0];

  const cards = scope === "business"
    ? [
        ["Maior frente de custo", topExpense ? `${topExpense.label}: ${brl.format(topExpense.total)}` : "Sem saidas"],
        ["ROI manual", summary.income > 0 ? `${brl.format(summary.income)} gerados sobre ${brl.format(summary.expenses)}` : "Cadastre entradas para leitura"],
        ["Origem mais usada", recurringSources?.total ? `${recurringSources.source}: ${brl.format(recurringSources.total)}` : "Sem dados"],
      ]
    : [
        ["Maior padrao de consumo", topExpense ? `${topExpense.label}: ${brl.format(topExpense.total)}` : "Sem saidas"],
        ["Custo de vida", `${brl.format(summary.expenses)} no mes civil`],
        ["Origem mais usada", recurringSources?.total ? `${recurringSources.source}: ${brl.format(recurringSources.total)}` : "Sem dados"],
      ];

  els.directionCards.innerHTML = cards
    .map(([title, value]) => `
      <article class="direction-card">
        <span>${title}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join("");
}

function transactionSubtitle(item) {
  return [
    dateFmt.format(new Date(`${item.date}T12:00:00`)),
    scopeLabel(item.scope),
    item.source,
    kindLabel(item.kind),
  ].join(" | ");
}

function renderTransactions(container, items, emptyText = "Nenhum lancamento encontrado.") {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  container.innerHTML = items
    .map((item) => `
      <article class="transaction-row">
        <div class="transaction-main" data-edit="${item.id}" role="button" tabindex="0" title="Clique para editar">
          <strong>${escapeHtml(item.description)}</strong>
          <small>${transactionSubtitle(item)}</small>
        </div>
        <span class="amount ${item.kind}" data-edit="${item.id}" role="button" tabindex="0" title="Clique para editar">${item.kind === "income" ? "+" : "-"} ${brl.format(item.amount)}</span>
        <button class="icon-button" type="button" data-delete="${item.id}" title="Excluir">x</button>
      </article>
    `)
    .join("");
}

function renderAllTransactions() {
  const query = els.searchInput.value.trim().toLowerCase();
  const scope = activeScope();
  const items = state.transactions
    .filter((item) => belongsToScope(item, scope))
    .filter((item) => monthKey(item.date) === activeMonthKey())
    .filter((item) => `${item.description} ${item.source} ${scopeLabel(item.scope)} ${kindLabel(item.kind)}`.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  renderTransactions(els.allTransactionsList, items, "Sem lancamentos no mes selecionado.");
}

function monthlyTransactions() {
  const scope = activeScope();
  return state.transactions
    .filter((item) => belongsToScope(item, scope))
    .filter((item) => monthKey(item.date) === activeMonthKey());
}

function groupBySource(items, kind) {
  const grouped = new Map();
  items
    .filter((item) => item.kind === kind)
    .forEach((item) => grouped.set(item.source, (grouped.get(item.source) || 0) + item.amount));
  return [...grouped.entries()]
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total);
}

function renderPieChart(pieEl, legendEl, totalEl, groups, emptyLabel, colors, chartName) {
  const total = groups.reduce((sum, item) => sum + item.total, 0);
  totalEl.textContent = brl.format(total);

  if (!total) {
    pieEl.style.background = "rgba(15, 23, 42, 0.72)";
    pieEl.innerHTML = `<span>${emptyLabel}</span>`;
    legendEl.innerHTML = `<div class="empty-state compact">Sem dados no mes.</div>`;
    return;
  }

  let cursor = 0;
  const slices = groups.map((item, index) => {
    const start = cursor;
    const percent = (item.total / total) * 100;
    const end = cursor + percent;
    cursor = end;
    return {
      color: colors[index % colors.length],
      offset: start,
      percent,
      source: item.source,
    };
  });

  pieEl.style.background = "transparent";
  pieEl.innerHTML = `
    <svg class="pie-svg" viewBox="0 0 100 100" aria-hidden="true">
      ${slices
        .map((slice) => `
          <circle
            class="pie-slice"
            data-chart="${chartName}"
            data-source="${escapeHtml(slice.source)}"
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke="${slice.color}"
            stroke-width="20"
            pathLength="100"
            stroke-dasharray="${slice.percent} ${100 - slice.percent}"
            stroke-dashoffset="${-slice.offset}"
          ></circle>
        `)
        .join("")}
    </svg>
    <span>${brl.format(total)}</span>
  `;
  legendEl.innerHTML = groups
    .map((item, index) => `
      <button class="legend-row" type="button" data-chart="${chartName}" data-source="${escapeHtml(item.source)}">
        <i style="background:${colors[index % colors.length]}"></i>
        <span>${escapeHtml(item.source)}</span>
        <strong>${brl.format(item.total)}</strong>
      </button>
    `)
    .join("");
}

function renderCharts() {
  const items = monthlyTransactions();
  renderPieChart(els.incomePie, els.incomeChartLegend, els.incomeChartTotal, groupBySource(items, "income"), "Entradas", incomeChartColors, "income");
  renderPieChart(els.expensePie, els.expenseChartLegend, els.expenseChartTotal, groupBySource(items, "expense"), "Saidas", expenseChartColors, "expense");
}

function renderMonthlyBreakdown() {
  const items = monthlyTransactions().sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  const incomeItems = items.filter((item) => item.kind === "income");
  const expenseItems = items.filter((item) => item.kind === "expense");
  els.incomeListTotal.textContent = brl.format(incomeItems.reduce((sum, item) => sum + item.amount, 0));
  els.expenseListTotal.textContent = brl.format(expenseItems.reduce((sum, item) => sum + item.amount, 0));
  renderTransactions(els.incomeTransactionsList, incomeItems, "Sem entradas no mes selecionado.");
  renderTransactions(els.expenseTransactionsList, expenseItems, "Sem saidas no mes selecionado.");
}

function renderInvoices() {
  const latest = state.invoices[0];
  if (!latest) {
    els.invoiceSummary.innerHTML = `
      <article class="invoice-card">
        <span>Total devido</span>
        <strong>${brl.format(0)}</strong>
        <small class="muted">Cadastre uma fatura para comparar com os lancamentos do mes.</small>
      </article>
    `;
    els.invoiceList.innerHTML = `<div class="empty-state">Nenhuma fatura consultada.</div>`;
    return;
  }

  const launched = state.transactions
    .filter((item) => item.kind === "expense")
    .filter((item) => item.scope === latest.scope)
    .filter((item) => item.source === latest.source)
    .filter((item) => monthKey(item.date) === latest.month_key)
    .reduce((sum, item) => sum + item.amount, 0);
  const missing = Math.max(latest.total - launched, 0);

  els.invoiceSummary.innerHTML = `
      <article class="invoice-card">
        <span>Total devido</span>
        <strong>${brl.format(latest.total)}</strong>
      <small>${latest.source} | ${scopeLabel(latest.scope)} | vence em ${dateFmt.format(new Date(`${latest.due_date}T12:00:00`))}</small>
    </article>
    <article class="invoice-card">
      <span>Ja lancado</span>
      <strong>${brl.format(launched)}</strong>
      <small>Somente saidas do mes selecionado</small>
    </article>
    <article class="invoice-card ${missing > 0 ? "warning-card" : "ok-card"}">
      <span>Saldo a lancar</span>
      <strong>${brl.format(missing)}</strong>
      <small>${missing > 0 ? "Pode haver algo esquecido" : "Fatura coberta pelos lancamentos"}</small>
    </article>
  `;

  els.invoiceList.innerHTML = state.invoices
    .map((invoice) => `
      <article class="transaction-row">
        <div class="transaction-main">
          <strong>${invoice.source} | ${scopeLabel(invoice.scope)}</strong>
          <small>${invoice.month_key} | vencimento ${dateFmt.format(new Date(`${invoice.due_date}T12:00:00`))}</small>
        </div>
        <span class="amount">${brl.format(invoice.total)}</span>
        <button class="icon-button" type="button" data-delete-invoice="${invoice.id}" title="Excluir">x</button>
      </article>
    `)
    .join("");
}

function renderAll() {
  syncPeriodControls();
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === state.view));
  const scope = activeScope();
  document.body.classList.toggle("business-mode", scope === "business");
  document.body.classList.toggle("personal-mode", scope === "personal");
  els.scopeBanner.classList.toggle("business-banner", scope === "business");
  els.scopeBanner.classList.toggle("personal-banner", scope === "personal");
  els.scopeBanner.innerHTML = scope === "business"
    ? "<span>Visao ativa</span><strong>Voce esta lancando em: Empresa</strong>"
    : "<span>Visao ativa</span><strong>Voce esta lancando em: Pessoal</strong>";
  els.quickForm.dataset.scope = scope;
  els.transactionForm.dataset.scope = scope;
  els.expenseQuickForm.dataset.scope = scope;
  els.expenseTransactionForm.dataset.scope = scope;
  els.viewTitle.textContent = scope === "business" ? "Visao Estrategica" : "Visao Vida";
  els.viewEyebrow.textContent = scope === "business" ? "Empresa no mes civil" : "Pessoal no mes civil";
  updateInstallmentVisibility();

  updateSourceControls();
  const items = currentScopeItems();
  renderKpis(items);
  renderDirection(items);
  renderTransactions(els.transactionsList, items, "Sem lancamentos nesta visao.");
  renderAllTransactions();
  renderCharts();
  renderMonthlyBreakdown();
  renderInvoices();
}

function quickParse(text) {
  const match = String(text || "").trim().match(/^(-?\d+(?:[.,]\d{1,2})?)\s+(.+)$/);
  if (!match) return null;
  const amount = parseMoney(match[1]);
  const description = match[2].trim();
  if (!amount || !description) return null;
  return { amount, description };
}

function addTransaction(data) {
  const record = normalizeTransaction({
    id: createId(),
    date: data.date || todayISO(),
    amount: data.amount,
    description: data.description,
    scope: data.scope || state.view,
    source: data.source || els.quickSource.value,
    kind: data.kind || "expense",
    installment_id: data.installment_id,
    installment_number: data.installment_number,
    installment_count: data.installment_count,
    installment_total: data.installment_total,
    created_at: new Date().toISOString(),
  });
  state.transactions = [record, ...state.transactions];
  saveLocal();
  els.storageStatus.textContent = "Salvo localmente";
  renderAll();
  insertRemoteTransactions([record])
    .then(() => { els.storageStatus.textContent = "Supabase conectado"; })
    .catch((error) => {
      els.storageStatus.textContent = "Salvo localmente";
      console.warn("Falha ao salvar no Supabase:", error.message);
    });
}

function addTransactions(records) {
  const normalized = records.map((record) => normalizeTransaction({
    id: createId(),
    created_at: new Date().toISOString(),
    ...record,
  }));
  state.transactions = [...normalized, ...state.transactions];
  saveLocal();
  els.storageStatus.textContent = "Salvo localmente";
  renderAll();
  insertRemoteTransactions(normalized)
    .then(() => { els.storageStatus.textContent = "Supabase conectado"; })
    .catch((error) => {
      els.storageStatus.textContent = "Salvo localmente";
      console.warn("Falha ao salvar parcelas no Supabase:", error.message);
    });
}

function createTransaction(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const amount = parseMoney(form.get("amount"));
  const description = form.get("description").trim();
  if (!amount || !description) return;
  const scope = event.currentTarget.dataset.scope || activeScope();
  const kind = event.currentTarget.dataset.kind || "expense";
  const isInstallment = kind === "expense" && scope === "personal" && form.get("isInstallment") === "on";

  if (isInstallment) {
    const count = Number.parseInt(form.get("installmentCount"), 10);
    if (!Number.isFinite(count) || count < 2) return;
    const startDate = form.get("date") || todayISO();
    const installmentId = createId();
    const total = parseMoney(form.get("installmentTotal")) || amount;
    const baseAmount = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - baseAmount * count) * 100) / 100;
    const records = Array.from({ length: count }, (_, index) => ({
      date: addMonthsISO(startDate, index),
      amount: Number((baseAmount + (index === 0 ? remainder : 0)).toFixed(2)),
      description: `${description} (${index + 1}/${count})`,
      scope,
      source: form.get("source"),
      kind,
      installment_id: installmentId,
      installment_number: index + 1,
      installment_count: count,
      installment_total: total,
    }));
    addTransactions(records);
    event.currentTarget.reset();
    setInitialDates();
    return;
  }

  addTransaction({
    date: form.get("date") || todayISO(),
    amount,
    description,
    scope,
    source: form.get("source"),
    kind,
  });
  event.currentTarget.reset();
  setInitialDates();
}

function createQuickTransaction(event) {
  event.preventDefault();
  const input = event.currentTarget.elements.quick;
  const source = event.currentTarget.closest(".panel").querySelector("select").value;
  const parsed = quickParse(input.value);
  if (!parsed) {
    input.focus();
    return;
  }
  addTransaction({
    ...parsed,
    date: todayISO(),
    scope: event.currentTarget.dataset.scope || activeScope(),
    source,
    kind: event.currentTarget.dataset.kind || "expense",
  });
  input.value = "";
  input.focus();
}

function createInvoice(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const total = parseMoney(form.get("total"));
  if (!total) return;
  const record = normalizeInvoice({
    id: createId(),
    source: form.get("source"),
    total,
    due_date: form.get("dueDate"),
    scope: event.currentTarget.dataset.scope || "business",
    month_key: activeMonthKey(),
    created_at: new Date().toISOString(),
  });
  state.invoices = [record, ...state.invoices];
  saveLocal();
  event.currentTarget.reset();
  setInitialDates();
  renderAll();
  insertRemoteInvoice(record).catch((error) => console.warn("Falha ao salvar fatura no Supabase:", error.message));
}

function sourceOptionsFor(item) {
  return sourceOptionsByKind[item.kind]?.[item.scope] || sourceOptionsByScope[item.scope] || sourceOptionsByScope.personal;
}

function openEditDialog(id) {
  const item = state.transactions.find((transaction) => transaction.id === id);
  if (!item) return;
  const form = els.editForm;
  form.elements.id.value = item.id;
  form.elements.date.value = item.date;
  form.elements.amount.value = String(item.amount).replace(".", ",");
  form.elements.description.value = item.description;
  form.elements.kind.value = item.kind;
  form.elements.scope.value = item.scope;
  fillSelect(form.elements.source, sourceOptionsFor(item), item.source);
  if (typeof els.editDialog.showModal === "function") {
    els.editDialog.showModal();
  } else {
    els.editDialog.setAttribute("open", "");
  }
}

function closeEditDialog() {
  if (els.editDialog.open && typeof els.editDialog.close === "function") {
    els.editDialog.close();
    return;
  }
  els.editDialog.removeAttribute("open");
}

function updateEditSourceOptions() {
  const id = els.editForm.elements.id.value;
  const current = state.transactions.find((transaction) => transaction.id === id);
  if (!current) return;
  const draft = { ...current, kind: els.editForm.elements.kind.value, scope: els.editForm.elements.scope.value };
  fillSelect(els.editForm.elements.source, sourceOptionsFor(draft), els.editForm.elements.source.value);
}

function saveEdit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const id = form.get("id");
  const amount = parseMoney(form.get("amount"));
  const description = form.get("description").trim();
  if (!id || !amount || !description) return;

  let updatedRecord = null;
  state.transactions = state.transactions.map((item) => {
    if (item.id !== id) return item;
    updatedRecord = normalizeTransaction({
      ...item,
      date: form.get("date") || todayISO(),
      amount,
      description,
      kind: form.get("kind"),
      scope: form.get("scope"),
      source: form.get("source"),
    });
    return updatedRecord;
  });
  saveLocal();
  els.storageStatus.textContent = "Alteracao salva";
  closeEditDialog();
  renderAll();
  if (updatedRecord) {
    updateRemoteTransaction(updatedRecord).catch((error) => console.warn("Falha ao atualizar no Supabase:", error.message));
  }
}

function handleDelete(event) {
  const transactionButton = event.target.closest("[data-delete]");
  if (transactionButton) {
    const id = transactionButton.dataset.delete;
    state.transactions = state.transactions.filter((item) => item.id !== transactionButton.dataset.delete);
    saveLocal();
    renderAll();
    deleteRemoteTransaction(id).catch((error) => console.warn("Falha ao excluir no Supabase:", error.message));
    return;
  }

  const invoiceButton = event.target.closest("[data-delete-invoice]");
  if (invoiceButton) {
    const id = invoiceButton.dataset.deleteInvoice;
    state.invoices = state.invoices.filter((item) => item.id !== invoiceButton.dataset.deleteInvoice);
    saveLocal();
    renderAll();
    deleteRemoteInvoice(id).catch((error) => console.warn("Falha ao excluir fatura no Supabase:", error.message));
  }
}

function handleEditClick(event) {
  if (event.target.closest("[data-delete], [data-delete-invoice]")) return;
  const editable = event.target.closest("[data-edit]");
  if (editable) openEditDialog(editable.dataset.edit);
}

function handleEditKey(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const editable = event.target.closest("[data-edit]");
  if (!editable) return;
  event.preventDefault();
  openEditDialog(editable.dataset.edit);
}

function highlightChartSource(chartName, source) {
  document.querySelectorAll(`[data-chart="${chartName}"]`).forEach((item) => {
    item.classList.toggle("active-chart-item", item.dataset.source === source);
  });
}

function handleChartClick(event) {
  const chartItem = event.target.closest("[data-chart][data-source]");
  if (!chartItem) return;
  highlightChartSource(chartItem.dataset.chart, chartItem.dataset.source);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ transactions: state.transactions, invoices: state.invoices }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `direcao-financeira-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function loadSeedData() {
  const now = todayISO();
  state.transactions = [
    normalizeTransaction({ date: now, amount: 850, description: "Marketing", scope: "business", source: "Boleto", kind: "expense" }),
    normalizeTransaction({ date: now, amount: 129, description: "Software", scope: "business", source: "Asaas", kind: "expense" }),
    normalizeTransaction({ date: now, amount: 4200, description: "Venda mentoria", scope: "business", source: "Eduzz", kind: "income" }),
    normalizeTransaction({ date: now, amount: 380, description: "Supermercado", scope: "personal", source: "Cartao A", kind: "expense" }),
    normalizeTransaction({ date: now, amount: 74, description: "Almoco", scope: "personal", source: "Pix", kind: "expense" }),
  ];
  state.invoices = [];
  saveLocal();
  renderAll();
}

function clearData() {
  if (!window.confirm("Limpar todos os dados locais deste app?")) return;
  state.transactions = [];
  state.invoices = [];
  saveLocal();
  renderAll();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function setInitialDates() {
  els.transactionForm.elements.date.value = todayISO();
  els.expenseTransactionForm.elements.date.value = todayISO();
  els.invoiceForm.elements.dueDate.value = todayISO();
  syncSourceDefaults();
  updateInstallmentVisibility();
}

function syncPeriodControls() {
  if (!els.monthSelect.options.length) {
    els.monthSelect.innerHTML = monthNames
      .map((name, index) => `<option value="${index}">${name.charAt(0).toUpperCase()}${name.slice(1)}</option>`)
      .join("");
  }

  if (!els.yearSelect.options.length) {
    const currentYear = new Date().getFullYear();
    els.yearSelect.innerHTML = Array.from({ length: 9 }, (_, index) => currentYear - 4 + index)
      .map((year) => `<option value="${year}">${year}</option>`)
      .join("");
  }

  els.monthSelect.value = String(state.month.getMonth());
  els.yearSelect.value = String(state.month.getFullYear());
}

function updatePeriodFromControls() {
  state.month = new Date(Number(els.yearSelect.value), Number(els.monthSelect.value), 1);
  renderAll();
}

function optionHtml(options, selectedValue) {
  return options
    .map((option) => `<option value="${escapeHtml(option)}"${option === selectedValue ? " selected" : ""}>${escapeHtml(option)}</option>`)
    .join("");
}

function fillSelect(select, options, selectedValue) {
  const fallback = options.includes(selectedValue) ? selectedValue : options[0];
  select.innerHTML = optionHtml(options, fallback);
  select.value = fallback;
}

function selectedFormScope(form, fallback = state.view) {
  return form.elements.scope?.value || fallback;
}

function syncSourceDefaults() {
  const transactionScope = activeScope();
  const expenseScope = activeScope();
  const invoiceScope = els.invoiceForm.dataset.scope || "business";
  fillSelect(els.transactionForm.elements.source, sourceOptionsByKind.income[transactionScope], els.quickSource.value);
  fillSelect(els.expenseTransactionForm.elements.source, sourceOptionsByKind.expense[expenseScope], els.expenseQuickSource.value);
  fillSelect(els.invoiceForm.elements.source, sourceOptionsByScope[invoiceScope], els.quickSource.value);
}

function updateSourceControls() {
  const currentQuickSource = els.quickSource.value;
  const currentExpenseQuickSource = els.expenseQuickSource.value;
  const scope = activeScope();
  const viewSources = [...new Set([...sourceOptionsByKind.income[scope], ...sourceOptionsByKind.expense[scope]])];
  fillSelect(els.quickSource, sourceOptionsByKind.income[scope], currentQuickSource);
  fillSelect(els.expenseQuickSource, sourceOptionsByKind.expense[scope], currentExpenseQuickSource);
  fillSelect(els.sourceFilter, ["Todas as origens", ...viewSources], els.sourceFilter.value === "all" ? "Todas as origens" : els.sourceFilter.value);
  els.sourceFilter.options[0].value = "all";
  syncSourceDefaults();
}

function updateInstallmentVisibility() {
  const isPersonal = activeScope() === "personal";
  els.installmentPanel.hidden = !isPersonal;
  if (!isPersonal) {
    els.expenseTransactionForm.elements.isInstallment.checked = false;
  }
  const fields = els.installmentPanel.querySelector(".installment-fields");
  fields.hidden = !isPersonal || !els.expenseTransactionForm.elements.isInstallment.checked;
  if (!fields.hidden && !els.expenseTransactionForm.elements.installmentTotal.value) {
    els.expenseTransactionForm.elements.installmentTotal.value = els.expenseTransactionForm.elements.amount.value;
  }
}

function showLogin(message = "") {
  els.authScreen.hidden = false;
  els.sidebar.hidden = true;
  els.appShell.hidden = true;
  els.authMessage.textContent = message;
  els.authMessage.classList.toggle("error", Boolean(message));
}

function showApp() {
  els.authScreen.hidden = true;
  els.sidebar.hidden = false;
  els.appShell.hidden = false;
}

async function login(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || !password) return;

  els.authMessage.textContent = "Entrando...";
  els.authMessage.classList.remove("error");
  els.loginForm.querySelector("button").disabled = true;

  try {
    const session = await authRequest("token?grant_type=password", { email, password });
    saveSession(session);
    els.loginForm.reset();
    await loadData();
    showApp();
    updateSourceControls();
    setInitialDates();
    renderAll();
  } catch (error) {
    showLogin("E-mail ou senha nao autorizado.");
    console.warn("Falha no login:", error.message);
  } finally {
    els.loginForm.querySelector("button").disabled = false;
  }
}

async function logout() {
  try {
    if (state.session?.access_token) {
      await fetch(`${supabaseConfig.url}/auth/v1/logout`, {
        method: "POST",
        headers: supabaseHeaders(),
      });
    }
  } catch (error) {
    console.warn("Falha ao encerrar sessao no Supabase:", error.message);
  }
  clearSession();
  showLogin("Sessao encerrada.");
}

function bindEvents() {
  els.loginForm.addEventListener("submit", login);
  els.logoutButton.addEventListener("click", logout);
  els.monthSelect.addEventListener("change", updatePeriodFromControls);
  els.yearSelect.addEventListener("change", updatePeriodFromControls);
  document.querySelectorAll(".nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav a").forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      renderAll();
    });
  });
  els.quickSource.addEventListener("change", syncSourceDefaults);
  els.expenseQuickSource.addEventListener("change", syncSourceDefaults);
  els.expenseTransactionForm.elements.isInstallment.addEventListener("change", updateInstallmentVisibility);
  els.quickForm.addEventListener("submit", createQuickTransaction);
  els.expenseQuickForm.addEventListener("submit", createQuickTransaction);
  els.transactionForm.addEventListener("submit", createTransaction);
  els.expenseTransactionForm.addEventListener("submit", createTransaction);
  els.invoiceForm.addEventListener("submit", createInvoice);
  els.editForm.addEventListener("submit", saveEdit);
  els.editForm.elements.kind.addEventListener("change", updateEditSourceOptions);
  els.editForm.elements.scope.addEventListener("change", updateEditSourceOptions);
  els.closeEditButton.addEventListener("click", closeEditDialog);
  els.cancelEditButton.addEventListener("click", closeEditDialog);
  els.editDialog.addEventListener("click", (event) => {
    if (event.target === els.editDialog) closeEditDialog();
  });
  els.sourceFilter.addEventListener("change", renderAll);
  els.searchInput.addEventListener("input", renderAll);
  document.addEventListener("click", handleDelete);
  document.addEventListener("click", handleEditClick);
  document.addEventListener("click", handleChartClick);
  document.addEventListener("keydown", handleEditKey);
  els.exportButton.addEventListener("click", exportData);
  els.seedButton.addEventListener("click", loadSeedData);
  els.clearButton.addEventListener("click", clearData);
}

async function boot() {
  updateSourceControls();
  setInitialDates();
  bindEvents();
  loadSession();
  if (!state.session?.access_token) {
    showLogin();
    return;
  }
  try {
    await loadData();
    showApp();
    renderAll();
  } catch (error) {
    console.warn("Sessao expirada ou invalida:", error.message);
    clearSession();
    showLogin("Entre novamente para acessar seus dados.");
  }
}

boot().catch((error) => {
  console.error("Falha ao iniciar app:", error);
  updateSourceControls();
  setInitialDates();
  bindEvents();
  showLogin("Entre para acessar o painel.");
});
