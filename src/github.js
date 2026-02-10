/**
 * BeeCommit — GitHub API Module
 *
 * Handles all communication with the GitHub REST API for creating
 * and updating file contents in a repository.
 */

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Validate a GitHub Personal Access Token.
 *
 * @param {string} token
 * @returns {Promise<{ valid: boolean, user?: object, error?: string }>}
 */
async function validateToken(token) {
    try {
        const res = await fetch(`${GITHUB_API_BASE}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        });

        if (res.ok) {
            const user = await res.json();
            return { valid: true, user };
        }

        return { valid: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err) {
        return { valid: false, error: err.message };
    }
}

/**
 * List repositories accessible by the authenticated user.
 *
 * @param {string} token
 * @returns {Promise<Array<{ full_name: string, name: string, owner: string, private: boolean }>>}
 */
async function listRepos(token) {
    const repos = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const res = await fetch(
            `${GITHUB_API_BASE}/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            }
        );

        if (!res.ok) {
            throw new Error(`Failed to list repos: HTTP ${res.status}`);
        }

        const data = await res.json();
        if (data.length === 0) break;

        repos.push(
            ...data.map((r) => ({
                full_name: r.full_name,
                name: r.name,
                owner: r.owner.login,
                private: r.private,
            }))
        );

        if (data.length < perPage) break;
        page++;
    }

    return repos;
}

/**
 * Get a file from a repository (to check if it exists and get its SHA).
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} path
 * @param {string} token
 * @returns {Promise<{ exists: boolean, sha?: string }>}
 */
async function getFile(owner, repo, path, token) {
    const res = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        }
    );

    if (res.ok) {
        const data = await res.json();
        return { exists: true, sha: data.sha };
    }

    if (res.status === 404) {
        return { exists: false };
    }

    throw new Error(`Failed to check file: HTTP ${res.status}`);
}

/**
 * Create or update a file in a GitHub repository.
 *
 * @param {object} params
 * @param {string} params.owner — Repository owner
 * @param {string} params.repo — Repository name
 * @param {string} params.path — File path in the repository
 * @param {string} params.content — File content (plain text, will be base64-encoded)
 * @param {string} params.message — Commit message
 * @param {string} params.token — GitHub PAT
 * @param {string} [params.sha] — SHA of existing file (required for updates)
 * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
 */
async function commitFile({ owner, repo, path, content, message, token, sha }) {
    try {
        // Encode content to base64
        const encoder = new TextEncoder();
        const bytes = encoder.encode(content);
        let binary = '';
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        const base64Content = btoa(binary);

        const body = {
            message,
            content: base64Content,
        };

        // If file already exists, include SHA to update it
        if (sha) {
            body.sha = sha;
        }

        const res = await fetch(
            `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (res.ok || res.status === 201) {
            const data = await res.json();
            return {
                success: true,
                url: data.content?.html_url || data.commit?.html_url,
            };
        }

        const errorData = await res.json().catch(() => ({}));
        return {
            success: false,
            error: `HTTP ${res.status}: ${errorData.message || res.statusText}`,
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Export for service worker (ES module)
export { validateToken, listRepos, getFile, commitFile, GITHUB_API_BASE };
