$(function () {
  const data = requireAuth();
  renderUserBadge(data.user);
  setActiveNav('dashboard');
  initSidebarToggle();

  if (data.user && data.user.name) {
    $('#welcomeCopy').text(`Welcome, ${data.user.name}. Manage your money with confidence.`);
  } else {
    $('#welcomeCopy').text('Welcome, manage your money with confidence.');
  }

  $('#logoutBtn').on('click', () => {
    logoutUser();
    window.location.href = 'index.html';
  });

  const totals = calculateTotals(data);
  $('#totalBudget').text(formatCurrency(totals.totalBudget));
  $('#totalExpenses').text(formatCurrency(totals.totalExpenses));
  $('#budgetCount').text(totals.budgetsCount);
  $('#expenseCount').text(totals.expenseCount);

  renderActivity(data.budgets);
  renderLatestBudgets(data.budgets);
  renderLatestExpenses(data.budgets);
});

function renderActivity(budgets) {
  const container = $('#budgetActivity');
  container.empty();
  if (!budgets.length) {
    container.append('<div class="empty-state">Create your first budget to see activity.</div>');
    return;
  }

  const maxValue =
    budgets.reduce((max, b) => {
      const stats = getBudgetStats(b);
      return Math.max(max, Number(b.limit) || 0, stats.spent);
    }, 0) || 1;

  container.append(`
    <div class="bar-legend">
      <span class="legend-dot spent"></span> Total Spend
      <span class="legend-dot limit"></span> Budget Limit
    </div>
  `);

  budgets.forEach((budget) => {
    const stats = getBudgetStats(budget);
    const limitHeight = Math.max((Number(budget.limit) / maxValue) * 100, 4);
    const spentHeight = Math.min((stats.spent / maxValue) * 100, 100);

    const bar = $(`
      <div class="bar">
        <div class="bar-stack" title="${budget.title}">
          <div class="bar-limit" style="height:0%" title="Limit: ${formatCurrency(budget.limit)}"></div>
          <div class="bar-spent" style="height:0%" title="Spent: ${formatCurrency(stats.spent)}"></div>
        </div>
        <div class="bar-label">${budget.title}</div>
        <div class="bar-subtext">${formatCurrency(stats.spent)} of ${formatCurrency(budget.limit)}</div>
      </div>
    `);

    container.append(bar);
    setTimeout(() => {
      bar.find('.bar-limit').css('height', `${limitHeight}%`);
      bar.find('.bar-spent').css('height', `${spentHeight}%`);
    }, 40);
  });
}

function renderLatestBudgets(budgets) {
  const list = $('#latestBudgets');
  list.empty();
  const latest = getLatestBudgets(budgets, 4);
  if (!latest.length) {
    list.append('<div class="empty-state">No budgets yet. Add one to start tracking.</div>');
    return;
  }

  latest.forEach((budget) => {
    const stats = getBudgetStats(budget);
    const item = $(`
      <div class="list-item">
        <div class="icon-circle primary">${budget.icon}</div>
        <div style="flex:1;">
          <strong>${budget.title}</strong>
          <div class="muted">${formatCurrency(stats.spent)} of ${formatCurrency(budget.limit)}</div>
          <div class="progress ${stats.percent > 90 ? 'danger' : stats.percent > 70 ? 'warning' : ''}">
            <span style="width:0%"></span>
          </div>
        </div>
        <span class="pill">${Math.round(stats.percent)}%</span>
      </div>
    `);
    list.append(item);
    setTimeout(() => {
      item.find('.progress span').css('width', `${stats.percent}%`);
    }, 40);
  });
}

function renderLatestExpenses(budgets) {
  const list = $('#latestExpenses');
  list.empty();
  const recent = getLatestExpenses(budgets, 5);
  if (!recent.length) {
    list.append('<div class="empty-state">No expenses yet. Log a purchase to see it here.</div>');
    return;
  }
  recent.forEach((expense) => {
    const item = $(`
      <div class="list-item">
        <div class="icon-circle">${expense.icon || '💳'}</div>
        <div style="flex:1;">
          <strong>${expense.name}</strong>
          <div class="muted">${expense.budgetTitle} • ${formatDate(expense.date)}</div>
        </div>
        <span class="stat-value" style="font-size:18px;">${formatCurrency(expense.amount)}</span>
      </div>
    `);
    list.append(item);
  });
}
