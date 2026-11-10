(() => {
  const dialog = document.getElementById('listing-dialog');
  const username = document.getElementById('game-username');
  if (!dialog || !username) return;

  // app.js sets the username from the Discord profile immediately before
  // opening the dialog. Clear it after the native dialog opens so it always
  // starts empty and the user must enter their in-game username themselves.
  const nativeShowModal = dialog.showModal.bind(dialog);
  dialog.showModal = (...args) => {
    const result = nativeShowModal(...args);
    username.value = '';
    return result;
  };

  // Prevent backdrop clicks from reaching the generic close handler in app.js.
  document.addEventListener('click', (event) => {
    if (event.target === dialog) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Keep the explicit X button as the way to dismiss the trade form.
  dialog.addEventListener('cancel', (event) => event.preventDefault());
})();
