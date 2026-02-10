/**
 * BeeCommit — Utility Functions
 */

/**
 * Encode a string to base64 (handles UTF-8 properly).
 * Required by GitHub API for file content.
 *
 * @param {string} str
 * @returns {string}
 */
function toBase64(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/**
 * Build the file path inside the GitHub repository.
 * Format: beecrowd/{problemId}/problem_{problemId}.{ext}
 *
 * @param {string|number} problemId
 * @param {string} ext — file extension without dot
 * @returns {string}
 */
function buildFilePath(problemId, ext) {
    return `beecrowd/${problemId}/problem_${problemId}.${ext}`;
}

/**
 * Build the commit message.
 * Format: feat: solve problem {ID} in {LANGUAGE}
 *
 * @param {string|number} problemId
 * @param {string} language — Human-readable language name
 * @returns {string}
 */
function buildCommitMessage(problemId, language) {
    return `feat: solve problem ${problemId} in ${language}`;
}

/**
 * Extract the problem ID from the current page URL.
 * Matches: /problems/view/{ID} or /runs/add/{ID}
 *
 * @param {string} url
 * @returns {string|null}
 */
function extractProblemIdFromUrl(url) {
    const match = url.match(/\/problems\/view\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Extract the submission (run) ID from a URL.
 * Matches: /runs/code/{RUN_ID}
 *
 * @param {string} url
 * @returns {string|null}
 */
function extractRunIdFromUrl(url) {
    const match = url.match(/\/runs\/code\/(\d+)/);
    return match ? match[1] : null;
}

// Make available to other content scripts
if (typeof window !== 'undefined') {
    window.BeeCommit = window.BeeCommit || {};
    window.BeeCommit.toBase64 = toBase64;
    window.BeeCommit.buildFilePath = buildFilePath;
    window.BeeCommit.buildCommitMessage = buildCommitMessage;
    window.BeeCommit.extractProblemIdFromUrl = extractProblemIdFromUrl;
    window.BeeCommit.extractRunIdFromUrl = extractRunIdFromUrl;
}
