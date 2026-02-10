/**
 * BeeCommit — Background Service Worker
 *
 * Listens for messages from the content script when a submission
 * is accepted, then commits the solution to GitHub.
 */

import { getFile, commitFile, validateToken, listRepos } from './github.js';

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // We must return true to signal async response
    handleMessage(message, sender).then(sendResponse);
    return true;
});

/**
 * Route incoming messages to the appropriate handler.
 */
async function handleMessage(message, sender) {
    switch (message.type) {
        case 'SUBMISSION_ACCEPTED':
            return handleSubmission(message);

        case 'VALIDATE_TOKEN':
            return validateToken(message.token);

        case 'LIST_REPOS':
            try {
                const repos = await listRepos(message.token);
                return { success: true, repos };
            } catch (err) {
                return { success: false, error: err.message };
            }

        case 'GET_STATUS':
            return getLastStatus();

        default:
            return { success: false, error: `Unknown message type: ${message.type}` };
    }
}

/**
 * Handle an accepted submission by committing the code to GitHub.
 *
 * @param {object} data
 * @param {string} data.problemId — Problem number (e.g., "1930")
 * @param {string} data.language — Raw language string from Beecrowd
 * @param {string} data.code — Source code content
 */
async function handleSubmission({ problemId, language, code }) {
    try {
        // Load settings from storage
        const settings = await chrome.storage.sync.get([
            'githubToken',
            'repoOwner',
            'repoName',
            'isEnabled',
        ]);

        if (!settings.isEnabled) {
            return { success: false, error: 'BeeCommit sync is disabled' };
        }

        if (!settings.githubToken || !settings.repoOwner || !settings.repoName) {
            return {
                success: false,
                error: 'BeeCommit is not configured. Please open the extension popup and set up your GitHub token and repository.',
            };
        }

        // Resolve the language to get the file extension
        const langInfo = resolveLanguageInWorker(language);
        if (!langInfo) {
            return {
                success: false,
                error: `Unsupported language: "${language}". Please report this issue.`,
            };
        }

        const filePath = `problems/${problemId}/main.${langInfo.ext}`;
        const commitMessage = `feat: solve problem ${problemId} in ${langInfo.label}`;

        // Check if file already exists (get SHA for update)
        const existing = await getFile(
            settings.repoOwner,
            settings.repoName,
            filePath,
            settings.githubToken
        );

        // Commit the file
        const result = await commitFile({
            owner: settings.repoOwner,
            repo: settings.repoName,
            path: filePath,
            content: code,
            message: commitMessage,
            token: settings.githubToken,
            sha: existing.exists ? existing.sha : undefined,
        });

        // Save last sync status
        const status = {
            timestamp: new Date().toISOString(),
            problemId,
            language: langInfo.label,
            filePath,
            success: result.success,
            url: result.url,
            error: result.error,
        };

        await chrome.storage.local.set({ lastSync: status });

        if (result.success) {
            console.log(`[BeeCommit] ✅ Committed: ${filePath}`);
        } else {
            console.error(`[BeeCommit] ❌ Failed to commit: ${result.error}`);
        }

        return result;
    } catch (err) {
        console.error('[BeeCommit] Error handling submission:', err);
        const status = {
            timestamp: new Date().toISOString(),
            problemId,
            language,
            success: false,
            error: err.message,
        };
        await chrome.storage.local.set({ lastSync: status });
        return { success: false, error: err.message };
    }
}

/**
 * Get the last sync status.
 */
async function getLastStatus() {
    const { lastSync } = await chrome.storage.local.get('lastSync');
    return lastSync || null;
}

/**
 * Resolve language in service worker context.
 * Since content scripts inject languages.js into the page context,
 * we duplicate the minimal logic here for the worker.
 */
function resolveLanguageInWorker(rawLanguage) {
    const LANG_MAP = {
        'rust': { ext: 'rs', label: 'Rust' },
        'c': { ext: 'c', label: 'C' },
        'c++': { ext: 'cpp', label: 'C++' },
        'c++17': { ext: 'cpp', label: 'C++17' },
        'c#': { ext: 'cs', label: 'C#' },
        'java': { ext: 'java', label: 'Java' },
        'kotlin': { ext: 'kt', label: 'Kotlin' },
        'scala': { ext: 'scala', label: 'Scala' },
        'python': { ext: 'py', label: 'Python' },
        'python 3': { ext: 'py', label: 'Python 3' },
        'python 3.9': { ext: 'py', label: 'Python 3.9' },
        'javascript': { ext: 'js', label: 'JavaScript' },
        'ruby': { ext: 'rb', label: 'Ruby' },
        'lua': { ext: 'lua', label: 'Lua' },
        'php': { ext: 'php', label: 'PHP' },
        'perl': { ext: 'pl', label: 'Perl' },
        'haskell': { ext: 'hs', label: 'Haskell' },
        'ocaml': { ext: 'ml', label: 'OCaml' },
        'go': { ext: 'go', label: 'Go' },
        'swift': { ext: 'swift', label: 'Swift' },
        'pascal': { ext: 'pas', label: 'Pascal' },
        'objective-c': { ext: 'm', label: 'Objective-C' },
        'd': { ext: 'd', label: 'D' },
        'r': { ext: 'r', label: 'R' },
    };

    if (!rawLanguage) return null;

    const cleaned = rawLanguage
        .replace(/\s*\(.*?\)/g, '')
        .replace(/\s*\{.*?\}/g, '')
        .trim()
        .toLowerCase();

    if (LANG_MAP[cleaned]) return LANG_MAP[cleaned];

    const firstWord = cleaned.split(/\s+/)[0];
    if (LANG_MAP[firstWord]) return LANG_MAP[firstWord];

    for (const [key, value] of Object.entries(LANG_MAP)) {
        if (cleaned.startsWith(key) || key.startsWith(cleaned)) {
            return value;
        }
    }

    return null;
}
