'use strict';

const dotSession = document.getElementById('dot-session');
const valSession = document.getElementById('val-session');
const dotCreds = document.getElementById('dot-creds');
const valCreds = document.getElementById('val-creds');
const hint = document.getElementById('hint');

const localUser = document.getElementById('local-user');
const localPass = document.getElementById('local-pass');
const localSave = document.getElementById('local-save');
const localClear = document.getElementById('local-clear');
const localMsg = document.getElementById('local-msg');
const localPanel = document.getElementById('local-panel');
const togglePass = document.getElementById('toggle-pass');

function set(dot, cls) {
  dot.className = 'dot ' + cls;
}

async function refresh() {
  let status;
  try {
    status = await chrome.runtime.sendMessage({ type: 'SIESA_GET_STATUS' });
  } catch (e) {
    status = null;
  }

  // Precargar usuario local guardado (si existe)
  if (status && status.localCreds && status.localCreds.username) {
    localUser.value = status.localCreds.username;
  }

  if (status && status.hasSession) {
    set(dotSession, 'dot--on');
    valSession.textContent = 'Conectada';
  } else {
    set(dotSession, 'dot--off');
    valSession.textContent = 'No detectada';
  }

  let creds;
  try {
    creds = await chrome.runtime.sendMessage({ type: 'SIESA_GET_CREDENTIALS' });
  } catch (e) {
    creds = null;
  }

  if (creds && creds.ok) {
    set(dotCreds, 'dot--on');
    const via = creds.source === 'local' ? ' (local)' : '';
    valCreds.textContent = (creds.credentials.username || 'Guardadas') + via;
    hint.innerHTML = 'Todo listo. Al abrir Siesa se rellenará e iniciará sesión automáticamente.';
  } else if (creds && creds.reason === 'no-credentials') {
    set(dotCreds, 'dot--warn');
    valCreds.textContent = 'Sin guardar';
    hint.innerHTML =
      'Guarda tus credenciales en la Suite (tarjeta <b>Siesa Cloud</b>) o aquí abajo como respaldo.';
    if (localPanel) localPanel.open = true;
  } else if (creds && creds.reason === 'no-session') {
    set(dotCreds, 'dot--warn');
    valCreds.textContent = 'No disponible';
    hint.innerHTML =
      'Abre la <b>Suite</b> con sesión iniciada, o guarda tus credenciales aquí abajo como respaldo.';
    if (localPanel) localPanel.open = true;
  } else {
    set(dotCreds, 'dot--warn');
    valCreds.textContent = 'No disponible';
    hint.innerHTML = 'Guarda tus credenciales aquí abajo para el auto-login.';
    if (localPanel) localPanel.open = true;
  }
}

if (localSave) {
  localSave.addEventListener('click', async () => {
    const username = localUser.value.trim();
    const password = localPass.value;
    if (!username || !password) {
      localMsg.textContent = 'Escribe usuario y contraseña.';
      return;
    }
    await chrome.runtime.sendMessage({
      type: 'SIESA_SET_LOCAL_CREDS',
      username,
      password,
      domain: 'awssiesacloud',
    });
    localPass.value = '';
    localMsg.textContent = 'Credenciales guardadas en la extensión.';
    refresh();
  });
}

if (localClear) {
  localClear.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'SIESA_CLEAR_LOCAL_CREDS' });
    localUser.value = '';
    localPass.value = '';
    localMsg.textContent = 'Credenciales locales borradas.';
    refresh();
  });
}

if (togglePass) {
  togglePass.addEventListener('click', () => {
    localPass.type = localPass.type === 'password' ? 'text' : 'password';
  });
}

refresh();
