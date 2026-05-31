// Background Service Worker - CRM Advocacia v2.0
// Gerencia notificações, alarmes e comunicação entre popup e content script

chrome.runtime.onInstalled.addListener(() => {
  console.log('CRM Advocacia instalado com sucesso!');
});

// Relay messages between popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'navigate' || message.action === 'togglePanel') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
  return true;
});

// Check for upcoming appointments every 5 minutes
chrome.alarms.create('checkAppointments', {periodInMinutes: 5});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkAppointments') {
    chrome.storage.local.get(['crm_advocacia_v2'], (result) => {
      const state = result['crm_advocacia_v2'];
      if (!state) return;
      const data = JSON.parse(state);
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 60000);
      (data.appointments || []).forEach(appt => {
        const apptTime = new Date(appt.datetime);
        if (apptTime >= now && apptTime <= in30 && !appt.notified) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'CRM Advocacia - Lembrete',
            message: appt.title + ' em 30 minutos!',
            priority: 2
          });
        }
      });
    });
  }
});
