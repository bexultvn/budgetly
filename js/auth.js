$(function () {
  seedDemoData();
  redirectIfLoggedIn();

  let mode = 'login';
  const $message = $('#authMessage');

  function setMode(nextMode) {
    mode = nextMode;
    $('.mode-btn').removeClass('active');
    $(`.mode-btn[data-mode="${mode}"]`).addClass('active');
    if (mode === 'register') {
      $('.name-group').removeClass('hidden');
      $('#formTitle').text('Create your account');
      $('#modeHelper').text('Already have an account?');
      $('#modeLink').text('Login').data('mode', 'login');
      $('#authSubmit').text('Register');
    } else {
      $('.name-group').addClass('hidden');
      $('#formTitle').text('Welcome back');
      $('#modeHelper').text('Need an account?');
      $('#modeLink').text('Register').data('mode', 'register');
      $('#authSubmit').text('Login');
    }
    $message.addClass('hidden');
  }

  function showMessage(type, text) {
    $message.removeClass('hidden success error').addClass(type).text(text);
  }

  $('.mode-btn').on('click', function () {
    setMode($(this).data('mode'));
  });

  $('#modeLink').on('click', function () {
    const nextMode = $(this).data('mode');
    if (nextMode) setMode(nextMode);
  });

  setMode(mode);

  $('#authForm').on('submit', function (e) {
    e.preventDefault();
    const name = $('#name').val().trim();
    const email = $('#email').val().trim().toLowerCase();
    const pin = $('#pin').val().trim();
    if (!email || !pin) {
      showMessage('error', 'Please fill in all required fields.');
      return;
    }

    if (mode === 'register') {
      if (!name) {
        showMessage('error', 'Please enter your name to personalize your dashboard.');
        return;
      }
      const existing = getData(email, { createIfMissing: false });
      if (existing.user && existing.user.email === email) {
        showMessage('error', 'An account with this email already exists. Please login instead.');
        return;
      }
      const newData = createDefaultData();
      const user = { name, email, pin };
      newData.user = user;
      newData.isLoggedIn = true;
      saveData(newData, email);
      setSessionEmail(email);
      showMessage('success', 'Account created. Redirecting...');
      setTimeout(() => (window.location.href = 'dashboard.html'), 500);
    } else {
      const account = getData(email, { createIfMissing: false });
      if (!account.user) {
        showMessage('error', 'No account yet. Switch to Register to create one.');
        return;
      }
      if (account.user.email !== email) {
        showMessage('error', 'Incorrect password or email.');
        return;
      }
      if (account.user.pin && account.user.pin !== pin) {
        showMessage('error', 'Incorrect password or email.');
        return;
      }
      account.isLoggedIn = true;
      saveData(account, email);
      setSessionEmail(email);
      showMessage('success', 'Welcome back! Redirecting...');
      setTimeout(() => (window.location.href = 'dashboard.html'), 350);
    }
  });
});
