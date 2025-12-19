$(function () {
  requireAuth();
  const data = getData();
  renderSidebar('expenses');
  renderUserBadge(data.user);
  setActiveNav('expenses');
  initSidebarToggle();
  initProfileModal();
  bindExpenseEvents();
  refreshExpenses();
});

function bindExpenseEvents() {
  $('#logoutBtn').on('click', () => {
    logoutUser();
    window.location.href = 'index.html';
  });

  $('#openExpenseModal').on('click', () => openExpenseModal());

  $('.close-modal').on('click', function () {
    const target = $(this).data('close');
    closeModal(target);
  });

  $('.modal').on('click', function (e) {
    if ($(e.target).hasClass('modal')) {
      closeModal(`#${$(this).attr('id')}`);
    }
  });

  $('#expenseForm').on('submit', function (e) {
    e.preventDefault();
    const budgetId = $('#expenseBudget').val();
    const name = $('#expenseName').val().trim();
    const amount = $('#expenseAmount').val();
    const date = $('#expenseDate').val();
    if (!budgetId || !amount || !date) return;

    addExpense(budgetId, { name, amount, date });
    $('#expenseForm')[0].reset();
    $('#expenseDate').val(new Date().toISOString().slice(0, 10));
    closeModal('#expenseModal');
    refreshExpenses();
  });

  $('#filterBudget').on('change', refreshExpenses);
}

function refreshExpenses() {
  const data = getData();
  const budgets = data.budgets || [];
  renderUserBadge(data.user);
  renderFilterOptions(budgets);
  renderExpenseSelect(budgets);
  renderExpenseTable();
}

function renderFilterOptions(budgets) {
  const $filter = $('#filterBudget');
  const current = $filter.val() || 'all';
  $filter.empty();
  $filter.append('<option value="all">All budgets</option>');
  budgets.forEach((budget) => {
    $filter.append(`<option value="${budget.id}">${budget.icon} ${budget.title}</option>`);
  });
  $filter.val(current);
}

function renderExpenseSelect(budgets) {
  const $select = $('#expenseBudget');
  $select.empty();
  if (!budgets.length) {
    $select.append('<option value="">No budgets available</option>');
    return;
  }
  budgets.forEach((budget) => {
    $select.append(`<option value="${budget.id}">${budget.icon} ${budget.title}</option>`);
  });
  $('#expenseDate').val(new Date().toISOString().slice(0, 10));
}

function renderExpenseTable() {
  const filter = $('#filterBudget').val() || 'all';
  const expenses = getAllExpenses()
    .filter((exp) => (filter === 'all' ? true : exp.budgetId === filter))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const $tbody = $('#expenseTable tbody');
  const $empty = $('#emptyExpenses');
  $tbody.empty();

  if (!expenses.length) {
    $empty.removeClass('hidden');
    return;
  }
  $empty.addClass('hidden');

  expenses.forEach((exp) => {
    const row = $(`
      <tr>
        <td data-label="Budget"><span class="budget">${exp.icon || '💳'} ${exp.budgetTitle}</span></td>
        <td class="amount" data-label="Amount">${formatCurrency(exp.amount)}</td>
        <td data-label="Note">${exp.name}</td>
        <td class="date" data-label="Date">${formatDate(exp.date)}</td>
        <td data-label="" class="actions-cell">
          <button class="delete-expense" data-id="${exp.id}" aria-label="Delete expense" title="Delete">
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

  $('.delete-expense').off('click').on('click', function () {
    const id = $(this).data('id');
    showConfirmModal({
      title: 'Delete expense?',
      message: 'This expense will be permanently removed.',
      confirmText: 'Delete expense',
      onConfirm: () => {
        deleteExpense(id);
        refreshExpenses();
      },
    });
  });
}

function openExpenseModal(budgetId) {
  const budgets = getData().budgets || [];
  if (!budgets.length) {
    alert('Please create a budget first.');
    return;
  }
  renderExpenseSelect(budgets);
  if (budgetId) {
    $('#expenseBudget').val(budgetId);
  }
  $('#expenseDate').val(new Date().toISOString().slice(0, 10));
  openModal('#expenseModal');
}

function openModal(selector) {
  $(selector).addClass('active');
}

function closeModal(selector) {
  $(selector).removeClass('active');
}
