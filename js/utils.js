const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return currencyFormatter.format(amount);
}

function formatDate(date) {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
