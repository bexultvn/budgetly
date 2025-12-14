$(function () {
  const data = requireAuth();
  renderUserBadge(data.user);
  setActiveNav('dashboard');
  initSidebarToggle();

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

  budgets.forEach((budget) => {
    const stats = getBudgetStats(budget);
    const bar = $(`
      <div class="bar">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="budget-title"><span class="icon-circle">${budget.icon}</span> ${budget.title}</div>
          <span class="pill ${stats.percent > 90 ? 'warn' : 'success'}">${Math.round(stats.percent)}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="height:0%"></div>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <small class="muted">${formatCurrency(stats.spent)} spent</small>
          <small class="muted">${formatCurrency(stats.remaining)} left</small>
        </div>
      </div>
    `);
    container.append(bar);
    setTimeout(() => {
      bar.find('.bar-fill').css('height', `${stats.percent}%`);
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
