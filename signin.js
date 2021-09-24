'use strict';

function initialize() {
  var xmlhttp;
  window.addEventListener('load', function () {
    var form = document.getElementById('localLoginForm');
    if (form) {
      window.addEventListener('submit', function () {
        login(form);
      });
    }
  });

  function login(form) {
    var button = document.getElementById('signinButton');
    var warningDiv = document.getElementById('loginWarning');

    button.disabled = true;
    warningDiv.innerHTML = '';

    xmlhttp = new XMLHttpRequest();
    xmlhttp.open(form.method, form.action, true);
    xmlhttp.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    xmlhttp.send(
      JSON.stringify({
        username: form.username.value,
        password: form.password.value
      })
    );
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.status === 401) {
        warningDiv.innerHTML = 'Incorrect username or password.';
        button.disabled = false;
      }
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        window.location.reload(true);
      }
    };
    return false;
  }
}

module.exports = {initialize: initialize};
