<div align="center">
  <img src="public/logo.svg" width="100" height="100" alt="RUSH IELTS Logo" />
  <h1>RUSH IELTS</h1>
  <p><strong>A simple, self-managed vocabulary tool.</strong></p>
  
  <p>
    <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">
      <img src="https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg" alt="License" />
    </a>
    <img src="https://img.shields.io/badge/PWA-Ready-blue" alt="PWA" />
  </p>
</div>

---

## 💡 Motivation

**Simple problem:** I encounter a huge volume of new words daily (from dictation, reading, etc.), and I forget them just as fast.

Most vocabulary apps are too rigid or come with pre-set word lists that don't match my needs. I wanted a tool that allows me to **completely manage my own data** and control my own study progress.

**RUSH IELTS** is built for **high-frequency usage in fragmented time**. It's not about gamification or fancy algorithms; it's about quickly importing *my* words, reviewing them, and killing off the ones I don't know.

## ✨ Key Features

- **Full Control:** You decide what to learn. Import your own words via text or file.
- **Smart Import:** Automatically fetches definitions, phonetics, and examples (API-assisted).
- **Efficient Review:**
  - **Recognition Mode:** Quick flashcard style with audio.
  - **Spelling Mode:** Test your output skills.
- **Mistake Focused:** Words you miss are automatically tracked. You can focus specifically on clearing your "Mistake List".
- **Local & Offline:** No login required. All data stays in your browser (IndexedDB). Installable as a PWA on your phone.

## 🚀 Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/peixin/rush-ielts.git
   ```

2. **Install & Run**
   ```bash
   pnpm install
   pnpm run dev
   ```

3. **Build**
   ```bash
   pnpm run build
   pnpm start
   ```

## 🛡️ License

Copyright © 2026 [Percival](mailto:fengyi.mail@gmail.com).

This project is licensed under **CC BY-NC-SA 4.0**.
*   **Free for personal use.**
*   **Commercial use is strictly prohibited.**
