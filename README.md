# 🐝 BeeCommit

**BeeCommit** is a Google Chrome extension that automatically syncs your accepted solutions from [Beecrowd](https://judge.beecrowd.com/) directly to a GitHub repository.

![BeeCommit Banner](PLACEHOLDER_BANNER_IMAGE_HERE)

## ✨ Features

- **Simplified Manual Sync**:
  - 🐝 button in the submissions list (`/runs`) to sync without leaving the page.
  - Floating button on the code page (`/runs/code/{ID}`).
- **No conflicts**: Checks if the file already exists and updates if necessary.
- **Multiple language support**: Automatically detects the language (C++, Python, Java, Rust, etc.) and saves with the correct extension.
- **Automatic Organization**: Creates folders per problem (`beecrowd/{ID}/problem_{ID}.ext`).
- **Semantic Commits**: Standardized messages like `feat: solve problem 1930 in Rust`.

## 🛠️ Installation (Developer Mode)

Since this extension is not yet on the Chrome Web Store, you must install it manually:

1. Clone this repository or download the source code.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the folder where you downloaded/cloned the project (the folder containing `manifest.json`).

![How to install extension in Chrome](PLACEHOLDER_INSTALLATION_SCREENSHOT)

## ⚙️ Configuration

1. Click the extension icon 🐝 in the browser toolbar.
2. **GitHub Token**: Enter your Personal Access Token (PAT).
    > **Tip:** We recommend using a [Fine-grained PAT](https://github.com/settings/personal-access-tokens/new) limited only to the target repository with `Contents: Read and write` permission.
3. **Repository**: Select the repository where your solutions will be saved.
4. Click **Save**.

![Configuring the extension](PLACEHOLDER_CONFIGURATION_SCREENSHOT)

## 🚀 How to Use

### Option 1: From the Submissions List (`/runs`)

1. Go to your submissions list at [judge.beecrowd.com/pt/runs](https://judge.beecrowd.com/pt/runs).
2. You'll see a 🐝 icon next to each **Accepted** submission.
3. Click the icon to sync.
   - ⏳ **Hourglass**: Syncing...
   - ✅ **Check**: Success! Code on GitHub.
   - ❌ **X**: Error (hover to see details).

![Sync from runs list](PLACEHOLDER_RUNS_PAGE_SCREENSHOT)

### Option 2: From the Code Page (`/runs/code/{ID}`)

1. Access the code of an accepted submission.
2. A floating button **"🐝 Sync to GitHub"** will appear in the bottom right corner.
3. Click to submit.

![Floating button on code page](PLACEHOLDER_CODE_PAGE_SCREENSHOT)

## 📁 GitHub Structure

Your solutions will be organized as follows:
```
repository-name/
└── beecrowd/
    ├── 1000/
    │   └── problem_1000.cpp
    ├── 1001/
    │   └── problem_1001.py
    └── 1930/
        └── problem_1930.rs
```

## 🔒 Privacy and Security

- Your **GitHub Token** is saved only in your browser's local storage (`chrome.storage.sync`) and is not shared with anyone.
- The extension communicates directly with the GitHub API, with no intermediaries.

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

Made with 💜 and Rust (just kidding, it's actually JS).
