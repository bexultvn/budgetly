const STORAGE_KEY_PREFIX = 'financeData:';
const SESSION_KEY = 'financeSession';
const LEGACY_STORAGE_KEY = 'financeData';

function getStorageKey(email) {
  return `${STORAGE_KEY_PREFIX}${email}`;
}

function createDefaultData() {
  return {
    user: null,
    budgets: [],
    isLoggedIn: false,
  };
}

function getSessionEmail() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return (parsed.email || '').toLowerCase() || null;
  } catch (e) {
    return null;
  }
}

function setSessionEmail(email) {
  if (!email) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email: email.toLowerCase() }));
}

function migrateLegacyData() {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const legacyEmail = (parsed.user?.email || 'legacy').toLowerCase();
    const key = getStorageKey(legacyEmail);
    localStorage.setItem(key, JSON.stringify(parsed));
    setSessionEmail(legacyEmail);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return parsed;
  } catch (e) {
    return null;
  }
}

function resolveTargetEmail(email) {
  return (email || getSessionEmail() || '').toLowerCase();
}

function normalizeBudgets(budgets) {
  return (budgets || []).map((budget) => ({
    id: budget.id || `b-${Date.now()}`,
    title: budget.title || 'Untitled Budget',
    limit: Number(budget.limit) || 0,
    icon: budget.icon || '💳',
    expenses: (budget.expenses || []).map((expense) => ({
      id: expense.id || `e-${Date.now()}`,
      name: expense.name ?? '',
      amount: Number(expense.amount) || 0,
      date: expense.date || new Date().toISOString().slice(0, 10),
    })),
  }));
}

function getData(email, options = {}) {
  const { createIfMissing = true } = options;
  const targetEmail = resolveTargetEmail(email);

  if (!targetEmail) {
    const legacy = migrateLegacyData();
    return legacy ? { ...legacy, budgets: normalizeBudgets(legacy.budgets) } : createDefaultData();
  }

  const raw = localStorage.getItem(getStorageKey(targetEmail));
  if (!raw) {
    if (!createIfMissing) return createDefaultData();
    const base = createDefaultData();
    saveData(base, targetEmail);
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
    if (!createIfMissing) return createDefaultData();
    const base = createDefaultData();
    saveData(base, targetEmail);
    return base;
  }
}

function saveData(data, email) {
  const targetEmail = resolveTargetEmail(email);
  if (!targetEmail) return;
  localStorage.setItem(getStorageKey(targetEmail), JSON.stringify(data));
}

function setUser(user, email) {
  const targetEmail = resolveTargetEmail(email);
  if (!targetEmail) return;
  const data = getData(targetEmail);
  data.user = user;
  saveData(data, targetEmail);
}

function setLoginState(isLoggedIn, email) {
  const targetEmail = resolveTargetEmail(email);
  if (!targetEmail) return;
  const data = getData(targetEmail);
  data.isLoggedIn = !!isLoggedIn;
  saveData(data, targetEmail);
  if (isLoggedIn) {
    setSessionEmail(targetEmail);
  } else {
    setSessionEmail(null);
  }
}

function updateProfile(updates) {
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) return { ok: false, error: 'You must be logged in to update your profile.' };

  const data = getData(sessionEmail);
  if (!data.user) return { ok: false, error: 'No profile found to update.' };

  const changingPin = !!updates.newPin;
  if (changingPin && data.user.pin) {
    if (!updates.currentPin) return { ok: false, error: 'Please enter your current password to change it.' };
    if (updates.currentPin !== data.user.pin) return { ok: false, error: 'Incorrect current password.' };
  }

  const next = { ...data, user: { ...data.user } };

  if (updates.firstName !== undefined) next.user.firstName = updates.firstName.trim();
  if (updates.lastName !== undefined) next.user.lastName = updates.lastName.trim();
  if (updates.username !== undefined) next.user.username = updates.username.trim();
  if (updates.name !== undefined) next.user.name = updates.name.trim();
  if (updates.avatar !== undefined) next.user.avatar = updates.avatar;

  let targetEmail = sessionEmail;
  if (updates.email && updates.email.toLowerCase() !== sessionEmail) {
    const nextEmail = updates.email.toLowerCase();
    const existing = localStorage.getItem(getStorageKey(nextEmail));
    if (existing) {
      return { ok: false, error: 'An account with that email already exists.' };
    }
    targetEmail = nextEmail;
    next.user.email = nextEmail;
  }

  if (updates.newPin) {
    next.user.pin = updates.newPin;
  }

  const derivedName = (next.user.name || `${next.user.firstName || ''} ${next.user.lastName || ''}`).trim();
  next.user.name = derivedName || next.user.username || next.user.email;

  saveData(next, targetEmail);

  if (targetEmail !== sessionEmail) {
    localStorage.removeItem(getStorageKey(sessionEmail));
    setSessionEmail(targetEmail);
  }

  return { ok: true, data: next };
}

