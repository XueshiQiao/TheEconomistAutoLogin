// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "performLogin") {
        // Get stored credentials
        chrome.storage.sync.get(['economist_email', 'economist_password'], function (data) {
            if (!data.economist_email || !data.economist_password) {
                sendResponse({ status: 'error', message: 'Credentials not found' });
                return;
            }

            // Check if we're on the login page, if not, go there
            if (!window.location.href.includes('economist.com/s/login')) {
                // Find and click login button
                const loginButtons = Array.from(document.querySelectorAll('a'))
                    .filter(a => a.textContent.toLowerCase().includes('log in') ||
                        a.textContent.toLowerCase().includes('login') ||
                        a.textContent.toLowerCase().includes('sign in'));

                if (loginButtons.length > 0) {
                    // Wait for navigation and try again after a delay
                    setTimeout(() => {
                        chrome.runtime.sendMessage({ action: "performLogin" });
                    }, 3000);

                    loginButtons[0].click();
                } else {
                    // Use Chrome's extension API to navigate
                    chrome.runtime.sendMessage({
                        action: "navigateToLogin",
                        url: 'https://www.economist.com/s/login'
                    });
                }
            } else {
                // We're on the login page, fill out the form
                setTimeout(() => {
                    // Find email and password fields
                    const emailField = document.querySelector('input[type="email"], input[name="email"], input[name="username"], input[id*="email"], input[placeholder*="email"]');
                    const passwordField = document.querySelector('input[type="password"], input[name="password"], input[id*="password"]');

                    if (emailField && passwordField) {
                        // Fill in credentials
                        emailField.value = data.economist_email;
                        passwordField.value = data.economist_password;

                        // Trigger input events to activate any listeners
                        emailField.dispatchEvent(new Event('input', { bubbles: true }));
                        passwordField.dispatchEvent(new Event('input', { bubbles: true }));

                        // Find the submit button
                        const submitButton = document.querySelector('button[type="submit"], button.slds-button_brand');

                        if (submitButton) {
                            // Create and dispatch a click event
                            const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });

                            // Dispatch the event
                            submitButton.dispatchEvent(clickEvent);

                            // Also try the native click method
                            submitButton.click();

                            sendResponse({ status: 'success', message: 'Login button clicked' });
                        } else {
                            sendResponse({ status: 'error', message: 'Submit button not found' });
                        }
                    } else {
                        sendResponse({ status: 'error', message: 'Login form fields not found' });
                    }
                }, 1000);
            }
        });
        return true; // Keep channel open for async response
    }
});
