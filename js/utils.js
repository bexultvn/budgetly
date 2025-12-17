const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'KZT',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  const amount = Number(value) || 0;
  const parts = currencyFormatter.formatToParts(amount);
  const symbol = parts.find((p) => p.type === 'currency')?.value || '₸';
  const number = parts
    .filter((p) => p.type !== 'currency')
    .map((p) => p.value)
    .join('');
  return `${number}${symbol}`;
}

function formatDate(date) {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getBudgetStats(budget) {
  const spent = (budget.expenses || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const limit = Number(budget.limit) || 0;
  const remaining = Math.max(limit - spent, 0);
  const percent = limit ? Math.min((spent / limit) * 100, 100) : 0;
  return { spent, remaining, percent };
}

function calculateTotals(data) {
  const budgets = data.budgets || [];
  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.limit || 0), 0);
  const totalExpenses = budgets.reduce(
    (sum, b) => sum + (b.expenses || []).reduce((s, exp) => s + Number(exp.amount || 0), 0),
    0,
  );
  return {
    totalBudget,
    totalExpenses,
    budgetsCount: budgets.length,
    expenseCount: (budgets || []).reduce((sum, b) => sum + (b.expenses || []).length, 0),
  };
}

function getLatestBudgets(budgets, count = 3) {
  return [...(budgets || [])]
    .sort((a, b) => (a.id > b.id ? -1 : 1))
    .slice(0, count);
}

function getLatestExpenses(budgets, count = 5) {
  const expenses = [];
  (budgets || []).forEach((budget) => {
    (budget.expenses || []).forEach((expense) => {
      expenses.push({
        ...expense,
        budgetTitle: budget.title,
        icon: budget.icon,
      });
    });
  });
  return expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
}

function requireAuth() {
  const data = getData();
  if (!data.isLoggedIn) {
    window.location.href = 'index.html';
  }
  return data;
}

function redirectIfLoggedIn() {
  const data = getData();
  if (data.isLoggedIn) {
    window.location.href = 'dashboard.html';
  }
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function setActiveNav(page) {
  $('.nav-link').removeClass('active');
  $(`.nav-link[data-page="${page}"]`).addClass('active');
}

function renderSidebar(activePage = '') {
  const $sidebar = $('.sidebar');
  if (!$sidebar.length) return;

  $sidebar.html(`
    <div class="sidebar-profile">
      <div class="user-avatar">B</div>
      <div class="user-name">User</div>
    </div>
    <div class="nav nav-main">
      <a class="nav-link" data-page="dashboard" href="dashboard.html">
        <span class="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="7" height="7" rx="2"></rect>
            <rect x="13" y="4" width="7" height="5" rx="2"></rect>
            <rect x="13" y="11" width="7" height="9" rx="2"></rect>
            <rect x="4" y="13" width="7" height="7" rx="2"></rect>
          </svg>
        </span>
        <span class="nav-text">Dashboard</span>
      </a>
      <a class="nav-link" data-page="budgets" href="budgets.html">
        <span class="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 7.5h10.5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"></path>
            <path d="M18.5 10.5h-4a1.5 1.5 0 0 0 0 3h4v-3z"></path>
            <circle cx="14.6" cy="12" r="0.9"></circle>
          </svg>
        </span>
        <span class="nav-text">Budgets</span>
      </a>
      <a class="nav-link" data-page="expenses" href="expenses.html">
        <span class="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 4h7l5 5v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
            <path d="M14 4v5h5"></path>
            <path d="M9 13h6"></path>
            <path d="M9 17h4"></path>
          </svg>
        </span>
        <span class="nav-text">Expenses</span>
      </a>
    </div>
    <div class="nav nav-footer">
      <button class="nav-link logout-link" id="logoutBtn" type="button">
        <span class="nav-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <path d="M16 17l5-5-5-5"></path>
            <path d="M21 12H9"></path>
          </svg>
        </span>
        <span class="nav-text">Logout</span>
      </button>
    </div>
  `);

  if (activePage) setActiveNav(activePage);
}

function toggleSidebar() {
  $('body').toggleClass('sidebar-open');
}

function initSidebarToggle() {
  $('.menu-toggle').on('click', toggleSidebar);
  $('.sidebar .nav-link').on('click', () => $('body').removeClass('sidebar-open'));
}

function renderUserBadge(user) {
  if (!user) return;
  const initials = (user.name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  $('.user-name').text(user.name);
  $('.user-email').text(user.email || '');
  $('.user-avatar').text(initials);
}

function showConfirmModal(options) {
  const { title = 'Are you sure?', message = 'This action cannot be undone.', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm } =
    options || {};
  const $modal = $('#confirmModal');
  if (!$modal.length) {
    if (window.confirm(message || title) && typeof onConfirm === 'function') {
      onConfirm();
    }
    return;
  }

  $('#confirmTitle').text(title);
  $('#confirmMessage').text(message);
  $('#confirmProceed').text(confirmText);
  $('#confirmCancel').text(cancelText);

  const cleanup = () => {
    $modal.removeClass('active');
    $('#confirmProceed').off('click.confirm');
    $('#confirmCancel').off('click.confirm');
    $('.close-modal[data-close="#confirmModal"]').off('click.confirm');
    $modal.off('click.confirm');
  };

  $('#confirmProceed')
    .off('click.confirm')
    .on('click.confirm', () => {
      cleanup();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });

  $('#confirmCancel').off('click.confirm').on('click.confirm', cleanup);

  $('.close-modal[data-close="#confirmModal"]').off('click.confirm').on('click.confirm', cleanup);

  $modal.off('click.confirm').on('click.confirm', (e) => {
    if ($(e.target).hasClass('modal')) {
      cleanup();
    }
  });

  $modal.addClass('active');
}
