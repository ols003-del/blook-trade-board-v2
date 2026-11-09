// Username-only Supabase Auth adapter.
// Supabase Auth's password provider requires an email or phone identifier.
// This adapter maps usernames to non-deliverable synthetic email addresses.
// Disable email confirmation in Supabase Auth settings; password recovery by email
// is not available for these accounts.
(() => {
  const start = () => {
    const form = document.querySelector('#auth-form');
    const heading = document.querySelector('#auth-heading');
    const submit = document.querySelector('#auth-submit');
    const error = document.querySelector('#auth-error');
    const usernameInput = document.querySelector('#auth-email');
    const displayNameWrap = document.querySelector('#display-name-wrap');
    if (!form || !window.supabase?.createClient) return;

    const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    usernameInput.type = 'text';
    usernameInput.name = 'username';
    usernameInput.autocomplete = 'username';
    usernameInput.placeholder = 'Choose a username';
    displayNameWrap.classList.add('hidden');

    const usernameToEmail = (username) => `${username.toLowerCase()}@accounts.blooktrade.invalid`;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      error.textContent = '';
      const username = usernameInput.value.trim();
      if (!/^[A-Za-z0-9_.-]{3,24}$/.test(username)) {
        error.textContent = 'Username must be 3–24 characters: letters, numbers, dots, underscores, or hyphens.';
        return;
      }
      if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        error.textContent = 'Supabase configuration is missing.';
        return;
      }

      const password = document.querySelector('#auth-password').value;
      const mode = heading.textContent.trim() === 'Create account' ? 'signup' : 'signin';
      submit.disabled = true;
      try {
        let result;
        if (mode === 'signup') {
          result = await client.auth.signUp({
            email: usernameToEmail(username),
            password,
            options: { data: { display_name: username, username } }
          });
        } else {
          result = await client.auth.signInWithPassword({ email: usernameToEmail(username), password });
        }
        if (result.error) throw result.error;
        if (mode === 'signup' && !result.data.session) {
          throw new Error('Supabase email confirmation is still enabled. Turn it off under Authentication settings, then try signing up again.');
        }
        document.querySelector('#auth-dialog').close();
        form.reset();
        const toast = document.querySelector('#toast');
        toast.textContent = mode === 'signup' ? 'Account created. You are signed in.' : 'Signed in.';
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3200);
        window.dispatchEvent(new CustomEvent('username-auth-changed'));
      } catch (authError) {
        error.textContent = authError.message || 'Authentication failed. Please try again.';
      } finally {
        submit.disabled = false;
      }
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
