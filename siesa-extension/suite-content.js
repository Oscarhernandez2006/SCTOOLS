// Se ejecuta en el origen de la Suite Santa Cruz.
// Captura el token de sesión de la Suite y la URL base del API y los guarda
// para que el service worker pueda pedir las credenciales de Siesa cuando el
// usuario abra Siesa Cloud.
(function () {
  'use strict';

  function capture() {
    try {
      const token = localStorage.getItem('sc_tools_token');
      if (!token) return;
      // El frontend usa rutas relativas /api/... => el API vive en el mismo origen.
      const apiBase = window.location.origin + '/api';
      chrome.runtime.sendMessage({ type: 'SIESA_SET_SESSION', token, apiBase });
    } catch (e) {
      // localStorage no accesible: ignorar
    }
  }

  capture();

  // Volver a capturar cuando el usuario inicia sesión o cambia el token.
  window.addEventListener('focus', capture);
  window.addEventListener('storage', capture);
  setInterval(capture, 60000);
})();
