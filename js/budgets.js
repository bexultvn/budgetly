const DEFAULT_ICON = '💳';
const EMOJI_SET = ['💳', '🏠', '🛒', '🚗', '🍽️', '🎟️', '🎁', '🧾', '✈️', '🎮', '🏋️', '🎧', '🍿', '💻', '🏖️', '📚', '🐾', '🧴', '🚌', '🪴', '🧺', '🍼', '🏥', '🎉', '📦', '💡', '🍎', '🪙', '⛽️'];

let selectedBudgetId = null;

$(function () {
  requireAuth();
  const data = getData();
  renderSidebar('budgets');
  renderUserBadge(data.user);
  setActiveNav('budgets');
  initSidebarToggle();
  initEmojiPicker();
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
    const icon = $('#budgetIcon').val() || DEFAULT_ICON;
    if (!title || !limit) return;

    const editingId = $('#budgetForm').data('editing');
    if (editingId) {
      updateBudget(editingId, { title, limit, icon });
      selectedBudgetId = editingId;
      setBudgetFormMode(false);
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
    setBudgetFormMode(false);
    closeModal('#budgetModal');
    refreshBudgets();
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
    if (!amount || !date) return;
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
    setBudgetIcon(budget.icon || DEFAULT_ICON);
    $('#budgetForm').data('editing', budget.id);
    $('#budgetModal .modal-header h3').text('Edit Budget');
    setBudgetFormMode(true);
    openModal('#budgetModal');
  });

  $('#deleteBudgetBtn').on('click', () => {
    if (!selectedBudgetId) return;
    showConfirmModal({
      title: 'Delete budget?',
      message: 'This will remove the budget and all of its expenses.',
      confirmText: 'Delete budget',
      onConfirm: () => {
        deleteBudget(selectedBudgetId);
        selectedBudgetId = null;
        refreshBudgets();
      },
    });
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
  $('#emptyBudgetsState').addClass('hidden');

  const createCard = $(`
    <div class="card budget-card create-budget-card">
      <div class="create-inner">
        <div class="create-icon">+</div>
        <div class="create-text">
          <div class="create-line">Create New Budget</div>
        </div>
      </div>
    </div>
  `);
  createCard.on('click', () => {
    resetBudgetForm();
    openModal('#budgetModal');
  });
  container.append(createCard);

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
    if ($(this).hasClass('create-budget-card')) {
      resetBudgetForm();
      openModal('#budgetModal');
      return;
    }
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
          <td>${formatCurrency(expense.amount)}</td>
          <td>${expense.name}</td>
          <td>${formatDate(expense.date)}</td>
          <td><button class="delete-expense" data-id="${expense.id}">Delete</button></td>
        </tr>
      `);
    });
  }

  $('.delete-expense')
    .off('click')
    .on('click', function () {
      const id = $(this).data('id');
      showConfirmModal({
        title: 'Delete expense?',
        message: 'This expense will be removed from the budget.',
        confirmText: 'Delete expense',
        onConfirm: () => {
          deleteExpense(id);
          refreshBudgets();
        },
      });
    });

  $('#inlineExpenseDate').val(new Date().toISOString().slice(0, 10));
}

function toggleBudgetStates(count) {
  if (!count) {
    $('#budgetDetailShell').addClass('hidden');
    $('#budgetList').removeClass('hidden');
    $('#budgetActions').removeClass('hidden');
    $('#emptyBudgetsState').addClass('hidden');
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
  setBudgetIcon(DEFAULT_ICON);
  $('#budgetForm').data('editing', '');
  $('#budgetModal .modal-header h3').text('New Budget');
  setBudgetFormMode(false);
}

function setBudgetIcon(emoji) {
  const icon = emoji || DEFAULT_ICON;
  $('#budgetIcon').val(icon);
  $('#emojiTrigger').text(icon);
}

function setBudgetFormMode(isEditing) {
  const $submit = $('#budgetSubmitBtn');
  if (!$submit.length) return;
  $submit.text(isEditing ? 'Save Changes' : 'Create Budget');
}

function initEmojiPicker() {
  const $picker = $('#emojiPicker');
  const $trigger = $('#emojiTrigger');
  if (!$picker.length || !$trigger.length) return;

  setBudgetIcon($('#budgetIcon').val() || DEFAULT_ICON);

  const closeEmojiPicker = () => {
    $picker.addClass('hidden');
    $trigger.attr('aria-expanded', 'false');
  };

  $trigger.off('click').on('click', (e) => {
    e.preventDefault();
    $picker.toggleClass('hidden');
    const expanded = !$picker.hasClass('hidden');
    $trigger.attr('aria-expanded', expanded ? 'true' : 'false');
  });

  $(document)
    .off('click.emoji')
    .on('click.emoji', (e) => {
      if (!$(e.target).closest('.emoji-select').length && !$(e.target).closest('#emojiPicker').length) {
        closeEmojiPicker();
      }
    });

  $picker.empty();
  EMOJI_SET.forEach((emoji) => {
    const btn = $(`<button type="button" class="emoji-option" data-emoji="${emoji}" aria-label="${emoji}">${emoji}</button>`);
    btn.on('click', () => {
      setBudgetIcon(emoji);
      closeEmojiPicker();
    });
    $picker.append(btn);
  });
}

function openModal(selector) {
  if (selector === '#budgetModal') {
    $('#emojiPicker').addClass('hidden');
    $('#emojiTrigger').attr('aria-expanded', 'false');
  }
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
