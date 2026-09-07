// curb admin (docs/specs/admin.md R-7, R-26). No framework, no inline
// scripts: Google Identity Services hands the credential to the callback
// named on #g_id_onload, and destructive forms confirm through data-confirm.
(function () {
  "use strict";

  // GIS callback: post the id token with the Rails CSRF token (R-7).
  window.curbAdminCredential = function (response) {
    var form = document.getElementById("admin-session-form");
    if (!form || !response || !response.credential) return;
    form.elements.credential.value = response.credential;
    form.submit();
  };

  // Event delegation for data-confirm on forms and their submit buttons.
  document.addEventListener("submit", function (event) {
    var form = event.target;
    var button = event.submitter;
    var message = (button && button.dataset.confirm) || form.dataset.confirm;
    if (message && !window.confirm(message)) event.preventDefault();
  });
})();
