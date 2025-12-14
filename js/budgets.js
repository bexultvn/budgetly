let selectedBudgetId = null;

$(function () {
  requireAuth();
  const data = getData();
  renderSidebar('budgets');
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

  $('#openBudgetModal').on('click', () => {
    resetBudgetForm();
    openModal('#budgetModal');
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

  $('#budgetForm').on('submit', function (e) {
    e.preventDefault();
    const title = $('#budgetTitle').val().trim();
    const limit = $('#budgetLimit').val().trim();
    const icon = $('#budgetIcon').val();
    if (!title || !limit) return;

    const editingId = $('#budgetForm').data('editing');
    if (editingId) {
      updateBudget(editingId, { title, limit, icon });
      selectedBudgetId = editingId;
    } else {
      addBudget({
        title,
        limit,
        icon,
        expenses: [],
      });
    }
    $('#budgetForm')[0].reset();
    $('#budgetForm').data('editing', '');
    $('#budgetModal .modal-header h3').text('New Budget');
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

  $('#inlineExpenseForm').on('submit', function (e) {
    e.preventDefault();
    if (!selectedBudgetId) {
      alert('Please select a budget first.');
      return;
    }
    const name = $('#inlineExpenseName').val().trim();
    const amount = $('#inlineExpenseAmount').val();
    const date = $('#inlineExpenseDate').val();
    if (!name || !amount || !date) return;
    addExpense(selectedBudgetId, { name, amount, date });
    $('#inlineExpenseForm')[0].reset();
    $('#inlineExpenseDate').val(new Date().toISOString().slice(0, 10));
    refreshBudgets();
  });

  $('#editBudgetBtn').on('click', () => {
    const data = getData();
    const budget = (data.budgets || []).find((b) => b.id === selectedBudgetId);
    if (!budget) return;
    $('#budgetTitle').val(budget.title);
    $('#budgetLimit').val(budget.limit);
    $('#budgetIcon').val(budget.icon);
    $('#budgetForm').data('editing', budget.id);
    $('#budgetModal .modal-header h3').text('Edit Budget');
    openModal('#budgetModal');
  });

  $('#deleteBudgetBtn').on('click', () => {
    if (!selectedBudgetId) return;
    if (confirm('Delete this budget and its expenses?')) {
      deleteBudget(selectedBudgetId);
      selectedBudgetId = null;
      refreshBudgets();
    }
  });
}

function refreshBudgets() {
  const data = getData();
  const budgets = data.budgets || [];
  if (selectedBudgetId && !budgets.find((b) => b.id === selectedBudgetId)) {
    selectedBudgetId = null;
  }
  renderUserBadge(data.user);
  renderBudgetOptions(budgets);
  renderBudgetCards(budgets);
  renderBudgetDetail(budgets.find((b) => b.id === selectedBudgetId));
  toggleBudgetStates(budgets.length);
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
    $('#emptyBudgetsState').removeClass('hidden');
    return;
  }

  $('#emptyBudgetsState').addClass('hidden');

  budgets.forEach((budget) => {
    const stats = getBudgetStats(budget);
    const percent = Math.round(stats.percent) || 0;
    const progressClass = percent > 95 ? 'danger' : percent > 75 ? 'warning' : '';
    const card = $(`
      <div class="card budget-card ${selectedBudgetId === budget.id ? 'selected' : ''}" data-id="${budget.id}">
        <div class="budget-card-head">
          <div class="budget-title">
            <div class="icon-circle primary">${budget.icon}</div>
            <div>
              <strong>${budget.title}</strong>
              <div class="muted">${(budget.expenses || []).length || 0} item${(budget.expenses || []).length === 1 ? '' : 's'}</div>
            </div>
          </div>
          <div class="budget-limit">${formatCurrency(budget.limit)}</div>
        </div>
        <div class="budget-meta">
          <span>${formatCurrency(stats.spent)} spend</span>
          <span class="muted">${formatCurrency(stats.remaining)} remaining</span>
        </div>
        <div class="progress ${progressClass}">
          <span style="width:0%"></span>
        </div>
      </div>
    `);

    container.append(card);
    setTimeout(() => {
      card.find('.progress span').css('width', `${percent}%`);
    }, 40);
  });

  $('.budget-card').off('click').on('click', function () {
    const id = $(this).data('id');
    selectedBudgetId = id;
    renderBudgetCards(budgets);
    renderBudgetDetail(budgets.find((b) => b.id === selectedBudgetId));
    $('#budgetList').addClass('hidden');
    $('#budgetActions').addClass('hidden');
    $('#backToBudgets').removeClass('hidden');
    $('#budgetDetailShell').removeClass('hidden');
    $('html, body').animate(
      {
        scrollTop: $('#budgetDetailShell').offset().top - 16,
      },
      250,
    );
  });
}

function renderBudgetDetail(budget) {
  if (!budget) {
    $('#budgetDetailShell').addClass('hidden');
    $('#backToBudgets').addClass('hidden');
    $('#budgetList').removeClass('hidden');
    $('#budgetActions').removeClass('hidden');
    return;
  }

  $('#budgetDetailShell').removeClass('hidden');
  const stats = getBudgetStats(budget);
  const percent = Math.round(stats.percent) || 0;
  $('#detailIcon').text(budget.icon);
  $('#detailTitle').text(budget.title);
  $('#detailMeta').text(`${(budget.expenses || []).length} item${(budget.expenses || []).length === 1 ? '' : 's'}`);
  $('#detailLimit').text(formatCurrency(budget.limit));
  $('#detailSpent').text(formatCurrency(stats.spent));
  $('#detailRemaining').text(formatCurrency(stats.remaining));
  $('#detailExpensesCount').text(`${(budget.expenses || []).length} items`);
  $('#detailProgress')
    .removeClass('warning danger')
    .addClass(percent > 95 ? 'danger' : percent > 75 ? 'warning' : '');
  $('#detailProgress span').css('width', `${percent}%`);

  const rows = $('#detailExpenseRows');
  rows.empty();
  if (!budget.expenses || !budget.expenses.length) {
    $('#detailEmptyState').removeClass('hidden');
  } else {
    $('#detailEmptyState').addClass('hidden');
    budget.expenses.forEach((expense) => {
      rows.append(`
        <tr>
          <td>${expense.name}</td>
          <td>${formatCurrency(expense.amount)}</td>
          <td>${formatDate(expense.date)}</td>
          <td><button class="button ghost delete-expense" data-id="${expense.id}" style="padding:6px 10px;">🗑</button></td>
        </tr>
      `);
    });
  }

  $('.delete-expense')
    .off('click')
    .on('click', function () {
      const id = $(this).data('id');
      deleteExpense(id);
      refreshBudgets();
    });

  $('#inlineExpenseDate').val(new Date().toISOString().slice(0, 10));
}

function toggleBudgetStates(count) {
  if (!count) {
    $('#budgetDetailShell').addClass('hidden');
    $('#emptyBudgetsState').removeClass('hidden');
  } else {
    $('#emptyBudgetsState').addClass('hidden');
    if (!selectedBudgetId) {
      $('#budgetDetailShell').addClass('hidden');
    }
  }
}

$('#backToBudgets').on('click', () => {
  selectedBudgetId = null;
  $('#budgetList').removeClass('hidden');
  $('#budgetActions').removeClass('hidden');
  $('#backToBudgets').addClass('hidden');
  $('#budgetDetailShell').addClass('hidden');
});

function resetBudgetForm() {
  $('#budgetForm')[0].reset();
  $('#budgetForm').data('editing', '');
  $('#budgetModal .modal-header h3').text('New Budget');
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
  const chosen = budgetId || selectedBudgetId;
  if (chosen) {
    $('#expenseBudget').val(chosen);
  }
  $('#expenseDate').val(new Date().toISOString().slice(0, 10));
  if (!budgets.length) {
    alert('Please create a budget first.');
    return;
  }
  openModal('#expenseModal');
}
