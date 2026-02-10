/**
 * BeeCommit — Popup Script
 *
 * Handles the extension popup UI logic: saving/loading settings,
 * validating the GitHub token, listing repositories, and showing
 * the last sync status.
 */

document.addEventListener('DOMContentLoaded', init);

// ─── DOM Elements ────────────────────────────────────────────────────
let tokenInput, toggleTokenBtn, repoSelect, autoSyncCheckbox;
let saveBtn, testBtn;
let statusBanner, statusIcon, statusText;
let lastSyncSection, lastSyncDetails;

function init() {
    // Cache DOM references
    tokenInput = document.getElementById('github-token');
    toggleTokenBtn = document.getElementById('toggle-token');
    repoSelect = document.getElementById('repo-select');
    autoSyncCheckbox = document.getElementById('auto-sync');
    saveBtn = document.getElementById('save-btn');
    testBtn = document.getElementById('test-btn');
    statusBanner = document.getElementById('status-banner');
    statusIcon = document.getElementById('status-icon');
    statusText = document.getElementById('status-text');
    lastSyncSection = document.getElementById('last-sync');
    lastSyncDetails = document.getElementById('last-sync-details');

    // Event listeners
    toggleTokenBtn.addEventListener('click', toggleTokenVisibility);
    tokenInput.addEventListener('input', onTokenInput);
    saveBtn.addEventListener('click', saveSettings);
    testBtn.addEventListener('click', testConnection);

    // Load saved settings
    loadSettings();
    loadLastSync();
}

// ─── Token Visibility Toggle ─────────────────────────────────────────

function toggleTokenVisibility() {
    const isPassword = tokenInput.type === 'password';
    tokenInput.type = isPassword ? 'text' : 'password';
    toggleTokenBtn.textContent = isPassword ? '🙈' : '👁️';
}

// ─── Token Input Handler ─────────────────────────────────────────────

let tokenDebounce = null;

function onTokenInput() {
    const token = tokenInput.value.trim();

    // Enable/disable buttons based on token presence
    testBtn.disabled = !token;
    saveBtn.disabled = !token;

    // Debounce: auto-fetch repos when token looks valid
    clearTimeout(tokenDebounce);
    if (token.length >= 10) {
        tokenDebounce = setTimeout(() => fetchRepos(token), 800);
    } else {
        repoSelect.innerHTML = '<option value="">Enter token first...</option>';
        repoSelect.disabled = true;
    }
}

// ─── Fetch Repositories ─────────────────────────────────────────────

async function fetchRepos(token) {
    repoSelect.innerHTML = '<option value="">Loading repositories...</option>';
    repoSelect.disabled = true;

    const response = await chrome.runtime.sendMessage({
        type: 'LIST_REPOS',
        token,
    });

    if (response?.success && response.repos) {
        repoSelect.innerHTML = '<option value="">Select a repository...</option>';
        for (const repo of response.repos) {
            const option = document.createElement('option');
            option.value = JSON.stringify({ owner: repo.owner, name: repo.name });
            option.textContent = `${repo.full_name}${repo.private ? ' 🔒' : ''}`;
            repoSelect.appendChild(option);
        }
        repoSelect.disabled = false;

        // Restore previously selected repo
        const settings = await chrome.storage.sync.get(['repoOwner', 'repoName']);
        if (settings.repoOwner && settings.repoName) {
            const targetValue = JSON.stringify({
                owner: settings.repoOwner,
                name: settings.repoName,
            });
            for (const opt of repoSelect.options) {
                if (opt.value === targetValue) {
                    opt.selected = true;
                    break;
                }
            }
        }
    } else {
        repoSelect.innerHTML = '<option value="">Failed to load repos</option>';
        showStatus('error', `❌ ${response?.error || 'Invalid token'}`);
    }
}

// ─── Save Settings ───────────────────────────────────────────────────

async function saveSettings() {
    const token = tokenInput.value.trim();
    const repoValue = repoSelect.value;
    const isEnabled = autoSyncCheckbox.checked;

    if (!token) {
        showStatus('error', '❌ Please enter a GitHub token');
        return;
    }

    if (!repoValue) {
        showStatus('error', '❌ Please select a repository');
        return;
    }

    let repo;
    try {
        repo = JSON.parse(repoValue);
    } catch {
        showStatus('error', '❌ Invalid repository selection');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';

    await chrome.storage.sync.set({
        githubToken: token,
        repoOwner: repo.owner,
        repoName: repo.name,
        isEnabled,
    });

    saveBtn.textContent = '✅ Saved!';
    showStatus('success', '✅ Settings saved successfully!');

    setTimeout(() => {
        saveBtn.textContent = '💾 Save Settings';
        saveBtn.disabled = false;
    }, 2000);
}

// ─── Test Connection ─────────────────────────────────────────────────

async function testConnection() {
    const token = tokenInput.value.trim();
    if (!token) {
        showStatus('error', '❌ Please enter a token first');
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = '⏳ Testing...';

    const response = await chrome.runtime.sendMessage({
        type: 'VALIDATE_TOKEN',
        token,
    });

    if (response?.valid) {
        showStatus('success', `✅ Connected as ${response.user.login}`);
        fetchRepos(token);
    } else {
        showStatus('error', `❌ Invalid token: ${response?.error || 'Unknown error'}`);
    }

    testBtn.textContent = '🔌 Test Connection';
    testBtn.disabled = false;
}

// ─── Load Settings ───────────────────────────────────────────────────

async function loadSettings() {
    const settings = await chrome.storage.sync.get([
        'githubToken',
        'repoOwner',
        'repoName',
        'isEnabled',
    ]);

    if (settings.githubToken) {
        tokenInput.value = settings.githubToken;
        saveBtn.disabled = false;
        testBtn.disabled = false;
        fetchRepos(settings.githubToken);
    }

    if (settings.isEnabled !== undefined) {
        autoSyncCheckbox.checked = settings.isEnabled;
    }
}

// ─── Load Last Sync Status ──────────────────────────────────────────

async function loadLastSync() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

    if (!response) {
        lastSyncSection.classList.add('hidden');
        return;
    }

    lastSyncSection.classList.remove('hidden');

    const time = new Date(response.timestamp).toLocaleString();
    const statusClass = response.success ? 'sync-success' : 'sync-error';
    const statusEmoji = response.success ? '✅' : '❌';

    lastSyncDetails.innerHTML = `
    <div class="${statusClass}">
      ${statusEmoji} Problem #${response.problemId} (${response.language})
    </div>
    <div>📅 ${time}</div>
    ${response.success && response.url
            ? `<div><a href="${response.url}" target="_blank" style="color: var(--accent);">View on GitHub →</a></div>`
            : ''
        }
    ${response.error
            ? `<div class="sync-error">Error: ${response.error}</div>`
            : ''
        }
  `;
}

// ─── Status Banner ───────────────────────────────────────────────────

function showStatus(type, message) {
    statusBanner.className = `status-banner ${type}`;
    statusBanner.classList.remove('hidden');
    statusText.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusBanner.classList.add('hidden');
    }, 5000);
}
