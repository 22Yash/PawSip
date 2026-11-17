import React, { useState, useEffect, useRef } from 'react';
import Puppy from '../components/Puppy';
import SpeechBubble from '../components/SpeechBubble';
import { getSetting, setSetting } from '../services/storageService';
import {
  speak,
  cancelSpeech,
  getAvailableVoices,
  getRandomMessage
} from '../services/speechService';
import './Home.css';

export default function Home({
  settings,
  onRestartOnboarding,
  onOpenPlayground,
  onOpenSettings
}) {
  const [drankMl, setDrankMl] = useState(Number(settings.todayMl) || 0);
  const [devFastInterval, setDevFastInterval] = useState(Boolean(settings.devFastInterval));
  const [nextReminderTime, setNextReminderTime] = useState('');
  const [reminderStatusMsg, setReminderStatusMsg] = useState(null);
  const [homePuppyState, setHomePuppyState] = useState('idle');
  const [speaking, setSpeaking] = useState(false);
  const [installedVoices, setInstalledVoices] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled !== false);
  const [voiceName, setVoiceName] = useState(settings.voiceName || '');
  const [voicePitch, setVoicePitch] = useState(
    typeof settings.voicePitch === 'number' ? settings.voicePitch : 1.3
  );
  const [voiceRate, setVoiceRate] = useState(
    typeof settings.voiceRate === 'number' ? settings.voiceRate : 0.95
  );
  const [startWithWindows, setStartWithWindows] = useState(Boolean(settings.startWithWindows));
  const [startMinimized, setStartMinimized] = useState(Boolean(settings.startMinimized));
  const [isDev, setIsDev] = useState(Boolean(import.meta.env.DEV));
  const [voiceStatusMsg, setVoiceStatusMsg] = useState(null);
  const happyResetTimerRef = useRef(null);

  const [bubbleText, setBubbleText] = useState(
    `Ready for a refreshing sip? Let's reach your ${settings.dailyGoalMl.toLocaleString()} ml goal today! 💧`
  );

  // Poll / refresh reminder status and todayMl
  const refreshStatus = async () => {
    try {
      const ml = await getSetting('todayMl');
      if (typeof ml === 'number') setDrankMl(ml);

      const fast = await getSetting('devFastInterval');
      if (typeof fast === 'boolean') setDevFastInterval(fast);

      if (window.api?.reminder?.getStatus) {
        const status = await window.api.reminder.getStatus();
        if (status.nextReminderAt) {
          const d = new Date(status.nextReminderAt);
          setNextReminderTime(
            d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
        }
      }
    } catch (err) {
      console.warn('Error refreshing home status:', err);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 4000);

    // Initialize installed voices & stored preferences
    async function initSettings() {
      try {
        const voices = await getAvailableVoices();
        setInstalledVoices(voices || []);

        const [
          savedEnabled,
          savedName,
          savedPitch,
          savedRate,
          savedStartWin,
          savedStartMin
        ] = await Promise.all([
          getSetting('voiceEnabled'),
          getSetting('voiceName'),
          getSetting('voicePitch'),
          getSetting('voiceRate'),
          getSetting('startWithWindows'),
          getSetting('startMinimized')
        ]);

        if (typeof savedEnabled === 'boolean') setVoiceEnabled(savedEnabled);
        if (typeof savedName === 'string') setVoiceName(savedName);
        if (typeof savedPitch === 'number') setVoicePitch(savedPitch);
        if (typeof savedRate === 'number') setVoiceRate(savedRate);
        if (typeof savedStartWin === 'boolean') setStartWithWindows(savedStartWin);
        if (typeof savedStartMin === 'boolean') setStartMinimized(savedStartMin);

        if (window.api?.getInfo) {
          const info = await window.api.getInfo();
          if (typeof info?.isDev === 'boolean') {
            setIsDev(info.isDev);
          }
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
    }
    initSettings();

    return () => {
      clearInterval(interval);
      cancelSpeech();
      if (happyResetTimerRef.current) clearTimeout(happyResetTimerRef.current);
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const progressPercent = Math.min(
    Math.round((drankMl / (settings.dailyGoalMl || 2000)) * 100),
    100
  );

  // Home screen "log water" reaction: speaks randomized happy line, updates bubble & puppy
  const handleQuickLog = async (amount) => {
    const next = drankMl + amount;
    setDrankMl(next);

    // Pick randomized happy message
    const happyLine = getRandomMessage('happy', settings.userName || 'Friend');
    setBubbleText(happyLine);

    // Set puppy state to happy temporarily
    setHomePuppyState('happy');
    if (happyResetTimerRef.current) clearTimeout(happyResetTimerRef.current);
    happyResetTimerRef.current = setTimeout(() => {
      setHomePuppyState('idle');
    }, 2800);

    // Speak reaction line using speechService
    speak(happyLine, {
      voiceName,
      pitch: voicePitch,
      rate: voiceRate,
      onSpeakingChange: setSpeaking
    });

    try {
      await setSetting('todayMl', next);
      await setSetting('lastDrankAt', Date.now());
    } catch (err) {
      console.warn('Failed to save drank water:', err);
    }
  };

  const handleTestReminderNow = async () => {
    try {
      if (window.api?.reminder?.triggerNow) {
        const ok = await window.api.reminder.triggerNow();
        setReminderStatusMsg(ok ? '⚡ Popup triggered at bottom-right!' : 'Popup is already open.');
        setTimeout(() => setReminderStatusMsg(null), 3500);
      }
    } catch (err) {
      console.error('Failed to trigger reminder:', err);
    }
  };

  const handleToggleFastInterval = async () => {
    try {
      if (window.api?.reminder?.toggleFastInterval) {
        const next = await window.api.reminder.toggleFastInterval();
        setDevFastInterval(next);
        setReminderStatusMsg(
          next ? '⚡ Dev 1-minute interval activated!' : 'Normal reminder schedule restored.'
        );
        setTimeout(() => setReminderStatusMsg(null), 3500);
        refreshStatus();
      }
    } catch (err) {
      console.error('Failed to toggle fast interval:', err);
    }
  };

  const handleToggleVoiceEnabled = async (e) => {
    const val = e.target.checked;
    setVoiceEnabled(val);
    try {
      await setSetting('voiceEnabled', val);
    } catch (err) {
      console.warn('Failed to save voiceEnabled:', err);
    }
  };

  const handleToggleStartWithWindows = async (e) => {
    const val = e.target.checked;
    setStartWithWindows(val);
    try {
      await setSetting('startWithWindows', val);
      if (window.api?.setLoginSettings) {
        await window.api.setLoginSettings({ openAtLogin: val, startMinimized });
      }
    } catch (err) {
      console.warn('Failed to save startWithWindows:', err);
    }
  };

  const handleToggleStartMinimized = async (e) => {
    const val = e.target.checked;
    setStartMinimized(val);
    try {
      await setSetting('startMinimized', val);
      if (window.api?.setLoginSettings) {
        await window.api.setLoginSettings({ openAtLogin: startWithWindows, startMinimized: val });
      }
    } catch (err) {
      console.warn('Failed to save startMinimized:', err);
    }
  };

  const handleVoiceChange = async (e) => {
    const selected = e.target.value;
    setVoiceName(selected);
    try {
      await setSetting('voiceName', selected);
    } catch (err) {
      console.warn('Failed to save voiceName:', err);
    }
  };

  const handlePitchChange = async (e) => {
    const val = parseFloat(e.target.value);
    setVoicePitch(val);
    try {
      await setSetting('voicePitch', val);
    } catch (err) {
      console.warn('Failed to save voicePitch:', err);
    }
  };

  const handleRateChange = async (e) => {
    const val = parseFloat(e.target.value);
    setVoiceRate(val);
    try {
      await setSetting('voiceRate', val);
    } catch (err) {
      console.warn('Failed to save voiceRate:', err);
    }
  };

  const handleTestVoice = async () => {
    if (speaking) {
      cancelSpeech();
      setSpeaking(false);
      setVoiceStatusMsg(null);
      return;
    }

    const testPhrases = [
      "Woof woof! I'm ready to keep you hydrated!",
      "Psst! Don't forget your water!",
      "Yay! Good human. Stay hydrated!"
    ];
    const testLine = testPhrases[Math.floor(Math.random() * testPhrases.length)];
    setBubbleText(testLine);
    setVoiceStatusMsg('Speaking sample line...');

    await speak(testLine, {
      force: true, // test even if disabled
      voiceName,
      pitch: voicePitch,
      rate: voiceRate,
      onSpeakingChange: (isSpeaking) => {
        setSpeaking(isSpeaking);
        if (!isSpeaking) setVoiceStatusMsg(null);
      }
    });
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-content">
          <div className="home-titles">
            <h1 className="home-greeting">
              {getGreeting()}, {settings.userName || 'Friend'}!
            </h1>
            <p className="home-subgreeting">
              {settings.puppyName || 'Coco'} is happy to see you! 🐶
            </p>
          </div>
          <button
            type="button"
            className="home-settings-btn"
            onClick={onOpenSettings}
            title="Open PawSip Settings"
          >
            ⚙️ Settings
          </button>
        </div>
      </header>

      {/* Main Puppy Stage with idle puppy and speech bubble */}
      <section className="home-stage">
        <SpeechBubble
          key={bubbleText}
          text={bubbleText}
          speed={20}
          buttons={['Drink 250 ml 💧', 'Drink 500 ml 🌊']}
          onButtonClick={(btn) => {
            const label = typeof btn === 'string' ? btn : btn.label;
            if (label.includes('250')) handleQuickLog(250);
            else if (label.includes('500')) handleQuickLog(500);
          }}
        />
        <Puppy state={homePuppyState} speaking={speaking} />
      </section>

      {/* Hydration Stats Card */}
      <section className="home-stats-card">
        <div className="home-card-header">
          <h2 className="home-card-title">
            <span>💧</span>
            <span>Today's Hydration</span>
          </h2>
          <span className="home-goal-badge">
            Goal: {settings.dailyGoalMl.toLocaleString()} ml
          </span>
        </div>

        <div className="home-progress-container">
          <div className="home-progress-labels">
            <span>
              {drankMl.toLocaleString()} / {settings.dailyGoalMl.toLocaleString()} ml
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="home-progress-bar-bg">
            <div
              className="home-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="home-metrics-grid">
          <div className="metric-pill">
            <span className="metric-icon">⏰</span>
            <div className="metric-text">
              <span className="metric-label">Reminder Interval</span>
              <span className="metric-val">
                {isDev && devFastInterval ? '⚡ 1 min (Dev)' : `Every ${settings.intervalMinutes} min`}
              </span>
            </div>
          </div>

          <div className="metric-pill">
            <span className="metric-icon">🔔</span>
            <div className="metric-text">
              <span className="metric-label">Next Reminder At</span>
              <span className="metric-val">{nextReminderTime || 'Calculating...'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Voice Reminders & Speech Settings Card */}
      <section className="home-voice-card">
        <div className="home-card-header">
          <h2 className="home-card-title">
            <span>🗣️</span>
            <span>Voice Reminders (System Speech)</span>
          </h2>
          <label className="voice-toggle-switch">
            <input
              type="checkbox"
              checked={voiceEnabled}
              onChange={handleToggleVoiceEnabled}
            />
            <span className="voice-toggle-slider" />
            <span className="voice-toggle-label">{voiceEnabled ? 'ON' : 'OFF'}</span>
          </label>
        </div>

        <p className="voice-card-subtitle">
          Offline SpeechSynthesis voice. Tuned with cute pitch and gentle pacing.
        </p>

        {/* Voice Picker Dropdown */}
        <div className="voice-picker-group">
          <label className="voice-input-label" htmlFor="voice-select">
            Puppy Voice:
          </label>
          <select
            id="voice-select"
            className="voice-select-dropdown"
            value={voiceName}
            onChange={handleVoiceChange}
          >
            <option value="">✨ Auto-detect Best Cute Voice (Recommended)</option>
            {installedVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Sliders for Pitch and Rate */}
        <div className="voice-sliders-grid">
          <div className="voice-slider-item">
            <div className="voice-slider-header">
              <label htmlFor="pitch-slider">Pitch (Cuteness)</label>
              <span className="voice-val-tag">{voicePitch.toFixed(2)}x</span>
            </div>
            <input
              id="pitch-slider"
              type="range"
              min="0.8"
              max="1.8"
              step="0.05"
              value={voicePitch}
              onChange={handlePitchChange}
              className="voice-range-slider"
            />
          </div>

          <div className="voice-slider-item">
            <div className="voice-slider-header">
              <label htmlFor="rate-slider">Speed (Pacing)</label>
              <span className="voice-val-tag">{voiceRate.toFixed(2)}x</span>
            </div>
            <input
              id="rate-slider"
              type="range"
              min="0.7"
              max="1.4"
              step="0.05"
              value={voiceRate}
              onChange={handleRateChange}
              className="voice-range-slider"
            />
          </div>
        </div>

        {/* Test Voice Button */}
        <div className="voice-card-footer">
          <button
            type="button"
            className={`btn-test-voice ${speaking ? 'is-speaking' : ''}`}
            onClick={handleTestVoice}
          >
            {speaking ? '⏹️ Stop Speaking' : '🔊 Test Puppy Voice'}
          </button>
          {voiceStatusMsg && (
            <span className="voice-status-feedback">{voiceStatusMsg}</span>
          )}
        </div>
      </section>

      {/* Windows Integration & Startup Card */}
      <section className="home-windows-card">
        <div className="home-card-header">
          <h2 className="home-card-title">
            <span>🪟</span>
            <span>Windows Integration</span>
          </h2>
          <span className="home-tray-badge">Tray Active 🐾</span>
        </div>

        <p className="windows-card-subtitle">
          Closing PawSip hides it to the system tray so reminders keep running.
        </p>

        <div className="windows-toggles-list">
          <div className="windows-toggle-row">
            <div className="windows-toggle-info">
              <span className="windows-toggle-title">Start with Windows</span>
              <span className="windows-toggle-desc">Automatically launch PawSip when you log into your PC</span>
            </div>
            <label className="voice-toggle-switch">
              <input
                type="checkbox"
                checked={startWithWindows}
                onChange={handleToggleStartWithWindows}
              />
              <span className="voice-toggle-slider" />
              <span className="voice-toggle-label">{startWithWindows ? 'ON' : 'OFF'}</span>
            </label>
          </div>

          <div className={`windows-toggle-row ${!startWithWindows ? 'disabled' : ''}`}>
            <div className="windows-toggle-info">
              <span className="windows-toggle-title">Start Minimized to Tray</span>
              <span className="windows-toggle-desc">Run quietly in the background without opening the window</span>
            </div>
            <label className="voice-toggle-switch">
              <input
                type="checkbox"
                checked={startMinimized}
                disabled={!startWithWindows}
                onChange={handleToggleStartMinimized}
              />
              <span className="voice-toggle-slider" />
              <span className="voice-toggle-label">{startMinimized ? 'ON' : 'OFF'}</span>
            </label>
          </div>
        </div>
      </section>

      {/* Quick Action & Testing Controls */}
      <div className="home-actions-row">
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleQuickLog(250)}
        >
          +250 ml Water 💧
        </button>

        {/* Test reminder button - DEV MODE ONLY */}
        {isDev && (
          <button
            type="button"
            className="btn-secondary test-reminder-btn"
            onClick={handleTestReminderNow}
            title="Fires the bottom-right frameless reminder popup immediately (Dev Only)"
          >
            ⚡ Test Reminder Now (Dev)
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {reminderStatusMsg && (
        <div className="action-feedback-pill">
          <span>🔔</span>
          <span>{reminderStatusMsg}</span>
        </div>
      )}

      {/* Dev Controls & Links - DEV MODE ONLY */}
      {isDev && (
        <footer className="dev-footer">
          <button
            type="button"
            className={`dev-toggle-chip ${devFastInterval ? 'active' : ''}`}
            onClick={handleToggleFastInterval}
          >
            <span>{devFastInterval ? '⚡ Fast 1-min: ON' : '🐢 Fast 1-min: OFF'}</span>
          </button>
          <span style={{ color: '#d5bca9' }}>•</span>
          <button
            type="button"
            className="dev-link"
            onClick={onRestartOnboarding}
            title="Reset and replay onboarding"
          >
            🔄 Restart Onboarding
          </button>
          <span style={{ color: '#d5bca9' }}>•</span>
          <button
            type="button"
            className="dev-link"
            onClick={onOpenPlayground}
            title="Hidden developer tool to test puppy sprite animations"
          >
            🛠️ Dev Playground
          </button>
        </footer>
      )}
    </div>
  );
}
