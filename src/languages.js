/**
 * BeeCommit — Language Mapping
 *
 * Maps Beecrowd language names (as shown in the language selector)
 * to file extensions. The Beecrowd selector includes version info
 * like "Rust (1.48) {beta}" — we match by the base language name.
 */

const LANGUAGE_MAP = {
  // Primary focus
  'rust':        { ext: 'rs',    label: 'Rust' },

  // C family
  'c':           { ext: 'c',     label: 'C' },
  'c++':         { ext: 'cpp',   label: 'C++' },
  'c++17':       { ext: 'cpp',   label: 'C++17' },
  'c#':          { ext: 'cs',    label: 'C#' },

  // JVM
  'java':        { ext: 'java',  label: 'Java' },
  'kotlin':      { ext: 'kt',    label: 'Kotlin' },
  'scala':       { ext: 'scala', label: 'Scala' },

  // Scripting
  'python':      { ext: 'py',    label: 'Python' },
  'python 3':    { ext: 'py',    label: 'Python 3' },
  'python 3.9':  { ext: 'py',    label: 'Python 3.9' },
  'javascript':  { ext: 'js',    label: 'JavaScript' },
  'ruby':        { ext: 'rb',    label: 'Ruby' },
  'lua':         { ext: 'lua',   label: 'Lua' },
  'php':         { ext: 'php',   label: 'PHP' },
  'perl':        { ext: 'pl',    label: 'Perl' },

  // Functional
  'haskell':     { ext: 'hs',    label: 'Haskell' },
  'ocaml':       { ext: 'ml',    label: 'OCaml' },
  'clojure':     { ext: 'clj',   label: 'Clojure' },
  'elixir':      { ext: 'ex',    label: 'Elixir' },
  'erlang':      { ext: 'erl',   label: 'Erlang' },

  // Systems / compiled
  'go':          { ext: 'go',    label: 'Go' },
  'swift':       { ext: 'swift', label: 'Swift' },
  'pascal':      { ext: 'pas',   label: 'Pascal' },
  'objective-c': { ext: 'm',     label: 'Objective-C' },
  'd':           { ext: 'd',     label: 'D' },

  // Other
  'r':           { ext: 'r',     label: 'R' },
  'sql':         { ext: 'sql',   label: 'SQL' },
};

/**
 * Resolve the file extension from a Beecrowd language string.
 * Beecrowd shows languages like "Rust (1.48) {beta}" or "Python 3.9".
 * We extract the base name and look it up in the map.
 *
 * @param {string} rawLanguage — Raw language string from Beecrowd selector
 * @returns {{ ext: string, label: string } | null}
 */
function resolveLanguage(rawLanguage) {
  if (!rawLanguage) return null;

  // Remove version info in parentheses and curly braces, then trim
  // "Rust (1.48) {beta}" → "Rust"
  // "Python 3.9" → "Python 3.9" (kept as-is, mapped directly)
  const cleaned = rawLanguage
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\{.*?\}/g, '')
    .trim()
    .toLowerCase();

  // Try direct match first
  if (LANGUAGE_MAP[cleaned]) {
    return LANGUAGE_MAP[cleaned];
  }

  // Try matching just the first word (e.g., "python 3.9" → "python")
  const firstWord = cleaned.split(/\s+/)[0];
  if (LANGUAGE_MAP[firstWord]) {
    return LANGUAGE_MAP[firstWord];
  }

  // Fallback: try partial match
  for (const [key, value] of Object.entries(LANGUAGE_MAP)) {
    if (cleaned.startsWith(key) || key.startsWith(cleaned)) {
      return value;
    }
  }

  return null;
}

// Make available to other content scripts (they share the same scope)
// and also export for service worker (ES module)
if (typeof window !== 'undefined') {
  window.BeeCommit = window.BeeCommit || {};
  window.BeeCommit.resolveLanguage = resolveLanguage;
  window.BeeCommit.LANGUAGE_MAP = LANGUAGE_MAP;
}