function logoutUser() {
  const targetEmail = getSessionEmail();
  if (!targetEmail) return;
  const data = getData(targetEmail, { createIfMissing: false });
  if (data && data.user) {
    data.isLoggedIn = false;
    saveData(data, targetEmail);
  }
  setSessionEmail(null);
}

function addBudget(budget) {
  const targetEmail = getSessionEmail();
  if (!targetEmail) return null;
  const data = getData(targetEmail);
  const newBudget = {
    id: budget.id || `b-${Date.now()}`,
    title: budget.title,
    limit: Number(budget.limit),
    icon: budget.icon || '💳',
    expenses: budget.expenses || [],
  };
  data.budgets.push(newBudget);
  saveData(data, targetEmail);
  return newBudget;
}

function deleteBudget(budgetId) {
  const targetEmail = getSessionEmail();
  if (!targetEmail) return;
  const data = getData(targetEmail);
  data.budgets = data.budgets.filter((b) => b.id !== budgetId);
  saveData(data, targetEmail);
}

function updateBudget(budgetId, updates) {
  const targetEmail = getSessionEmail();
  if (!targetEmail) return null;
  const data = getData(targetEmail);
  const target = data.budgets.find((b) => b.id === budgetId);
  if (!target) return null;
  target.title = updates.title ?? target.title;
  target.limit = updates.limit !== undefined ? Number(updates.limit) : target.limit;
  target.icon = updates.icon ?? target.icon;
  saveData(data, targetEmail);
  return target;
}

function addExpense(budgetId, expense) {
  const targetEmail = getSessionEmail();
  if (!targetEmail) return null;
  const data = getData(targetEmail);
  const target = data.budgets.find((b) => b.id === budgetId);
  if (!target) return null;

  const newExpense = {
    id: expense.id || `e-${Date.now()}`,
    name: expense.name ?? '',
    amount: Number(expense.amount),
    date: expense.date || new Date().toISOString().slice(0, 10),
  };

  target.expenses = target.expenses || [];
  target.expenses.unshift(newExpense);
  saveData(data, targetEmail);
  return newExpense;
}

function deleteExpense(expenseId) {
  const targetEmail = getSessionEmail();
  if (!targetEmail) return;
  const data = getData(targetEmail);
  data.budgets = data.budgets.map((budget) => ({
    ...budget,
    expenses: (budget.expenses || []).filter((expense) => expense.id !== expenseId),
  }));
  saveData(data, targetEmail);
}

function getAllExpenses(options = {}) {
  const {
    budgetId = null,
    month = null,
    startDate = null,
    endDate = null,
    query = '',
  } = options;

  const data = getData();
  const expenses = [];
  const normalizedQuery = (query || '').toLowerCase().trim();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  data.budgets.forEach((budget) => {
    if (budgetId && budget.id !== budgetId) return;
    (budget.expenses || []).forEach((expense) => {
      // Month filter
      if (month && !isDateInMonth(expense.date, month)) return;

      // Range filter (inclusive)
      if (start || end) {
        const d = new Date(expense.date);
        if (Number.isNaN(d.getTime())) return;
        if (start && d < start) return;
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (d > endOfDay) return;
        }
      }

      // Text search
      if (normalizedQuery && !(expense.name || '').toLowerCase().includes(normalizedQuery)) return;

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
  const demoEmail = 'demo@budgetly.app';
  const existing = getData(demoEmail, { createIfMissing: false });
  if (existing.user || (existing.budgets && existing.budgets.length)) return existing;

  const demo = {
    user: { name: 'Casey Morgan', email: demoEmail },
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

  saveData(demo, demoEmail);
  return demo;
}
