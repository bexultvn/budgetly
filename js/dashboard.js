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

  renderOverview(totals);
  renderLatestExpenses(data.budgets);
}

function renderOverview(totals) {
  const remaining = Math.max(totals.totalBudget - totals.totalExpenses, 0);
  const total = remaining + totals.totalExpenses;
  const remainingPercent = total ? (remaining / total) * 100 : 0;
  const $donut = $('#overviewDonut');
  $donut.css('--remain-percent', `${remainingPercent}%`);
  $donut.attr(
    'aria-label',
    `Remaining budget ${formatCurrency(remaining)}, total expenses ${formatCurrency(totals.totalExpenses)}.`,
  );
  $('#overviewRemaining').text(formatCurrency(remaining));
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
        <td><span class="budget">${expense.icon || '💳'} ${expense.budgetTitle || ''}</span></td>
        <td class="amount">${formatCurrency(expense.amount)}</td>
        <td>${expense.name}</td>
        <td class="date">${formatDate(expense.date)}</td>
        <td style="text-align:right;">
          <button class="delete-expense" data-id="${expense.id}" aria-label="Delete expense" title="Delete">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 6h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M8 6v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </td>
      </tr>
    `);
    $tbody.append(row);
  });

  $('.delete-expense')
    .off('click')
    .on('click', function () {
      const id = $(this).data('id');
      showConfirmModal({
        title: 'Delete expense?',
        message: 'This expense will be permanently removed.',
        confirmText: 'Delete expense',
        onConfirm: () => {
          deleteExpense(id);
          refreshDashboard();
        },
      });
    });
}
