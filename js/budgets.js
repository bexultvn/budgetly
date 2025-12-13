$(function () {
  requireAuth();
  const data = getData();
  renderUserBadge(data.user);
  setActiveNav('budgets');
  initSidebarToggle();
  bindEvents();
  refreshBudgets();
});

function bindEvents() {
  $('#logoutBtn').on('click', () => {
    logoutUser();
    window.location.href = 'index.html';
  });

  $('#openBudgetModal').on('click', () => openModal('#budgetModal'));
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

  $('#budgetForm').on('submit', function (e) {
    e.preventDefault();
    const title = $('#budgetTitle').val().trim();
    const limit = $('#budgetLimit').val().trim();
    const icon = $('#budgetIcon').val();
    if (!title || !limit) return;

    addBudget({
      title,
      limit,
      icon,
      expenses: [],
    });
    $('#budgetForm')[0].reset();
    closeModal('#budgetModal');
    refreshBudgets();
  });

  $('#expenseForm').on('submit', function (e) {
    e.preventDefault();
    const budgetId = $('#expenseBudget').val();
    const name = $('#expenseName').val().trim();
    const amount = $('#expenseAmount').val();
    const date = $('#expenseDate').val();
    if (!budgetId || !name || !amount || !date) return;

    addExpense(budgetId, { name, amount, date });
    $('#expenseForm')[0].reset();
    $('#expenseDate').val(new Date().toISOString().slice(0, 10));
    closeModal('#expenseModal');
    refreshBudgets();
  });
}

function refreshBudgets() {
  const data = getData();
  const budgets = data.budgets || [];
  renderUserBadge(data.user);
  renderBudgetOptions(budgets);
  renderBudgetCards(budgets);
}

function renderBudgetOptions(budgets) {
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

function renderBudgetCards(budgets) {
  const container = $('#budgetList');
  container.empty();
  if (!budgets.length) {
    container.append(`
      <div class="card empty-state">
        <p>No budgets yet. Create one to start tracking.</p>
      </div>
    `);
    return;
  }

  budgets.forEach((budget) => {
    const stats = getBudgetStats(budget);
    const percent = Math.round(stats.percent);
    const progressClass = percent > 95 ? 'danger' : percent > 75 ? 'warning' : '';
    const card = $(`
      <div class="card budget-card">
        <div class="budget-head">
          <div class="budget-title">
            <div class="icon-circle primary">${budget.icon}</div>
            <div>
              <strong>${budget.title}</strong>
              <div class="muted">${(budget.expenses || []).length || 0} expense${(budget.expenses || []).length === 1 ? '' : 's'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="stat-value" style="font-size:18px;">${formatCurrency(budget.limit)}</div>
            <span class="pill">${percent}% used</span>
          </div>
        </div>

        <div class="budget-stats">
          <div class="stat">
            <small>Spent</small>
            <strong>${formatCurrency(stats.spent)}</strong>
          </div>
          <div class="stat">
            <small>Remaining</small>
            <strong>${formatCurrency(stats.remaining)}</strong>
          </div>
          <div class="stat">
            <small>Limit</small>
            <strong>${formatCurrency(budget.limit)}</strong>
          </div>
        </div>

        <div class="progress ${progressClass}">
          <span style="width:0%"></span>
        </div>

        <div class="card-actions">
          <button class="button secondary add-expense" data-id="${budget.id}">+ Add Expense</button>
          <button class="button ghost delete-budget" data-id="${budget.id}">Delete</button>
        </div>

        <div class="empty-list">
          ${(budget.expenses || []).slice(0, 2).map((exp) => `
            <div style="display:flex; justify-content:space-between;">
              <span>${exp.name}</span>
              <span class="muted">${formatCurrency(exp.amount)}</span>
            </div>
          `).join('') || 'No expenses yet.'}
        </div>
      </div>
    `);

    container.append(card);
    setTimeout(() => {
      card.find('.progress span').css('width', `${percent}%`);
    }, 40);
  });

  $('.add-expense').off('click').on('click', function () {
    const id = $(this).data('id');
    openExpenseModal(id);
  });

  $('.delete-budget').off('click').on('click', function () {
    const id = $(this).data('id');
    if (confirm('Delete this budget and its expenses?')) {
      deleteBudget(id);
      refreshBudgets();
    }
  });
}

function openModal(selector) {
  $(selector).addClass('active');
}

function closeModal(selector) {
  $(selector).removeClass('active');
}

function openExpenseModal(budgetId) {
  const budgets = getData().budgets || [];
  renderBudgetOptions(budgets);
  if (budgetId) {
    $('#expenseBudget').val(budgetId);
  }
  $('#expenseDate').val(new Date().toISOString().slice(0, 10));
  if (!budgets.length) {
    alert('Please create a budget first.');
    return;
  }
  openModal('#expenseModal');
}
