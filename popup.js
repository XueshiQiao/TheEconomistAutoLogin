document.addEventListener('DOMContentLoaded', function () {
    // Load saved credentials
    chrome.storage.sync.get(['economist_email', 'economist_password', 'economist_autologin'], function (data) {
        if (data.economist_email) {
            document.getElementById('email').value = data.economist_email;
        }
        if (data.economist_password) {
            document.getElementById('password').value = data.economist_password;
        }
        // Set checkbox state
        document.getElementById('autologin').checked = data.economist_autologin !== false; // Default to true if not set
    });

    // Save credentials
    document.getElementById('saveButton').addEventListener('click', function () {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const autologin = document.getElementById('autologin').checked;

        if (!email || !password) {
            document.getElementById('status').textContent = 'Please enter both email and password.';
            return;
        }

        chrome.storage.sync.set({
            'economist_email': email,
            'economist_password': password,
            'economist_autologin': autologin
        }, function () {
            document.getElementById('status').textContent = 'Credentials saved!';
            setTimeout(function () {
                document.getElementById('status').textContent = '';
            }, 2000);
        });
    });

    // Login now
    document.getElementById('loginButton').addEventListener('click', function () {
        document.getElementById('status').textContent = 'Attempting login...';

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            // Send message to content script to perform login
            chrome.tabs.sendMessage(tabs[0].id, { action: "performLogin" }, function (response) {
                if (response && response.status === 'success') {
                    document.getElementById('status').textContent = 'Login initiated!';
                } else {
                    document.getElementById('status').textContent = 'Login failed. Are you on The Economist website?';
                }
            });
        });
    });
});
