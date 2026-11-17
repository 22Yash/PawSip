import React, { useState, useEffect, useRef } from 'react';
import {
  getAllSettings,
  setSetting,
  resetSettings,
  DEFAULT_SETTINGS
} from '../services/storageService';
import {
  getAvailableVoices,
  speak,
  cancelSpeech
} from '../services/speechService';
import './Settings.css';

const GOAL_PRESETS = [1500, 2000, 2500, 3000];
const INTERVAL_PRESETS = [30, 45, 60, 90, 120];
const SNOOZE_PRESETS = [5, 10, 15, 20];
const DISMISS_PRESETS = [30, 45, 60, 90];

export default function Settings({ onBack, onResetToOnboarding }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [installedVoices, setInstalledVoices] = useState([]);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isSpeakingTest, setIsSpeakingTest] = useState(false);

  const saveTimerRef = useRef(null);

  // Trigger brief visual save feedback
  const flashSaveIndicator = () => {
    setSaveIndicator(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveIndicator(false), 1800);
  };

  // Load current settings and installed voices on mount
  useEffect(() => {
    async function loadData() {
      try {
        const stored = await getAllSettings();
        setSettings({ ...DEFAULT_SETTINGS, ...stored });

        const voices = await getAvailableVoices();
        setInstalledVoices(voices || []);
      } catch (err) {
        console.warn('[Settings] Error loading settings:', err);
      }
    }
    loadData();

    return () => {
      cancelSpeech();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Generic immediate save helper
  const updateField = async (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await setSetting(key, value);
      flashSaveIndicator();

      // If updating auto-launch items, also sync with OS login settings
      if (key === 'startWithWindows' || key === 'startMinimized') {
        if (window.api?.setLoginSettings) {
          const nextStartWin = key === 'startWithWindows' ? value : settings.startWithWindows;
          const nextStartMin = key === 'startMinimized' ? value : settings.startMinimized;
          await window.api.setLoginSettings({
            openAtLogin: nextStartWin,
            startMinimized: nextStartMin
          });
        }
      }
    } catch (err) {
      console.error(`[Settings] Failed to save ${key}:`, err);
    }
  };

  // Voice Test Handler
  const handleTestVoice = async () => {
    if (isSpeakingTest) {
      cancelSpeech();
      setIsSpeakingTest(false);
      return;
    }

    const testPhrases = [
      `Woof! Hey ${settings.userName || 'friend'}, I'm ready to keep you hydrated!`,
      "Stay healthy, take a little sip of water!",
      "Great job drinking water today!"
    ];
    const phrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];

    await speak(phrase, {
      force: true,
      voiceName: settings.voiceName,
      pitch: settings.voicePitch,
      rate: settings.voiceRate,
      onSpeakingChange: setIsSpeakingTest
    });
  };

  // Reset confirmation handler
  const handleConfirmReset = async () => {
    try {
      await resetSettings();
      setShowResetConfirm(false);
      if (onResetToOnboarding) {
        onResetToOnboarding();
      }
    } catch (err) {
      console.error('[Settings] Failed to reset settings:', err);
    }
  };

  return (
    <div className="settings-page">
      {/* Top Header */}
      <header className="settings-header">
        <button
          type="button"
          className="settings-back-btn"
          onClick={onBack}
          title="Return to home screen"
        >
          ← Back to Home
        </button>

        <h1 className="settings-title">
          <span>⚙️</span> PawSip Settings
        </h1>

        <div className="settings-header-right">
          <span className={`save-badge ${saveIndicator ? 'visible' : ''}`}>
            ✓ Saved
          </span>
        </div>
      </header>

      <div className="settings-content-grid">
        {/* 1. Profile & Buddy Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="card-icon">🐶</span>
            <h2>Profile & Buddy Names</h2>
          </div>

          <div className="settings-field-group">
            <label htmlFor="user-name-input">Your Name</label>
            <input
              id="user-name-input"
              type="text"
              maxLength={40}
              className="settings-text-input"
              placeholder="e.g. Alex"
              value={settings.userName || ''}
              onChange={(e) => updateField('userName', e.target.value)}
            />
            <span className="field-hint">Used in reminder greetings and cheerful voice messages.</span>
          </div>

          <div className="settings-field-group">
            <label htmlFor="puppy-name-input">Puppy Name</label>
            <input
              id="puppy-name-input"
              type="text"
              maxLength={40}
              className="settings-text-input"
              placeholder="e.g. Coco"
              value={settings.puppyName || ''}
              onChange={(e) => updateField('puppyName', e.target.value)}
            />
            <span className="field-hint">Your hydration companion's name.</span>
          </div>
        </section>

        {/* 2. Hydration Target Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="card-icon">💧</span>
            <h2>Daily Hydration Goal</h2>
          </div>

          <p className="card-subtitle">Choose a recommended goal or type a custom daily volume in milliliters.</p>

          <div className="preset-chips-row">
            {GOAL_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`preset-chip ${settings.dailyGoalMl === amount ? 'active' : ''}`}
                onClick={() => updateField('dailyGoalMl', amount)}
              >
                {amount.toLocaleString()} ml
              </button>
            ))}
          </div>

          <div className="custom-input-wrap">
            <label htmlFor="custom-goal-input">Custom Goal (ml):</label>
            <input
              id="custom-goal-input"
              type="number"
              min={250}
              max={15000}
              step={50}
              className="settings-number-input"
              value={settings.dailyGoalMl || 2000}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 100) {
                  updateField('dailyGoalMl', val);
                }
              }}
            />
          </div>
        </section>

        {/* 3. Schedule & Active Hours Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="card-icon">⏰</span>
            <h2>Reminder Schedule & Active Hours</h2>
          </div>

          <p className="card-subtitle">Reminders only fire while you are awake. Updates reschedule immediately.</p>

          <div className="settings-field-group">
            <label>Reminder Interval (Minutes)</label>
            <div className="preset-chips-row">
              {INTERVAL_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`preset-chip ${settings.intervalMinutes === mins ? 'active' : ''}`}
                  onClick={() => updateField('intervalMinutes', mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div className="custom-input-wrap" style={{ marginTop: '8px' }}>
              <label htmlFor="custom-interval-input">Custom Interval (min):</label>
              <input
                id="custom-interval-input"
                type="number"
                min={1}
                max={480}
                className="settings-number-input"
                value={settings.intervalMinutes || 60}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    updateField('intervalMinutes', val);
                  }
                }}
              />
            </div>
          </div>

          <div className="time-pickers-grid">
            <div className="settings-field-group">
              <label htmlFor="wake-time-input">Wake Time</label>
              <input
                id="wake-time-input"
                type="time"
                className="settings-time-input"
                value={settings.wakeTime || '08:00'}
                onChange={(e) => updateField('wakeTime', e.target.value)}
              />
            </div>

            <div className="settings-field-group">
              <label htmlFor="sleep-time-input">Sleep Time</label>
              <input
                id="sleep-time-input"
                type="time"
                className="settings-time-input"
                value={settings.sleepTime || '22:00'}
                onChange={(e) => updateField('sleepTime', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* 4. Popup & Snooze Behavior Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="card-icon">🔔</span>
            <h2>Popup & Snooze Timers</h2>
          </div>

          <p className="card-subtitle">Configure snooze duration and how long the popup waits before auto-snoozing.</p>

          <div className="settings-field-group">
            <label>Snooze Duration (Minutes)</label>
            <div className="preset-chips-row">
              {SNOOZE_PRESETS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className={`preset-chip ${settings.snoozeIntervalMinutes === mins ? 'active' : ''}`}
                  onClick={() => updateField('snoozeIntervalMinutes', mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <div className="custom-input-wrap" style={{ marginTop: '8px' }}>
              <label htmlFor="custom-snooze-input">Custom Snooze (min):</label>
              <input
                id="custom-snooze-input"
                type="number"
                min={1}
                max={120}
                className="settings-number-input"
                value={settings.snoozeIntervalMinutes || 10}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) {
                    updateField('snoozeIntervalMinutes', val);
                  }
                }}
              />
            </div>
          </div>

          <div className="settings-field-group">
            <label>Popup Auto-Dismiss (Seconds)</label>
            <div className="preset-chips-row">
              {DISMISS_PRESETS.map((secs) => (
                <button
                  key={secs}
                  type="button"
                  className={`preset-chip ${settings.autoDismissSeconds === secs ? 'active' : ''}`}
                  onClick={() => updateField('autoDismissSeconds', secs)}
                >
                  {secs}s
                </button>
              ))}
            </div>
            <div className="custom-input-wrap" style={{ marginTop: '8px' }}>
              <label htmlFor="custom-dismiss-input">Custom Auto-Dismiss (sec):</label>
              <input
                id="custom-dismiss-input"
                type="number"
                min={10}
                max={300}
                className="settings-number-input"
                value={settings.autoDismissSeconds || 60}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 10) {
                    updateField('autoDismissSeconds', val);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* 5. Voice & Speech Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="card-icon">🗣️</span>
            <h2>Voice & Speech Reminders</h2>
            <label className="toggle-switch-wrap">
              <input
                type="checkbox"
                checked={settings.voiceEnabled !== false}
                onChange={(e) => updateField('voiceEnabled', e.target.checked)}
              />
              <span className="toggle-track" />
              <span className="toggle-text">{settings.voiceEnabled !== false ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          <p className="card-subtitle">
            System SpeechSynthesis voice. Tuned for cute pitch and friendly pacing.
          </p>

          <div className="settings-field-group">
            <label htmlFor="settings-voice-select">Voice Engine</label>
            <select
              id="settings-voice-select"
              className="settings-dropdown"
              value={settings.voiceName || ''}
              onChange={(e) => updateField('voiceName', e.target.value)}
            >
              <option value="">✨ Automatic (Best Cute Voice / Zira / Default)</option>
              {installedVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div className="sliders-grid">
            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="settings-speed-slider">Speech Speed</label>
                <span className="slider-val-tag">{(settings.voiceRate || 0.95).toFixed(2)}x</span>
              </div>
              <input
                id="settings-speed-slider"
                type="range"
                min="0.7"
                max="1.4"
                step="0.05"
                className="settings-slider"
                value={settings.voiceRate || 0.95}
                onChange={(e) => updateField('voiceRate', parseFloat(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="settings-pitch-slider">Voice Pitch</label>
                <span className="slider-val-tag">{(settings.voicePitch || 1.3).toFixed(2)}x</span>
              </div>
              <input
                id="settings-pitch-slider"
                type="range"
                min="0.8"
                max="1.8"
                step="0.05"
                className="settings-slider"
                value={settings.voicePitch || 1.3}
                onChange={(e) => updateField('voicePitch', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div className="voice-actions-row">
            <button
              type="button"
              className={`test-voice-btn ${isSpeakingTest ? 'active' : ''}`}
              onClick={handleTestVoice}
            >
              {isSpeakingTest ? '⏹️ Stop Voice' : '🔊 Test Puppy Voice'}
            </button>
          </div>
        </section>

        {/* 6. Windows Integration Card */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="card-icon">🪟</span>
            <h2>Windows Integration</h2>
          </div>

          <div className="toggles-list">
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-title">Start with Windows</span>
                <span className="toggle-desc">Automatically launch PawSip when logging into Windows</span>
              </div>
              <label className="toggle-switch-wrap">
                <input
                  type="checkbox"
                  checked={Boolean(settings.startWithWindows)}
                  onChange={(e) => updateField('startWithWindows', e.target.checked)}
                />
                <span className="toggle-track" />
                <span className="toggle-text">{settings.startWithWindows ? 'ON' : 'OFF'}</span>
              </label>
            </div>

            <div className={`toggle-row ${!settings.startWithWindows ? 'disabled' : ''}`}>
              <div className="toggle-info">
                <span className="toggle-title">Start Minimized to Tray</span>
                <span className="toggle-desc">Launch quietly in the background without popping open the window</span>
              </div>
              <label className="toggle-switch-wrap">
                <input
                  type="checkbox"
                  checked={Boolean(settings.startMinimized)}
                  disabled={!settings.startWithWindows}
                  onChange={(e) => updateField('startMinimized', e.target.checked)}
                />
                <span className="toggle-track" />
                <span className="toggle-text">{settings.startMinimized ? 'ON' : 'OFF'}</span>
              </label>
            </div>
          </div>
        </section>

        {/* 7. Reset Settings Card */}
        <section className="settings-card danger-zone-card">
          <div className="settings-card-header">
            <span className="card-icon">⚠️</span>
            <h2>Reset Settings</h2>
          </div>

          <p className="card-subtitle">
            Reset all PawSip settings back to factory defaults. This will return you to the initial onboarding screen.
          </p>

          <button
            type="button"
            className="btn-danger-reset"
            onClick={() => setShowResetConfirm(true)}
          >
            Reset All Settings to Default
          </button>
        </section>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <span className="modal-icon">⚠️</span>
            <h3>Reset PawSip Settings?</h3>
            <p>
              Are you sure you want to reset all settings to defaults? Your custom goals, puppy name, and reminder schedules will be cleared, and you will be returned to the onboarding flow.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn-confirm"
                onClick={handleConfirmReset}
              >
                Yes, Reset Everything
              </button>
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
