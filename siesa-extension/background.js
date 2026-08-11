// Service worker (background). Guarda la sesión de la Suite y consulta el
// endpoint de revelado de credenciales de Siesa. Al correr en el background con
// host_permissions, la petición fetch no está sujeta a CORS.
'use strict';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'SIESA_SET_SESSION') {
    chrome.storage.local.set({ token: msg.token, apiBase: msg.apiBase });
    return; // sin respuesta asíncrona
  }

  if (msg.type === 'SIESA_SET_LOCAL_CREDS') {
    chrome.storage.local.set({
      localCreds: {
        domain: msg.domain || 'awssiesacloud',
        username: msg.username,
        password: msg.password,
      },
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'SIESA_CLEAR_LOCAL_CREDS') {
    chrome.storage.local.remove('localCreds').then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'SIESA_GET_CREDENTIALS') {
    getCredentials().then(sendResponse);
    return true; // respuesta asíncrona
  }

  if (msg.type === 'SIESA_GET_STATUS') {
    chrome.storage.local.get(['token', 'apiBase', 'localCreds']).then((s) => {
      sendResponse({
        hasSession: !!(s && s.token),
        apiBase: s ? s.apiBase : null,
        localCreds: s && s.localCreds
          ? { domain: s.localCreds.domain, username: s.localCreds.username }
          : null,
      });
    });
    return true;
  }
});

// Devuelve las credenciales de Siesa. Prioridad:
//  1) Credenciales capturadas/guardadas localmente en la extensión (lo que el
//     usuario ya usó para entrar => "inicia manual una vez y listo").
//  2) Credenciales guardadas en la Suite (endpoint reveal, centralizado/cifrado).
async function getCredentials() {
  const store = await chrome.storage.local.get(['token', 'apiBase', 'localCreds']);
  const { token, apiBase, localCreds } = store;

  if (localCreds && localCreds.username && localCreds.password) {
    return { ok: true, source: 'local', credentials: localCreds };
  }

  if (token && apiBase) {
    try {
      const res = await fetch(apiBase + '/siesa/credentials/reveal', {
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        return { ok: true, source: 'suite', credentials: data };
      }
    } catch (e) {
      // red no disponible
    }
  }

  if (!token || !apiBase) return { ok: false, reason: 'no-session' };
  return { ok: false, reason: 'no-credentials' };
}
