import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Puppy from '../components/Puppy';
import SpeechBubble from '../components/SpeechBubble';
import { saveSettings } from '../services/storageService';
import './Onboarding.css';

const DAILY_GOAL_PRESETS = [1500, 2000, 2500, 3000];
const INTERVAL_PRESETS = [30, 45, 60, 90, 120];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);

  // Form state
  const [userName, setUserName] = useState('');
  const [puppyName, setPuppyName] = useState('Coco');
  const [goalPreset, setGoalPreset] = useState(2000);
  const [customGoal, setCustomGoal] = useState('');
  const [intervalPreset, setIntervalPreset] = useState(60);
  const [customInterval, setCustomInterval] = useState('');
  const [wakeTime, setWakeTime] = useState('08:00');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Validation errors
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine current active dailyGoalMl and intervalMinutes
  const effectiveGoal = goalPreset === 'custom' ? Number(customGoal) : goalPreset;
  const effectiveInterval = intervalPreset === 'custom' ? Number(customInterval) : intervalPreset;

  // Puppy state and dialog message per screen
  const getScreenConfig = () => {
    switch (step) {
      case 1:
        return {
          puppyState: 'happy',
          bubbleText: "Woof! Welcome! I'm PawSip, your friendly little hydration buddy!"
        };
      case 2:
        return {
          puppyState: 'asking',
          bubbleText: "What should I call you, and what name would you like to give me?"
        };
      case 3:
        return {
          puppyState: 'drinking',
          bubbleText: "How much water do you aim to drink each day? A good goal keeps us refreshed!"
        };
      case 4:
        return {
          puppyState: 'idle',
          bubbleText: "When are your active waking hours, and how often should I nudge you?"
        };
      case 5:
        return {
          puppyState: 'asking',
          bubbleText: "Pick your alert & motion preferences! You can adjust these anytime."
        };
      case 6:
        return {
          puppyState: 'happy',
          bubbleText: "Yay! I'm ready to keep you hydrated! Let's build healthy habits together!"
        };
      default:
        return { puppyState: 'idle', bubbleText: 'Hello!' };
    }
  };

  const { puppyState, bubbleText } = getScreenConfig();

  // Step validation
  const validateCurrentStep = () => {
    const newErrors = {};

    if (step === 2) {
      if (!userName.trim()) {
        newErrors.userName = 'Please enter your name.';
      }
      if (!puppyName.trim()) {
        newErrors.puppyName = 'Please give your puppy a name.';
      }
    }

    if (step === 3 && goalPreset === 'custom') {
      const val = Number(customGoal);
      if (!customGoal || isNaN(val) || val < 500 || val > 10000) {
        newErrors.goal = 'Please enter a goal between 500 and 10,000 ml.';
      }
    }

    if (step === 4) {
      if (intervalPreset === 'custom') {
        const val = Number(customInterval);
        if (!customInterval || isNaN(val) || val < 10 || val > 300) {
          newErrors.interval = 'Please enter an interval between 10 and 300 minutes.';
        }
      }
      if (!wakeTime) newErrors.wakeTime = 'Please select a wake time.';
      if (!sleepTime) newErrors.sleepTime = 'Please select a sleep time.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const finalSettings = {
        userName: userName.trim() || 'Friend',
        puppyName: puppyName.trim() || 'Coco',
        dailyGoalMl: effectiveGoal || 2000,
        intervalMinutes: effectiveInterval || 60,
        wakeTime: wakeTime || '08:00',
        sleepTime: sleepTime || '22:00',
        voiceEnabled,
        animationEnabled,
        soundEnabled,
        startWithWindows: true,
        startMinimized: true,
        onboardingComplete: true
      };

      await saveSettings(finalSettings);
      if (onComplete) {
        onComplete(finalSettings);
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-page">
      {/* Top Header & Step Progress */}
      <header className="onboarding-header">
        <div className="brand-badge">🐾 PawSip Hydration</div>
        <div className="step-indicator-bar">
          {[1, 2, 3, 4, 5, 6].map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className={`step-dot ${
                  step === s ? 'active' : step > s ? 'completed' : ''
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {idx < 5 && (
                <div className={`step-connector ${step > s ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Interactive Puppy & SpeechBubble Stage */}
      <section className="onboarding-stage">
        <SpeechBubble key={`speech-${step}`} text={bubbleText} speed={18} />
        <Puppy state={puppyState} speaking={false} />
      </section>

      {/* Main Screen Card Content with Animated Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-card-${step}`}
          className="onboarding-card"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {/* SCREEN 1: WELCOME */}
          {step === 1 && (
            <div className="onboarding-step-content">
              <h2 className="onboarding-card-title">Meet PawSip!</h2>
              <p className="onboarding-card-subtitle">
                Your little hydration buddy is here to keep you happy, healthy, and hydrated.
              </p>
              <button
                type="button"
                className="btn-primary btn-full"
                onClick={() => setStep(2)}
              >
                Let's Get Started 🐾
              </button>
            </div>
          )}

          {/* SCREEN 2: NAMES */}
          {step === 2 && (
            <div className="onboarding-step-content">
              <h2 className="onboarding-card-title">What should we call each other?</h2>
              <p className="onboarding-card-subtitle">
                Introduce yourself so your puppy can greet you by name!
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="userNameInput">
                  Your Name
                </label>
                <input
                  id="userNameInput"
                  type="text"
                  className={`form-input ${errors.userName ? 'error' : ''}`}
                  placeholder="e.g. Alex"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    if (errors.userName) setErrors((prev) => ({ ...prev, userName: null }));
                  }}
                  autoFocus
                />
                {errors.userName && <p className="form-error-msg">{errors.userName}</p>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="puppyNameInput">
                  Puppy's Name
                </label>
                <input
                  id="puppyNameInput"
                  type="text"
                  className={`form-input ${errors.puppyName ? 'error' : ''}`}
                  placeholder="e.g. Coco"
                  value={puppyName}
                  onChange={(e) => {
                    setPuppyName(e.target.value);
                    if (errors.puppyName) setErrors((prev) => ({ ...prev, puppyName: null }));
                  }}
                />
                {errors.puppyName && <p className="form-error-msg">{errors.puppyName}</p>}
              </div>

              <div className="nav-buttons-bar">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Next ➔
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: DAILY GOAL */}
          {step === 3 && (
            <div className="onboarding-step-content">
              <h2 className="onboarding-card-title">Daily Hydration Goal</h2>
              <p className="onboarding-card-subtitle">
                Choose how many milliliters of water you'd like to drink every day.
              </p>

              <div className="pill-grid">
                {DAILY_GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`pill-option ${goalPreset === preset ? 'selected' : ''}`}
                    onClick={() => {
                      setGoalPreset(preset);
                      setErrors((prev) => ({ ...prev, goal: null }));
                    }}
                  >
                    {preset} ml
                  </button>
                ))}
                <button
                  type="button"
                  className={`pill-option ${goalPreset === 'custom' ? 'selected' : ''}`}
                  onClick={() => setGoalPreset('custom')}
                >
                  Custom
                </button>
              </div>

              {goalPreset === 'custom' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="customGoalInput">
                    Enter Custom Goal (ml)
                  </label>
                  <input
                    id="customGoalInput"
                    type="number"
                    step="50"
                    className={`form-input ${errors.goal ? 'error' : ''}`}
                    placeholder="e.g. 2200"
                    value={customGoal}
                    onChange={(e) => {
                      setCustomGoal(e.target.value);
                      if (errors.goal) setErrors((prev) => ({ ...prev, goal: null }));
                    }}
                    autoFocus
                  />
                  {errors.goal && <p className="form-error-msg">{errors.goal}</p>}
                </div>
              )}

              <div className="info-note">
                <span>💧</span>
                <span>
                  Hydration needs vary by person, body weight, climate, and physical activity.
                  2,000 ml is a balanced, healthy baseline to get started!
                </span>
              </div>

              <div className="nav-buttons-bar">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Next ➔
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: REMINDER INTERVAL & SCHEDULE */}
          {step === 4 && (
            <div className="onboarding-step-content">
              <h2 className="onboarding-card-title">Reminder Schedule</h2>
              <p className="onboarding-card-subtitle">
                Set how often your puppy nudges you, and during which hours of the day.
              </p>

              <label className="form-label">Reminder Interval</label>
              <div className="pill-grid">
                {INTERVAL_PRESETS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`pill-option ${intervalPreset === mins ? 'selected' : ''}`}
                    onClick={() => {
                      setIntervalPreset(mins);
                      setErrors((prev) => ({ ...prev, interval: null }));
                    }}
                  >
                    {mins} min
                  </button>
                ))}
                <button
                  type="button"
                  className={`pill-option ${intervalPreset === 'custom' ? 'selected' : ''}`}
                  onClick={() => setIntervalPreset('custom')}
                >
                  Custom
                </button>
              </div>

              {intervalPreset === 'custom' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="customIntervalInput">
                    Custom Interval (minutes)
                  </label>
                  <input
                    id="customIntervalInput"
                    type="number"
                    className={`form-input ${errors.interval ? 'error' : ''}`}
                    placeholder="e.g. 45"
                    value={customInterval}
                    onChange={(e) => {
                      setCustomInterval(e.target.value);
                      if (errors.interval) setErrors((prev) => ({ ...prev, interval: null }));
                    }}
                    autoFocus
                  />
                  {errors.interval && <p className="form-error-msg">{errors.interval}</p>}
                </div>
              )}

              <div className="time-inputs-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="wakeTimeInput">
                    Wake Time
                  </label>
                  <input
                    id="wakeTimeInput"
                    type="time"
                    className="form-input"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="sleepTimeInput">
                    Sleep Time
                  </label>
                  <input
                    id="sleepTimeInput"
                    type="time"
                    className="form-input"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="info-note">
                <span>⏰</span>
                <span>
                  Reminders will only chime gently between {wakeTime || '08:00'} and {sleepTime || '22:00'}.
                  You won't be disturbed while sleeping!
                </span>
              </div>

              <div className="nav-buttons-bar">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Next ➔
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: PREFERENCES */}
          {step === 5 && (
            <div className="onboarding-step-content">
              <h2 className="onboarding-card-title">Experience Preferences</h2>
              <p className="onboarding-card-subtitle">
                Customize sounds, animations, and voice alerts to your liking.
              </p>

              <div className="pref-row">
                <div className="pref-label-group">
                  <span className="pref-title">🗣️ Spoken Voice Reminders</span>
                  <span className="pref-desc">Reads gentle reminders aloud</span>
                </div>
                <button
                  type="button"
                  className={`switch-btn ${voiceEnabled ? 'on' : ''}`}
                  onClick={() => setVoiceEnabled((prev) => !prev)}
                  aria-label="Toggle voice"
                >
                  <span className="switch-knob" />
                </button>
              </div>

              <div className="pref-row">
                <div className="pref-label-group">
                  <span className="pref-title">🐶 Puppy Animations</span>
                  <span className="pref-desc">Smooth bouncing and playful puppy motions</span>
                </div>
                <button
                  type="button"
                  className={`switch-btn ${animationEnabled ? 'on' : ''}`}
                  onClick={() => setAnimationEnabled((prev) => !prev)}
                  aria-label="Toggle animations"
                >
                  <span className="switch-knob" />
                </button>
              </div>

              <div className="pref-row">
                <div className="pref-label-group">
                  <span className="pref-title">🔔 Sound Effects</span>
                  <span className="pref-desc">Subtle water droplet chimes on events</span>
                </div>
                <button
                  type="button"
                  className={`switch-btn ${soundEnabled ? 'on' : ''}`}
                  onClick={() => setSoundEnabled((prev) => !prev)}
                  aria-label="Toggle sound"
                >
                  <span className="switch-knob" />
                </button>
              </div>

              <div className="nav-buttons-bar">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button type="button" className="btn-primary" onClick={handleNext}>
                  Review Summary ➔
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 6: COMPLETION */}
          {step === 6 && (
            <div className="onboarding-step-content">
              <h2 className="onboarding-card-title">
                Yay! I'm ready to keep you hydrated!
              </h2>
              <p className="onboarding-card-subtitle">
                Everything is set up. Let's make drinking water a joyful daily habit!
              </p>

              <div className="recap-box">
                <div className="recap-item">
                  <span>Buddy Team</span>
                  <strong>{userName.trim() || 'You'} &amp; {puppyName.trim() || 'Coco'} 🐶</strong>
                </div>
                <div className="recap-item">
                  <span>Daily Goal</span>
                  <strong>{effectiveGoal.toLocaleString()} ml / day 💧</strong>
                </div>
                <div className="recap-item">
                  <span>Reminders</span>
                  <strong>Every {effectiveInterval} mins ({wakeTime} – {sleepTime})</strong>
                </div>
                <div className="recap-item">
                  <span>Preferences</span>
                  <span>
                    {voiceEnabled ? '🗣️ Voice ' : ''}
                    {animationEnabled ? '✨ Motion ' : ''}
                    {soundEnabled ? '🔔 Sound' : ''}
                  </span>
                </div>
              </div>

              <div className="nav-buttons-bar">
                <button type="button" className="btn-secondary" onClick={handleBack}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleFinish}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Enter PawSip ✨'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
