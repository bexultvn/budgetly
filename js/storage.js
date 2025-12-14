const STORAGE_KEY = 'financeData';

function createDefaultData() {
  return {
    user: null,
    budgets: [],
    isLoggedIn: false,
  };
}

function normalizeBudgets(budgets) {
  return (budgets || []).map((budget) => ({
    id: budget.id || `b-${Date.now()}`,
    title: budget.title || 'Untitled Budget',
    limit: Number(budget.limit) || 0,
    icon: budget.icon || '💳',
    expenses: (budget.expenses || []).map((expense) => ({
      id: expense.id || `e-${Date.now()}`,
      name: expense.name || 'Expense',
      amount: Number(expense.amount) || 0,
      date: expense.date || new Date().toISOString().slice(0, 10),
    })),
  }));
}

function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const base = createDefaultData();
    saveData(base);
    return base;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user || null,
      budgets: normalizeBudgets(parsed.budgets),
      isLoggedIn: !!parsed.isLoggedIn,
    };
  } catch (e) {
    const base = createDefaultData();
    saveData(base);
    return base;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setUser(user) {
  const data = getData();
  data.user = user;
  saveData(data);
}

function setLoginState(isLoggedIn) {
  const data = getData();
  data.isLoggedIn = !!isLoggedIn;
  saveData(data);
}

function logoutUser() {
  const data = getData();
  data.isLoggedIn = false;
  saveData(data);
}

function addBudget(budget) {
  const data = getData();
  const newBudget = {
    id: budget.id || `b-${Date.now()}`,
    title: budget.title,
    limit: Number(budget.limit),
    icon: budget.icon || '💳',
    expenses: budget.expenses || [],
  };
  data.budgets.push(newBudget);
  saveData(data);
  return newBudget;
}

function deleteBudget(budgetId) {
  const data = getData();
  data.budgets = data.budgets.filter((b) => b.id !== budgetId);
  saveData(data);
}

function updateBudget(budgetId, updates) {
  const data = getData();
  const target = data.budgets.find((b) => b.id === budgetId);
  if (!target) return null;
  target.title = updates.title ?? target.title;
  target.limit = updates.limit !== undefined ? Number(updates.limit) : target.limit;
  target.icon = updates.icon ?? target.icon;
  saveData(data);
  return target;
}

function addExpense(budgetId, expense) {
  const data = getData();
  const target = data.budgets.find((b) => b.id === budgetId);
  if (!target) return null;

  const newExpense = {
    id: expense.id || `e-${Date.now()}`,
    name: expense.name,
    amount: Number(expense.amount),
    date: expense.date || new Date().toISOString().slice(0, 10),
  };

  target.expenses = target.expenses || [];
  target.expenses.unshift(newExpense);
  saveData(data);
  return newExpense;
}

function deleteExpense(expenseId) {
  const data = getData();
  data.budgets = data.budgets.map((budget) => ({
    ...budget,
    expenses: (budget.expenses || []).filter((expense) => expense.id !== expenseId),
  }));
  saveData(data);
}

function getAllExpenses() {
  const data = getData();
  const expenses = [];

  data.budgets.forEach((budget) => {
    (budget.expenses || []).forEach((expense) => {
      expenses.push({
        ...expense,
        budgetId: budget.id,
        budgetTitle: budget.title,
        icon: budget.icon,
      });
    });
  });

  return expenses;
}

function seedDemoData() {
  const existing = getData();
  if (existing.user || (existing.budgets && existing.budgets.length)) return existing;

  const demo = {
    user: { name: 'Casey Morgan', email: 'casey@budgetly.app' },
    isLoggedIn: false,
    budgets: [
      {
        id: 'b-1',
        title: 'Housing',
        limit: 1800,
        icon: '🏠',
        expenses: [
          { id: 'e-1', name: 'Rent', amount: 1500, date: new Date().toISOString().slice(0, 10) },
        ],
      },
      {
        id: 'b-2',
        title: 'Groceries',
        limit: 500,
        icon: '🛒',
        expenses: [
          { id: 'e-2', name: 'Weekly Shop', amount: 120, date: new Date().toISOString().slice(0, 10) },
          { id: 'e-3', name: 'Farmer\'s Market', amount: 60, date: new Date().toISOString().slice(0, 10) },
        ],
      },
      {
        id: 'b-3',
        title: 'Leisure',
        limit: 300,
        icon: '🎟️',
        expenses: [{ id: 'e-4', name: 'Cinema', amount: 40, date: new Date().toISOString().slice(0, 10) }],
      },
    ],
  };

  saveData(demo);
  return demo;
}
