$(function () {
  requireAuth();
  renderSidebar('dashboard');
  setActiveNav('dashboard');
  initSidebarToggle();
  initProfileModal();
  refreshDashboard();

  $('#logoutBtn').on('click', () => {
    logoutUser();
    window.location.href = 'index.html';
  });
});

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function filterExpensesByMonth(expenses) {
  const target = getCurrentMonthKey();
  return (expenses || []).filter((exp) => {
    const d = new Date(exp.date);
    if (Number.isNaN(d.getTime())) return false;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key === target;
  });
}

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
  const remaining = Math.max(totals.totalBudget - totals.totalExpenses, 0);
  $('#remainingStat').text(formatCurrency(remaining));
  $('#expenseCount').text(totals.expenseCount);

  renderOverview(totals, remaining);
  renderRiskAndTop(data.budgets);
  renderLatestExpenses(data.budgets);
}

function renderOverview(totals, remainingOverride) {
  const remaining = remainingOverride !== undefined
    ? remainingOverride
    : Math.max(totals.totalBudget - totals.totalExpenses, 0);
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

function renderRiskAndTop(budgets) {
  const monthExpensesByBudget = (budgets || []).map((budget) => {
    const monthlyExpenses = filterExpensesByMonth(budget.expenses);
    const spent = monthlyExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const usage = budget.limit ? (spent / Number(budget.limit)) * 100 : 0;
    return {
      budget,
      spent,
      limit: Number(budget.limit) || 0,
      usage,
      usageDisplay: Math.round(usage * 10) / 10,
    };
  });

  const riskyList = monthExpensesByBudget
    .filter((b) => b.usage >= 80 && b.limit > 0)
    .sort((a, b) => b.usage - a.usage);

  if (riskyList.length) {
    $('#atRiskTitle').addClass('hidden');
    $('#atRiskMeta').addClass('hidden');
    const html = riskyList
      .map(
        (item) =>
          `<div class="at-risk-item">
            <div class="budget-line">
              <span class="budget">${item.budget.icon || '⚠️'} ${item.budget.title}</span>
              <span class="amount">${formatCurrency(item.spent)} / ${formatCurrency(item.limit)}</span>
            </div>
          </div>`,
      )
      .join('');
    $('#atRiskList').html(html);
  } else {
    $('#atRiskTitle').text('None at risk').removeClass('hidden');
    $('#atRiskMeta').text('All under 80%').removeClass('hidden');
    $('#atRiskList').empty();
  }

  const topSpending = monthExpensesByBudget
    .filter((b) => b.spent > 0)
    .sort((a, b) => b.spent - a.spent)[0];

  if (topSpending) {
    $('#topSpendTitle').text(`${topSpending.budget.icon || '💸'} ${topSpending.budget.title}`);
    $('#topSpendMeta').text(`${formatCurrency(topSpending.spent)} / ${formatCurrency(topSpending.limit)}`);
  } else {
    $('#topSpendTitle').text('No spending yet');
    $('#topSpendMeta').text('No expenses logged for this month');
  }
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
        <td data-label="Budget"><span class="budget">${expense.icon || '💳'} ${expense.budgetTitle || ''}</span></td>
        <td class="amount" data-label="Amount">${formatCurrency(expense.amount)}</td>
        <td data-label="Note">${expense.name}</td>
        <td class="date" data-label="Date">${formatDate(expense.date)}</td>
        <td class="actions-cell" data-label="Delete">
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
