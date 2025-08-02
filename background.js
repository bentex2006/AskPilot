chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('apiKey', (data) => {
    if (!data.apiKey) {
      chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
  });
});