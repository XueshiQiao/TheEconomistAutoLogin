function isOnLoginPage() {
    return window.location.href.includes('economist.com/s/login');
}
async function getLoginStatus() {
    if (isOnLoginPage()) {
        console.log('On login page, not logged in');
        return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
        console.log('Checking login status via refreshing auth');
        fetch('https://www.economist.com/api/auth/refresh', {
            method: 'GET'
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                /**
                 * json like this:
                 * {
                    "ownerAccountId": "xxxxxx",
                    "subscriptionType": "B2C",
                    "contactId": "xxxxx",
                    "email": "xxxxx",
                    "firstName": "Bibi",
                    "lastName": "Give",
                    "phone": null,
                    "isEmailVerified": "false",
                    "isB2bClientAdmin": "false",
                    "isSubscriber": true,
                    "isLapsed": false,
                    "lapsedMonths": 0,
                    "customerSegment": "xxxxx",
                    "loggedIn": true,
                    "registeredAt": "2025-01-15T03:02:59.000+0000",
                    "isEspressoSubscriber": false,
                    "isPodcastSubscriber": false,
                    "entitlements": [
                        {
                            "productCode": "TE.DIGITAL",
                            "entitlementCode": [
                                {
                                    "code": "TE.APP",
                                    "expires": "2028-01-15T23:59:59.000Z"
                                },
                                {
                                    "code": "TE.WEB",
                                    "expires": "2028-01-15T23:59:59.000Z"
                                },
                                {
                                    "code": "TE.NEWSLETTER",
                                    "expires": "2028-01-15T23:59:59.000Z"
                                },
                                {
                                    "code": "TE.PODCAST",
                                    "expires": "2028-01-15T23:59:59.000Z"
                                }
                            ]
                        }
                    ],
                    "logoUrl": null,
                    "largeLogoUrl": null,
                    "showWelcomeModalLogo": "false",
                    "showOrganisationLogo": "false"
                }
                 */
                return response.json();
            })
            .then(data => {
                console.log('Auth refresh response:', data);
                resolve(data && data.loggedIn);
            })
            .catch(error => {
                console.log('Error refreshing auth:', error);
                resolve(false);
            });
    });
}

async function getStoredCredentials() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(['economist_email', 'economist_password'], function (data) {
            if (!data.economist_email || !data.economist_password) {
                reject(new Error('Credentials not found'));
            } else {
                resolve(data);
            }
        });
    });
}


async function redirectToLoginPageIfNeeded(isLoggedIn) {
    if (isLoggedIn) {
        console.log('Already logged in, no need to redirect');
        return Promise.reject("Already logged in");
    }

    return new Promise((resolve, reject) => {
        // Check if we're already on the login page
        if (isOnLoginPage()) {
            console.log('Already on login page');
            resolve();
            return;
        }

        // Find and click login button
        const loginButtons = Array.from(document.querySelectorAll('a'))
            .filter(a => a.textContent.toLowerCase().includes('log in') ||
                a.textContent.toLowerCase().includes('login') ||
                a.textContent.toLowerCase().includes('sign in'));

        if (loginButtons.length > 0) {
            console.log('Clicking login button');
            loginButtons[0].click();
            console.log('Login button clicked');
        }
        resolve();
    });
}

async function typeWithDelay(field, text, delayInMs) {
    return new Promise((resolve) => {
        let i = 0;
        const typeChar = () => {
            if (i < text.length) {
                field.value += text[i];
                field.dispatchEvent(new Event('input', { bubbles: true }));
                i++;
                // Random delay between 50ms and 150ms
                setTimeout(typeChar, Math.random() * 100 + 50);
            } else {
                setTimeout(() => {
                    // Random delay between 800ms and 2000ms before resolving
                    resolve();
                }, Math.random() * delayInMs);
            }
        };
        typeChar();
    });

}

async function fillLoginForm(data) {

    // Find email and password fields
    const emailField = document.querySelector('input[type="email"], input[name="email"], input[name="username"], input[id*="email"], input[placeholder*="email"]');
    const passwordField = document.querySelector('input[type="password"], input[name="password"], input[id*="password"]');

    if (emailField && passwordField) {
        // Clear fields first
        emailField.value = '';
        passwordField.value = '';

        return typeWithDelay(emailField, data.economist_email, 1000)
            .then(() => typeWithDelay(passwordField, data.economist_password, 1000))
            .then(() => new Promise((resolve, reject) => {
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
                    resolve(true);
                } else {
                    reject(new Error('Submit button not found'));
                }
            }));
    }

    return Promise.reject(new Error('Email or password field not found'));
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "performLogin") {
        getLoginStatus()
            .then(redirectToLoginPageIfNeeded)
            .then(getStoredCredentials)
            .then(data => fillLoginForm(data))
            .then(() => {
                console.log('Login form filled and submitted');
                sendResponse({ status: 'success', message: 'Login form filled and submitted' });
            })
            .catch(error => {
                console.log('Error checking login status:', error);
                sendResponse({ status: 'error', message: 'Error checking login status' });
            });
        return true; // Keep channel open for async response
    }
});
