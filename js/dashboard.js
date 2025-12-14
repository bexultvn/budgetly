$(function () {
  requireAuth();
  renderSidebar('dashboard');
  setActiveNav('dashboard');
  initSidebarToggle();
  refreshDashboard();

  $('#logoutBtn').on('click', () => {
    logoutUser();
    window.location.href = 'index.html';
  });
});

function refreshDashboard() {
  const data = getData();
  renderUserBadge(data.user);

  if (data.user && data.user.name) {
    $('#welcomeTitle').text(`Hi, ${data.user.name} ✌️`);
    $('#welcomeCopy').text(`Here's what's happening with your money, let's manage your expense.`);
  } else {
    $('#welcomeTitle').text('Hi there ✌️');
    $('#welcomeCopy').text("Here's what's happening with your money, let's manage your expense.");
  }

  const totals = calculateTotals(data);
  $('#totalBudget').text(formatCurrency(totals.totalBudget));
  $('#totalExpenses').text(formatCurrency(totals.totalExpenses));
  $('#budgetCount').text(totals.budgetsCount);
  $('#expenseCount').text(totals.expenseCount);

  renderActivity(data.budgets);
  renderLatestBudgets(data.budgets);
  renderLatestExpenses(data.budgets);
}

function renderActivity(budgets) {
  const container = $('#budgetActivity');
  container.empty();
  if (!budgets.length) {
    container.append('<div class="empty-state">No Budgets</div>');
    return;
  }

  const { ticks, topTick } = buildNiceTicks(budgets);
  const formatTick = (val) => {
    if (val >= 1000) {
      const rounded = Math.round((val / 1000) * 10) / 10;
      return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded}k`;
    }
    return Math.round(val).toString();
  };

  const bars = budgets
    .map((budget) => {
      const stats = getBudgetStats(budget);
      const limit = Number(budget.limit) || 0;
      const spent = stats.spent;
      const limitHeight = Math.min((limit / topTick) * 100, 100);
      const spentHeight = Math.min((spent / topTick) * 100, 100);
      const tooltip = `${budget.title}\nSpent: ${formatCurrency(spent)}\nLimit: ${formatCurrency(limit)}`;
      return `
        <div class="bar-group">
          <div class="bar-stack">
            <div class="bar-col spent" style="height:${spentHeight}%;" data-tip="${tooltip.replace(/\n/g, ' · ')}"></div>
            <div class="bar-col limit" style="height:${limitHeight}%;" data-tip="${tooltip.replace(/\n/g, ' · ')}"></div>
          </div>
          <div class="bar-label">${budget.title}</div>
        </div>
      `;
    })
    .join('');

  container.append(`
    <div class="histogram">
      <div class="histogram-y">
        ${ticks
          .slice()
          .reverse()
          .map((tick) => `<span>${formatTick(tick)}</span>`)
          .join('')}
      </div>
      <div class="histogram-plot">
        <div class="histogram-grid">
          ${ticks.map(() => '<span></span>').join('')}
        </div>
        <div class="histogram-bars">
          ${bars}
        </div>
      </div>
    </div>
    <div class="bar-legend">
      <span class="legend-dot spent"></span> totalSpend
      <span class="legend-dot limit"></span> amount
    </div>
  `);
}

function buildNiceTicks(budgets, tickCount = 5) {
  const rawMax =
    budgets.reduce((max, b) => {
      const stats = getBudgetStats(b);
      return Math.max(max, Number(b.limit) || 0, stats.spent);
    }, 0) || 1;

  const roughStep = rawMax / (tickCount - 1);
  const pow = 10 ** Math.floor(Math.log10(roughStep || 1));
  const d = roughStep / pow;
  let nice;
  if (d <= 1) nice = 1;
  else if (d <= 2) nice = 2;
  else if (d <= 2.5) nice = 2.5;
  else if (d <= 5) nice = 5;
  else nice = 10;
  const step = nice * pow;
  const topTick = step * (tickCount - 1);
  const ticks = Array.from({ length: tickCount }, (_, i) => i * step);
  return { ticks, topTick };
}

function renderLatestBudgets(budgets) {
  const list = $('#latestBudgets');
  list.empty();
  const latest = getLatestBudgets(budgets, 4);
  if (!latest.length) {
    list.append('<div class="empty-state empty-tall">No Budgets</div>');
    return;
  }

  latest.forEach((budget) => {
    const stats = getBudgetStats(budget);
    const percent = Math.round(stats.percent) || 0;
    const progressClass = percent > 90 ? 'danger' : percent > 70 ? 'warning' : '';
    const item = $(`
      <div class="latest-budget-card">
        <div class="lb-head">
          <div class="icon-circle primary">${budget.icon}</div>
          <div class="lb-meta">
            <strong>${budget.title}</strong>
            <div class="muted">${(budget.expenses || []).length} Item${(budget.expenses || []).length === 1 ? '' : 's'}</div>
          </div>
          <div class="lb-amount">${formatCurrency(budget.limit)}</div>
        </div>
        <div class="progress ${progressClass}">
          <span style="width:0%"></span>
        </div>
        <div class="lb-footer">
          <span class="muted">${formatCurrency(stats.spent)} Spend</span>
          <span class="muted">${formatCurrency(stats.remaining)} Remaining</span>
        </div>
      </div>
    `);
    list.append(item);
    setTimeout(() => {
      item.find('.progress span').css('width', `${percent}%`);
    }, 40);
  });
}

function renderLatestExpenses(budgets) {
  const $tbody = $('#latestExpensesBody');
  const $empty = $('#latestExpensesEmpty');
  $tbody.empty();
  const recent = getAllExpenses()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  if (!recent.length) {
    $empty.removeClass('hidden');
    return;
  }
  $empty.addClass('hidden');

  recent.forEach((expense) => {
    const row = $(`
      <tr>
        <td>${expense.name}</td>
        <td><span class="budget">${expense.icon || '💳'} ${expense.budgetTitle || ''}</span></td>
        <td class="amount">${formatCurrency(expense.amount)}</td>
        <td class="date">${formatDate(expense.date)}</td>
        <td style="text-align:right;"><button class="delete-expense" data-id="${expense.id}">Delete</button></td>
      </tr>
    `);
    $tbody.append(row);
  });

  $('.delete-expense')
    .off('click')
    .on('click', function () {
      const id = $(this).data('id');
      deleteExpense(id);
      refreshDashboard();
    });
}
