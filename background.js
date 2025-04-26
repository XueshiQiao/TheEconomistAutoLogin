chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('economist.com')) {
        // Check if we need to auto-login
        chrome.storage.sync.get(['economist_autologin'], function (data) {
            if (data.economist_autologin) {
                chrome.tabs.sendMessage(tabId, { action: "performLogin" });
            }
        });
    }
});

// Handle navigation to login page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "navigateToLogin") {
        chrome.tabs.update(sender.tab.id, { url: message.url });
    }
});
