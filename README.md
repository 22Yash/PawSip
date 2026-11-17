# PawSip 🐶💧

> **Your cute, offline-first desktop hydration buddy.**  
> PawSip reminds you to drink water with an expressive animated puppy, friendly voice prompts, and gentle desktop popups. 100% private, local-only, and distraction-free.

---

## ✨ Features

- **🐾 Expressive Puppy Companion**: Multiple emotional sprite states (idle, asking, happy, angry, sad, drinking, sleeping) with smooth crossfades and subtle animations.
- **💬 Frosted Glass Speech Bubble**: Clean translucent bubble with typing and fade-in effects.
- **⏰ Smart Reminder Scheduler**: Uses non-drifting epoch timestamps, active waking hours respect, system sleep wake-up recovery, and auto-dismiss/snooze controls.
- **🪟 Frameless Transparent Reminder**: Unobtrusive, non-focus-stealing bottom-right popup that lets you confirm your sip with a single click.
- **🗣️ Natural Voice Prompts**: Web SpeechSynthesis audio tuned to a cute, friendly pitch and rate with randomized greeting/encouragement lines.
- **🎛️ Dedicated Settings Control**: Configure daily water goal, reminder interval, wake/sleep schedule, snooze duration, voice toggles, and Windows startup preferences.
- **🛡️ 100% Offline & Private**: Zero cloud dependencies, zero external tracking, and zero account required. Everything stays securely on your PC via encrypted local storage.

---

## 🚀 Getting Started (Development)

### Prerequisites

- **Node.js** v18 or newer
- **Windows 10 / 11**

### 1. Install Dependencies

```bash
npm install
```

### 2. Run in Development Mode

```bash
npm run dev
```

This concurrently launches:
1. **Vite dev server** on `http://localhost:5173`
2. **Electron main process** connected with hot reloading

---

## 📦 Building the Installer

To produce a production-ready Windows installer:

```bash
npm run dist
```

This command will:
1. Generate multi-resolution Windows icons (`build/icon.ico` with 16, 24, 32, 48, 64, 128, and 256px frames).
2. Bundle the React frontend with Vite into `dist/`.
3. Package the Electron executable and create an NSIS installer into the **`release/`** directory.

The resulting installer is saved at:
```
release/PawSip Setup.exe
```

---

## 💿 How to Install PawSip

1. Navigate to the `release/` folder and double-click **`PawSip Setup.exe`**.
2. **Choose Installation Directory**: The installer lets you select your preferred install path (defaults to `%LOCALAPPDATA%\Programs\PawSip` or `Program Files`).
3. Complete the setup wizard.
4. The installer will automatically:
   - Create a **Desktop shortcut** named `PawSip`.
   - Create a **Start Menu shortcut** in the PawSip folder.
   - Install an **Uninstaller** accessible via Windows *Settings > Installed apps* (or *Control Panel > Programs and Features*).

---

## ⚠️ Note on Windows SmartScreen Warning

Because this desktop app binary is built locally and is not signed with a paid Extended Validation (EV) code-signing certificate:

When you run `PawSip Setup.exe` for the first time, Windows Defender SmartScreen may display a warning dialog:
> **"Windows protected your PC"**  
> *Microsoft Defender SmartScreen prevented an unrecognized app from starting.*

### To proceed with installation:
1. Click **"More info"** on the SmartScreen dialog.
2. Click **"Run anyway"**.

The application will install normally. The app contains zero network calls or telemetry and runs strictly within an isolated local sandbox.

---

## 🗑️ How to Uninstall

- Open **Windows Settings** (`Win + I`) > **Apps** > **Installed apps**.
- Search for **PawSip** and click **Uninstall**.
- Alternatively, run the `Uninstall PawSip.exe` found in the PawSip installation folder or via the Start Menu shortcut.
- Your settings and hydration logs in `%APPDATA%\pawsip` are preserved safely. To remove all local data, delete `%APPDATA%\pawsip`.
- Open PowerShell and run.
  Get-Process electron,PawSip -ErrorAction SilentlyContinue | Select-Object Name,Id,Path.
  (The Path column tells you which copy it is. A path inside your pawsip\node_modules\electron\dist folder is the dev copy. A path under AppData\Local\Programs\PawSip is the installed one.)
 taskkill /F /IM electron.exe /T.
 taskkill /F /IM PawSip.exe /T.

---

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 34
- **UI & Components**: React 19, Framer Motion
- **Build System**: Vite 6, electron-builder 25
- **Local Persistence**: electron-store 10 (IPC validated)
- **Audio / TTS**: Browser SpeechSynthesis API
