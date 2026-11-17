import React, { useState, useEffect, useRef } from 'react';
import Puppy from './Puppy';
import SpeechBubble from './SpeechBubble';
import { getAllSettings } from '../services/storageService';
import { speak, cancelSpeech, getRandomMessage } from '../services/speechService';
import './ReminderPopup.css';

export default function ReminderPopup() {
  const [dogState, setDogState] = useState('enter');
  const [userName, setUserName] = useState('');
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [bubbleText, setBubbleText] = useState("Hey! It's water time! 💧");
  const [buttons, setButtons] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [speaking, setSpeaking] = useState(false);

  const actionTakenRef = useRef(false);
  const countdownTimerRef = useRef(null);
  const greetingLineRef = useRef('');

  // Initialize and load user settings
  useEffect(() => {
    async function initPopup() {
      try {
        const settings = await getAllSettings();
        const user = settings.userName || 'Friend';
        setUserName(user);
        setAnimationEnabled(settings.animationEnabled !== false);

        const dismissSecs = typeof settings.autoDismissSeconds === 'number' && settings.autoDismissSeconds >= 5
          ? settings.autoDismissSeconds
          : 60;
        setTotalSeconds(dismissSecs);
        setSecondsLeft(dismissSecs);

        // Pick initial greeting from prompt-specified message collection
        const greetingLine = getRandomMessage('greeting', user);
        greetingLineRef.current = greetingLine;
        setBubbleText(greetingLine);

        setButtons([
          { label: 'Yes, done! 💧', variant: 'primary', action: 'yes' },
          { label: 'Not yet', variant: 'secondary', action: 'no' }
        ]);
      } catch (err) {
        console.warn('Failed to load popup settings:', err);
      }
    }

    initPopup();

    // After slide-in animation settles (~500ms smooth ease-out), switch from 'enter' to 'asking'
    // and speak the greeting line once the dog has arrived
    const enterTimer = setTimeout(() => {
      if (!actionTakenRef.current) {
        setDogState('asking');
        if (greetingLineRef.current) {
          speak(greetingLineRef.current, { onSpeakingChange: setSpeaking });
        }
      }
    }, 520);

    // 60-second auto-snooze countdown
    countdownTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          handleAutoSnooze();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(enterTimer);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      cancelSpeech();
    };
  }, []);

  const closeWindow = () => {
    cancelSpeech();
    if (window.api?.popup?.close) {
      window.api.popup.close();
    }
  };

  // 1. User clicked "Yes, done! 💧"
  const handleYes = async () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    cancelSpeech();

    setButtons([]);
    setDogState('happy'); // One-time small jump
    const happyLine = getRandomMessage('happy', userName);
    setBubbleText(happyLine);

    // Log 250 ml in storage
    try {
      if (window.api?.popup?.logWater) {
        await window.api.popup.logWater(250);
      }
    } catch (err) {
      console.error('Failed to log water intake:', err);
    }

    // Speak reaction line; do not close popup until speech finishes (with 6s safety timeout)
    await speak(happyLine, { onSpeakingChange: setSpeaking, safetyTimeoutMs: 6000 });

    // Cancel speech when dog slides out
    cancelSpeech();
    setDogState('exit');
    setTimeout(closeWindow, 520);
  };

  // 2. User clicked "Not yet"
  const handleNotYet = async () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    cancelSpeech();

    setButtons([]);
    setDogState('angry'); // One-time short shake
    const angryLine = getRandomMessage('angry', userName);
    setBubbleText(angryLine);

    // Repeat reminder after 10 minutes
    try {
      if (window.api?.popup?.snooze) {
        await window.api.popup.snooze(10);
      }
    } catch (err) {
      console.error('Failed to snooze reminder:', err);
    }

    // Speak reaction line; do not close popup until speech finishes (with 6s safety timeout)
    await speak(angryLine, { onSpeakingChange: setSpeaking, safetyTimeoutMs: 6000 });

    cancelSpeech();
    setDogState('exit');
    setTimeout(closeWindow, 520);
  };

  // 3. Ignored for 60 seconds
  const handleAutoSnooze = async () => {
    if (actionTakenRef.current) return;
    actionTakenRef.current = true;
    cancelSpeech();

    setButtons([]);
    setDogState('sad'); // One-time small droop
    const sadLine = getRandomMessage('sad', userName);
    setBubbleText(sadLine);

    try {
      if (window.api?.popup?.snooze) {
        await window.api.popup.snooze(10);
      }
    } catch (err) {
      console.error('Failed to auto-snooze:', err);
    }

    // Speak sad line; do not close until speech finishes (with 6s safety timeout)
    await speak(sadLine, { onSpeakingChange: setSpeaking, safetyTimeoutMs: 6000 });

    cancelSpeech();
    setDogState('exit');
    setTimeout(closeWindow, 520);
  };

  const handleButtonClick = (btn) => {
    if (btn.action === 'yes') {
      handleYes();
    } else if (btn.action === 'no') {
      handleNotYet();
    }
  };

  return (
    <div className="reminder-popup-container">
      {/* Frosted Glass Speech Bubble */}
      <SpeechBubble
        key={bubbleText}
        text={bubbleText}
        buttons={buttons}
        speed={16}
        onButtonClick={handleButtonClick}
      />

      {/* Subtle remaining countdown line (auto-snooze timer) between bubble and dog */}
      {buttons.length > 0 && (
        <div className="popup-timer-bar-wrap" title={`${secondsLeft}s until snooze`}>
          <div
            className="popup-timer-bar-fill"
            style={{ width: `${(secondsLeft / (totalSeconds || 60)) * 100}%` }}
          />
        </div>
      )}

      {/* Dog Stage (Only the dog, resting flush against bottom edge) */}
      <div className="reminder-popup-dog-stage">
        <Puppy
          state={animationEnabled ? dogState : (dogState === 'enter' || dogState === 'exit' ? dogState : 'idle')}
          speaking={speaking}
          still
        />
      </div>
    </div>
  );
}
