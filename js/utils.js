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
  let email = getSessionEmail();
  if (!email) {
    migrateLegacyData();
    email = getSessionEmail();
  }
  if (!email) {
    window.location.href = 'index.html';
    return createDefaultData();
  }
  const data = getData(email);
  if (!data.isLoggedIn) {
    window.location.href = 'index.html';
  }
  return data;
}

function redirectIfLoggedIn() {
  let email = getSessionEmail();
  if (!email) {
    migrateLegacyData();
    email = getSessionEmail();
  }
  if (!email) return;
  const data = getData(email, { createIfMissing: false });
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

function initModalDismiss() {
  $(document)
    .off('click.modalClose')
    .on('click.modalClose', '.close-modal', function (e) {
      e.preventDefault();
      const target = $(this).data('close');
      if (target) {
        closeModal(target);
      }
    });

  $(document)
    .off('click.modalOverlay')
    .on('click.modalOverlay', '.modal', function (e) {
      if ($(e.target).hasClass('modal')) {
        closeModal(`#${$(this).attr('id')}`);
      }
    });
}

function populateBudgetSelect(budgets = []) {
  const $select = $('#expenseBudget');
  if (!$select.length) return;

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

function renderSidebar(activePage = '') {
  const $sidebar = $('.sidebar');
  if (!$sidebar.length) return;

  $sidebar.html(`
    <div class="sidebar-mobile-header">
      <button class="sidebar-close" type="button" aria-label="Close menu">←</button>
    </div>
    <div class="sidebar-profile">
      <button class="user-avatar-btn" type="button" aria-label="Edit profile">
        <div class="user-avatar">B</div>
      </button>
      <div class="user-name">User</div>
      <div class="user-email"></div>
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
  $('.sidebar-close').on('click', () => $('body').removeClass('sidebar-open'));
  $('.sidebar .nav-link').on('click', () => $('body').removeClass('sidebar-open'));
  $(document).on('click', (e) => {
    if ($('body').hasClass('sidebar-open')) {
      const $sidebar = $('.sidebar');
      const $toggle = $('.menu-toggle');
      if (!$sidebar.is(e.target) && $sidebar.has(e.target).length === 0 && !$toggle.is(e.target) && $toggle.has(e.target).length === 0) {
        $('body').removeClass('sidebar-open');
      }
    }
  });
}

function renderUserBadge(user) {
  if (!user) return;
  const displayName =
    (user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim() ||
    user.username ||
    user.email ||
    'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  $('.user-name').text(displayName);
  $('.user-email').text(user.email || '');
  const $avatar = $('.user-avatar');
  if (user.avatar) {
    $avatar
      .addClass('has-photo')
      .css('background-image', `url(${user.avatar})`)
      .text('');
  } else {
    $avatar.removeClass('has-photo').css('background-image', 'none').text(initials);
  }
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

function initProfileModal() {
  const $modal = $('#profileModal');
  if (!$modal.length) return;

  let $avatarTriggers = $('.user-avatar-btn');
  if (!$avatarTriggers.length) {
    $avatarTriggers = $('.user-avatar');
  }
  const $closeButtons = $('.close-modal[data-close="#profileModal"]');
  const $overlay = $modal;
  const $saveBtn = $('#profileSaveBtn');
  const $heroName = $('#profileHeroName');
  const $heroEmail = $('#profileHeroEmail');
  const $message = $('#profileMessage');
  const $avatarPreview = $('#profileAvatarPreview');
  const $avatarInput = $('#profileAvatarInput');
  const $avatarButton = $('#profileAvatarButton');
  const $fullName = $('#profileName');
  const $email = $('#profileEmail');
  const $changePasswordBtn = $('#profileChangePasswordBtn');

  const $passwordModal = $('#changePasswordModal');
  const $passwordCloseButtons = $('.close-modal[data-close="#changePasswordModal"]');
  const $passwordOverlay = $passwordModal;
  const $passwordMessage = $('#changePasswordMessage');
  const $passwordCurrent = $('#changePasswordCurrent');
  const $passwordNew = $('#changePasswordNew');
  const $passwordConfirm = $('#changePasswordConfirm');
  const $passwordCancel = $('#changePasswordCancelBtn');
  const $passwordSave = $('#changePasswordSaveBtn');

  let pendingAvatar = null;
  let messageTimer = null;
  let passwordMessageTimer = null;
  let profileWasOpenForPassword = false;

  const setMessage = (type, text) => {
    $message.removeClass('hidden success error').addClass(type).text(text);
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
      $message.addClass('hidden').text('');
    }, 1000);
  };

  const clearMessage = () => {
    if (messageTimer) clearTimeout(messageTimer);
    $message.addClass('hidden').text('');
  };

  const setPasswordMessage = (type, text) => {
    $passwordMessage.removeClass('hidden success error').addClass(type).text(text);
    if (passwordMessageTimer) clearTimeout(passwordMessageTimer);
    passwordMessageTimer = setTimeout(() => {
      $passwordMessage.addClass('hidden').text('');
    }, 1000);
  };

  const clearPasswordMessage = () => {
    if (passwordMessageTimer) clearTimeout(passwordMessageTimer);
    $passwordMessage.addClass('hidden').text('');
  };

  const initialsFromName = (name, fallback) => {
    const source =
      (name || '')
        .split(' ')
        .filter(Boolean)
        .join(' ')
        .trim() ||
      fallback ||
      '?';
    return source
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const setAvatarPreview = (src, name, fallback) => {
    if (!src) {
      $avatarPreview.removeClass('has-photo').css('background-image', 'none').text(initialsFromName(name, fallback));
      return;
    }
    $avatarPreview.addClass('has-photo').css('background-image', `url(${src})`).text('');
  };

  const resetPasswordModal = () => {
    clearPasswordMessage();
    $passwordCurrent.val('');
    $passwordNew.val('');
    $passwordConfirm.val('');
  };

  const closePasswordModal = () => {
    $passwordModal.removeClass('active');
    resetPasswordModal();
    if (profileWasOpenForPassword) {
      $modal.addClass('active');
    }
    profileWasOpenForPassword = false;
  };

  const openPasswordModal = () => {
    resetPasswordModal();
    profileWasOpenForPassword = $modal.hasClass('active');
    if (profileWasOpenForPassword) {
      $modal.removeClass('active');
    }
    $passwordModal.addClass('active');
  };

  const close = () => {
    $modal.removeClass('active');
    pendingAvatar = null;
    clearMessage();
  };

  const open = () => {
    const data = getData();
    const user = data.user || {};
    pendingAvatar = null;
    clearMessage();
    $fullName.prop('disabled', false);
    $email.prop('disabled', false);
    $avatarInput.prop('disabled', false);
    $fullName.val(user.name || '');
    $email.val(user.email || '');
    $heroName.text(
      (user.name || '').trim() || user.username || user.email || 'User',
    );
    $heroEmail.text(user.email || '');
    const displayName = user.name || user.username || '';
    setAvatarPreview(user.avatar, displayName, user.email);
    $modal.addClass('active');
  };

  $avatarTriggers.off('click.profile').on('click.profile', (e) => {
    e.preventDefault();
    open();
  });

  $closeButtons.off('click.profile').on('click.profile', (e) => {
    e.preventDefault();
    close();
  });

  $overlay.off('click.profile').on('click.profile', (e) => {
    if ($(e.target).hasClass('modal')) {
      close();
    }
  });

  $changePasswordBtn.off('click.profile').on('click.profile', () => {
    openPasswordModal();
  });

  $avatarButton.off('click.profile').on('click.profile', () => {
    clearMessage();
    if ($avatarInput.length) {
      $avatarInput.trigger('click');
    }
  });

  $avatarInput.off('change.profile').on('change.profile', function () {
    const file = this.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      pendingAvatar = ev.target?.result || null;
      setAvatarPreview(pendingAvatar, $fullName.val(), $email.val());
    };
    reader.readAsDataURL(file);
  });

  $saveBtn.off('click.profile').on('click.profile', () => {
    clearMessage();
    const nameVal = ($fullName.val() || '').trim();
    const emailVal = ($email.val() || '').trim().toLowerCase();

    if (!nameVal || !emailVal) {
      setMessage('error', 'Full name and email are required.');
      return;
    }

    const payload = {
      name: nameVal,
      email: emailVal,
    };

    if (pendingAvatar !== null) payload.avatar = pendingAvatar;

    const result = updateProfile(payload);
    if (!result.ok) {
      setMessage('error', result.error || 'Failed to update profile.');
      return;
    }

    renderUserBadge(result.data.user);
    const displayName = result.data.user.name || result.data.user.username || '';
    setAvatarPreview(result.data.user.avatar, displayName, result.data.user.email);
    $heroName.text(displayName || result.data.user.email || 'User');
    $heroEmail.text(result.data.user.email || '');
    pendingAvatar = null;
    setMessage('success', 'Profile updated.');
  });

  $passwordCloseButtons.off('click.profile').on('click.profile', (e) => {
    e.preventDefault();
    closePasswordModal();
  });

  $passwordCancel.off('click.profile').on('click.profile', (e) => {
    e.preventDefault();
    closePasswordModal();
  });

  $passwordOverlay.off('click.profile').on('click.profile', (e) => {
    if ($(e.target).hasClass('modal')) {
      closePasswordModal();
    }
  });

  $passwordSave.off('click.profile').on('click.profile', () => {
    clearPasswordMessage();
    const currentPin = ($passwordCurrent.val() || '').trim();
    const newPin = ($passwordNew.val() || '').trim();
    const confirmPin = ($passwordConfirm.val() || '').trim();

    if (!currentPin || !newPin || !confirmPin) {
      setPasswordMessage('error', 'Please fill in all password fields.');
      return;
    }

    if (newPin !== confirmPin) {
      setPasswordMessage('error', 'New password and confirmation must match.');
      return;
    }

    if (newPin.length < 4) {
      setPasswordMessage('error', 'Password must be at least 4 characters.');
      return;
    }

    const result = updateProfile({ currentPin, newPin });
    if (!result.ok) {
      setPasswordMessage('error', result.error || 'Failed to update password.');
      return;
    }

    setPasswordMessage('success', 'Password updated.');
    setTimeout(() => {
      closePasswordModal();
      setMessage('success', 'Password updated.');
    }, 250);
  });
}
