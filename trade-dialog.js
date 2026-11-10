(() => {
  const dialog = document.getElementById('listing-dialog');
  const username = document.getElementById('game-username');
  if (!dialog || !username) return;

  // app.js currently fills this field from the Discord profile before opening.
  // Wrap only this dialog's showModal so the in-game username always starts blank.
  const showListingDialog = dialog.showModal.bind(dialog);
  dialog.showModal = (...args) => {
    username.value = '';
    return showListingDialog(...args);
  };

  // The generic dialog backdrop handler in app.js closes dialogs on clicks.
  // Stop clicks on the listing dialog backdrop before they reach that handler.
  document.addEventListener('click', (event) => {
    if (event.target === dialog) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // Keep the explicit X button as the way to dismiss the trade form.
  dialog.addEventListener('cancel', (event) => event.preventDefault());
})();
