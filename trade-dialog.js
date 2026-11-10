(() => {
  const listingDialog = document.getElementById('listing-dialog');
  if (!listingDialog) return;

  // Keep the offer form open on backdrop clicks (including clicks that end a
  // text-selection drag). It can only be dismissed with its explicit close button.
  document.addEventListener('click', (event) => {
    if (event.target === listingDialog) event.stopImmediatePropagation();
  }, true);

  // Require the explicit close button instead of allowing Escape to dismiss it.
  listingDialog.addEventListener('cancel', (event) => event.preventDefault());
})();
