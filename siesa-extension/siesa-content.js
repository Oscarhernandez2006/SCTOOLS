// Se ejecuta en https://carnesantacruzapp.siesacloud.com/ (y en todos sus frames).
// Detecta el formulario de inicio de sesión de Siesa (gateway Ericom/Citrix),
// pide las credenciales al service worker y las rellena imitando la escritura
// real del usuario (focus/blur incluidos, porque el formulario usa
// onblur="onLoginTyped()" y onfocus="onPasswordFocused()"). Si no hay
// credenciales guardadas no hace nada y el usuario inicia sesión manualmente.
(function () {
  'use strict';

  const TAG = '[Siesa auto-login]';
  const SEL = {
    domain: '#Editbox3',
    username: '#Editbox1',
    password: '#Editbox2',
    logon: '#buttonLogOn',
  };

  function log(...args) {
    try { console.log(TAG, ...args); } catch (e) {}
  }

  // Asigna el valor imitando la escritura del usuario y dispara los eventos que
  // el formulario de Siesa espera (input/change + focus/blur para onLoginTyped
  // y onPasswordFocused).
  function setValue(el, value) {
    try {
      el.focus();
      el.dispatchEvent(new Event('focus', { bubbles: true }));

      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, value);
      else el.value = value;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      el.blur();
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    } catch (e) {
      el.value = value;
    }
  }

  function waitFor(selector, timeout = 12000) {
    return new Promise((resolve) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector(selector));
      }, timeout);
    });
  }

  function clickLogon() {
    const btn = document.querySelector(SEL.logon);
    if (!btn) {
      log('No se encontró el botón Log-on');
      return;
    }
    log('Pulsando Log-on…');
    // Algunos gateways enlazan el handler con onmousedown/onmouseup.
    ['mousedown', 'mouseup', 'click'].forEach((type) => {
      btn.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
    try { btn.click(); } catch (e) {}
  }

  // Guarda lo que el usuario escribió al iniciar sesión manualmente, para que la
  // próxima vez sea automático. Esto hace que TODO funcione con "entrar una vez".
  function captureAndStore() {
    const u = document.querySelector(SEL.username);
    const p = document.querySelector(SEL.password);
    const d = document.querySelector(SEL.domain);
    if (!u || !p) return;
    const username = (u.value || '').trim();
    const password = p.value || '';
    if (!username || !password) return;
    try {
      chrome.runtime.sendMessage({
        type: 'SIESA_SET_LOCAL_CREDS',
        username,
        password,
        domain: d ? d.value : 'awssiesacloud',
      });
      log('Credenciales del login manual capturadas. La próxima vez será automático.');
    } catch (e) {}
  }

  // Engancha la captura al botón Log-on y a la tecla Enter (una sola vez).
  function attachCapture() {
    const btn = document.querySelector(SEL.logon);
    if (btn && !btn.dataset.scCaptureBound) {
      btn.dataset.scCaptureBound = '1';
      btn.addEventListener('click', () => setTimeout(captureAndStore, 30), true);
      btn.addEventListener('mousedown', () => setTimeout(captureAndStore, 30), true);
    }
    const p = document.querySelector(SEL.password);
    if (p && !p.dataset.scCaptureBound) {
      p.dataset.scCaptureBound = '1';
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') setTimeout(captureAndStore, 30);
      }, true);
    }
  }

  // Si el auto-login falló (credenciales inválidas), borra las guardadas para no
  // quedar en bucle; el usuario corrige manual y se recapturan las correctas.
  function verifyResult() {
    setTimeout(() => {
      const body = (document.body.innerText || '').toLowerCase();
      if (body.includes('invalid credentials') || (body.includes('credenciales') && body.includes('lid'))) {
        log('Auto-login rechazado. Borro credenciales guardadas; inicia sesión manual y se guardarán las correctas.');
        try { chrome.runtime.sendMessage({ type: 'SIESA_CLEAR_LOCAL_CREDS' }); } catch (e) {}
        const u = document.querySelector(SEL.username);
        if (u) u.dataset.scAutofilled = '';
      }
    }, 2500);
  }

  async function autofill() {
    const userEl = await waitFor(SEL.username);
    const passEl = document.querySelector(SEL.password);
    if (!userEl || !passEl) {
      log('No es la pantalla de login (frame sin formulario).');
      return;
    }
    attachCapture(); // siempre: para capturar el login manual
    if (userEl.dataset.scAutofilled === '1') return; // ya se rellenó

    log('Formulario detectado. Solicitando credenciales…');
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({ type: 'SIESA_GET_CREDENTIALS' });
    } catch (e) {
      log('No se pudo contactar la extensión:', e);
      return;
    }

    if (!resp || !resp.ok) {
      log('Sin credenciales guardadas todavía. Inicia sesión manual UNA vez y quedará automático. Motivo:', resp && resp.reason);
      return; // login manual (se capturará)
    }

    const { domain, username, password } = resp.credentials || {};
    if (!username || !password) {
      log('Credenciales incompletas.');
      return;
    }

    userEl.dataset.scAutofilled = '1';
    log('Rellenando campos para el usuario:', username, '(origen:', resp.source + ')');

    const domEl = document.querySelector(SEL.domain);
    if (domEl && domain) setValue(domEl, domain);
    setValue(userEl, username);
    setValue(passEl, password);

    setTimeout(() => {
      clickLogon();
      verifyResult();
    }, 700);
  }

  // Ejecutar y reintentar por si el formulario se pinta después (SPA/gateway).
  autofill();
  let tries = 0;
  const retry = setInterval(() => {
    tries += 1;
    const done = document.querySelector(SEL.username)?.dataset.scAutofilled === '1';
    if (done || tries > 10) {
      clearInterval(retry);
      return;
    }
    autofill();
  }, 1000);
})();
