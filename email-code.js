// Intercepts Supabase sign-up so users can verify with a one-time email code.
// Supabase Dashboard must use {{ .Token }} in the Confirm signup email template.
(() => {
  const start = () => {
    const form = document.querySelector('#auth-form');
    const dialog = document.querySelector('#auth-dialog');
    if (!form || !dialog) return;

    const supabaseLib = window.supabase;
    if (!supabaseLib?.createClient || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return;
    const authClient = supabaseLib.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const heading = document.querySelector('#auth-heading');
    const submit = document.querySelector('#auth-submit');
    const error = document.querySelector('#auth-error');
    const switchButton = document.querySelector('#auth-switch');
    let pendingEmail = '';

    const codeLabel = document.createElement('label');
    codeLabel.id = 'email-code-wrap';
    codeLabel.className = 'hidden';
    codeLabel.textContent = 'Email confirmation code';
    const codeInput = document.createElement('input');
    codeInput.id = 'email-code';
    codeInput.type = 'text';
    codeInput.inputMode = 'numeric';
    codeInput.autocomplete = 'one-time-code';
    codeInput.maxLength = 8;
    codeInput.placeholder = 'Enter the code from your email';
    codeInput.setAttribute('aria-label', 'Email confirmation code');
    codeLabel.append(codeInput);
    document.querySelector('#auth-password').parentElement.after(codeLabel);

    form.addEventListener('submit', async (event) => {
      const isSignup = heading.textContent.trim() === 'Create account';
      if (!isSignup && !pendingEmail) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      submit.disabled = true;
      error.textContent = '';

      try {
        if (!pendingEmail) {
          const email = document.querySelector('#auth-email').value.trim();
          const password = document.querySelector('#auth-password').value;
          const displayName = document.querySelector('#display-name').value.trim().slice(0, 30);
          const { error: signUpError } = await authClient.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } }
          });
          if (signUpError) throw signUpError;
          pendingEmail = email;
          document.querySelector('#email-code-wrap').classList.remove('hidden');
          codeInput.required = true;
          codeInput.focus();
          submit.textContent = 'Verify code';
          error.classList.remove('form-error');
          error.classList.add('muted');
          error.textContent = 'We sent a confirmation code. Check your inbox and spam folder, then enter it above.';
          return;
        }

        const { error: verifyError } = await authClient.auth.verifyOtp({
          email: pendingEmail,
          token: codeInput.value.trim(),
          type: 'signup'
        });
        if (verifyError) throw verifyError;
        pendingEmail = '';
        dialog.close();
        form.reset();
        document.querySelector('#email-code-wrap').classList.add('hidden');
        codeInput.required = false;
        submit.textContent = 'Sign in';
        error.classList.add('form-error');
        error.classList.remove('muted');
        error.textContent = '';
        const notice = document.querySelector('#toast');
        notice.textContent = 'Email confirmed. You are signed in.';
        notice.classList.add('visible');
        setTimeout(() => notice.classList.remove('visible'), 3200);
      } catch (authError) {
        error.classList.add('form-error');
        error.classList.remove('muted');
        error.textContent = authError.message || 'Could not verify the email code. Please try again.';
      } finally {
        submit.disabled = false;
      }
    }, true);

    switchButton.addEventListener('click', () => {
      if (!pendingEmail) return;
      pendingEmail = '';
      codeInput.value = '';
      codeInput.required = false;
      document.querySelector('#email-code-wrap').classList.add('hidden');
      error.textContent = '';
      error.classList.add('form-error');
      error.classList.remove('muted');
      submit.textContent = heading.textContent.trim() === 'Create account' ? 'Sign up' : 'Sign in';
    }, true);

    dialog.addEventListener('close', () => {
      pendingEmail = '';
      codeInput.value = '';
      codeInput.required = false;
      document.querySelector('#email-code-wrap').classList.add('hidden');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
