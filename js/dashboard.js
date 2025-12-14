$(function () {
  requireAuth();
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
