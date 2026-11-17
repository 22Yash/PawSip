import React, { useState, useEffect } from 'react';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Settings from './pages/Settings';
import Playground from './pages/Playground';
import ReminderPopup from './components/ReminderPopup';
import { getAllSettings, setSetting, DEFAULT_SETTINGS } from './services/storageService';

export default function App() {
  const isPopupMode =
    typeof window !== 'undefined' &&
    (window.location.hash === '#popup' || window.location.search.includes('view=popup'));

  // If this window instance was launched as the transparent popup, render ReminderPopup immediately
  if (isPopupMode) {
    return <ReminderPopup />;
  }

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('initial'); // 'onboarding' | 'home' | 'settings' | 'playground'

  // Load persisted settings on launch
  useEffect(() => {
    async function loadInitialSettings() {
      try {
        const stored = await getAllSettings();
        setSettings(stored);
        if (stored.onboardingComplete) {
          setCurrentScreen('home');
        } else {
          setCurrentScreen('onboarding');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setCurrentScreen('onboarding');
      } finally {
        setLoading(false);
      }
    }

    loadInitialSettings();

    // Listen for tray navigation messages (e.g. user clicked "Settings" in the tray context menu)
    if (window.api?.onNavigate) {
      const unsub = window.api.onNavigate((targetView) => {
        if (targetView === 'settings') {
          setCurrentScreen('settings');
        } else if (targetView === 'home') {
          setCurrentScreen('home');
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, []);

  const handleOnboardingComplete = (newSettings) => {
    setSettings(newSettings);
    setCurrentScreen('home');
  };

  const handleRestartOnboarding = async () => {
    try {
      await setSetting('onboardingComplete', false);
      setSettings((prev) => ({ ...prev, onboardingComplete: false }));
      setCurrentScreen('onboarding');
    } catch (err) {
      console.error('Failed to restart onboarding:', err);
    }
  };

  const handleOpenPlayground = () => {
    setCurrentScreen('playground');
  };

  const handleReturnFromPlayground = () => {
    if (settings.onboardingComplete) {
      setCurrentScreen('home');
    } else {
      setCurrentScreen('onboarding');
    }
  };

  const handleOpenSettings = () => {
    setCurrentScreen('settings');
  };

  const handleReturnFromSettings = async () => {
    try {
      const refreshed = await getAllSettings();
      setSettings(refreshed);
    } catch {}
    setCurrentScreen('home');
  };

  const handleResetToOnboarding = () => {
    setSettings(DEFAULT_SETTINGS);
    setCurrentScreen('onboarding');
  };

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-card">
          <span className="loading-icon">🐾</span>
          <p>Waking up your hydration buddy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {currentScreen === 'playground' && (
        <div className="playground-wrapper">
          <div className="playground-topbar">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReturnFromPlayground}
            >
              ← Back to {settings.onboardingComplete ? 'Home' : 'Onboarding'}
            </button>
          </div>
          <Playground />
        </div>
      )}

      {currentScreen === 'settings' && (
        <Settings
          onBack={handleReturnFromSettings}
          onResetToOnboarding={handleResetToOnboarding}
        />
      )}

      {currentScreen === 'home' && (
        <Home
          settings={settings}
          onRestartOnboarding={handleRestartOnboarding}
          onOpenPlayground={handleOpenPlayground}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {currentScreen === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}
