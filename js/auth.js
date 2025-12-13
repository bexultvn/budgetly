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
      $('#modeHelper').text('Already have an account? Switch to Login.');
    } else {
      $('.name-group').addClass('hidden');
      $('#formTitle').text('Welcome back');
      $('#modeHelper').text('Need an account? Switch to Register.');
    }
    $message.addClass('hidden');
  }

  function showMessage(type, text) {
    $message.removeClass('hidden success error').addClass(type).text(text);
  }

  $('.mode-btn').on('click', function () {
    setMode($(this).data('mode'));
  });

  $('#authForm').on('submit', function (e) {
    e.preventDefault();
    const name = $('#name').val().trim();
    const email = $('#email').val().trim().toLowerCase();
    const pin = $('#pin').val().trim();
    if (!email || !pin) {
      showMessage('error', 'Please fill in all required fields.');
      return;
    }

    const data = getData();

    if (mode === 'register') {
      if (!name) {
        showMessage('error', 'Please enter your name to personalize your dashboard.');
        return;
      }
      const user = { name, email, pin };
      data.user = user;
      data.isLoggedIn = true;
      saveData(data);
      showMessage('success', 'Account created. Redirecting...');
      setTimeout(() => (window.location.href = 'dashboard.html'), 500);
    } else {
      if (!data.user) {
        showMessage('error', 'No account yet. Switch to Register to create one.');
        return;
      }
      if (data.user.email !== email) {
        showMessage('error', 'Email does not match the registered account.');
        return;
      }
      if (data.user.pin && data.user.pin !== pin) {
        showMessage('error', 'Incorrect passcode.');
        return;
      }
      data.isLoggedIn = true;
      saveData(data);
      showMessage('success', 'Welcome back! Redirecting...');
      setTimeout(() => (window.location.href = 'dashboard.html'), 350);
    }
  });
});
