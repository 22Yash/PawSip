import React, { useState } from 'react';
import Puppy from '../components/Puppy';
import SpeechBubble from '../components/SpeechBubble';

const PUPPY_STATES = [
  {
    id: 'asking',
    label: 'Asking',
    icon: '❓',
    sprite: 'asking.png',
    description: 'Slow head-tilt rotation back and forth',
    bubbleText: 'Have you had a glass of water recently? 💧',
    buttons: ['Yes, I drank! ✅', 'Remind in 5m ⏰']
  },
  {
    id: 'idle',
    label: 'Idle',
    icon: '🐾',
    sprite: 'asking.png',
    description: 'Gentle breathing (scale pulse), small head bob',
    bubbleText: 'Just resting here! Remember to stay hydrated today. 🐾',
    buttons: ['Pet Puppy 🐶']
  },
  {
    id: 'enter',
    label: 'Enter',
    icon: '➡️',
    sprite: 'asking.png',
    description: 'Slides in from right screen edge with overshoot & settle',
    bubbleText: 'Woof! I arrived to keep you company and hydrated! ✨',
    buttons: ['Welcome! 👋']
  },
  {
    id: 'happy',
    label: 'Happy',
    icon: '✨',
    sprite: 'happy.png',
    description: 'Jump/bounce plus a quick wiggle',
    bubbleText: 'Yay! Awesome job drinking water! Proud of you! 🎉',
    buttons: ['High Paw! 🐾']
  },
  {
    id: 'angry',
    label: 'Angry',
    icon: '😾',
    sprite: 'angry.png',
    description: 'Shake, then slide out',
    bubbleText: 'Hey! You haven’t had water in way too long! Drink up! 😾',
    buttons: ['Drinking right now! 🏃‍♂️', 'Sorry! 🥺']
  },
  {
    id: 'sad',
    label: 'Sad',
    icon: '🥺',
    sprite: 'sad.png',
    description: 'Slow droop (slight downward move + scale)',
    bubbleText: 'My bowl is dry and you seem thirsty too... please take a sip? 🥺',
    buttons: ['Taking a sip! 💧']
  },
  {
    id: 'drinking',
    label: 'Drinking',
    icon: '💧',
    sprite: 'drinking.png',
    description: 'Small repeated dip downward',
    bubbleText: '*Slurp slurp* Ahhh, cool fresh water is the best! 🌊',
    buttons: ['Cheers! 🥤']
  },
  {
    id: 'sleeping',
    label: 'Sleeping',
    icon: '💤',
    sprite: 'sleeping.png',
    description: 'Slow breathing with floating "Zzz" text (placeholder fallback)',
    bubbleText: 'Zzz... Resting my paws... Keep drinking your water... 💤',
    buttons: ['Sleep well 🌙']
  },
  {
    id: 'exit',
    label: 'Exit',
    icon: '🚪',
    sprite: 'asking.png',
    description: 'Slides back out to the right',
    bubbleText: 'Trotting away for a moment! Keep that water bottle close! 🐾',
    buttons: ['See you soon! 👋']
  }
];

export default function Playground() {
  const [currentState, setCurrentState] = useState('asking');
  const [speaking, setSpeaking] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  // Allow re-triggering animated transitions (enter, exit, angry) by re-setting state
  const handleSelectState = (stateId) => {
    if (currentState === stateId) {
      setCurrentState('idle');
      setTimeout(() => setCurrentState(stateId), 40);
    } else {
      setCurrentState(stateId);
    }
  };

  const activeStateInfo = PUPPY_STATES.find((s) => s.id === currentState) || PUPPY_STATES[0];

  const handleBubbleButtonClick = (btn) => {
    const label = typeof btn === 'string' ? btn : btn.label;
    setLastAction(`Clicked: "${label}"`);

    // Interactive button reactions
    if (label.includes('Yes') || label.includes('Cheers') || label.includes('Drinking')) {
      setCurrentState('happy');
    } else if (label.includes('Taking a sip')) {
      setCurrentState('drinking');
    } else if (label.includes('Pet')) {
      setCurrentState('happy');
    }
  };

  return (
    <div className="playground-page">
      <header className="playground-header">
        <h1>🐶 PawSip — Sprite Puppy &amp; Speech Bubble</h1>
        <p>Step 2: Framer Motion Sprite Animations &amp; Frosted-Glass Dialogue System</p>
      </header>

      {/* Main Puppy Stage */}
      <div className="stage-container">
        <div className="stage-decorations">
          <div className="badge-group">
            <span className="stage-badge">
              State: <strong>{currentState}</strong>
            </span>
            <span className="sprite-badge" title="Source asset">
              Sprite: <code>{activeStateInfo.sprite}</code>
              {activeStateInfo.sprite === 'sleeping.png' && ' (fallback)'}
            </span>
          </div>

          <span
            className={`stage-speaking-indicator ${
              speaking ? 'speaking-active' : 'speaking-inactive'
            }`}
          >
            {speaking ? '🗣️ Speaking ON' : '🤐 Speaking OFF'}
          </span>
        </div>

        {/* Grass accents */}
        <div className="stage-grass-tufts">
          <span>🌱</span>
          <span>🌿</span>
          <span>🌱</span>
          <span>🌿</span>
        </div>

        {/* Frosted Glass Speech Bubble Component */}
        <SpeechBubble
          key={currentState}
          text={activeStateInfo.bubbleText}
          buttons={activeStateInfo.buttons}
          speed={20}
          onButtonClick={handleBubbleButtonClick}
        />

        {/* Sprite-Based Puppy Character Component */}
        <Puppy state={currentState} speaking={speaking} />

        {/* Ground level */}
        <div className="stage-ground" />
      </div>

      {/* Action feedback alert if any button clicked */}
      {lastAction && (
        <div className="action-feedback-pill">
          <span>✨</span>
          <span>{lastAction}</span>
          <button
            type="button"
            className="feedback-dismiss-btn"
            onClick={() => setLastAction(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Controls */}
      <section className="controls-panel">
        <div className="controls-section-title">
          <span>Test Animation States ({PUPPY_STATES.length})</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 'normal', color: '#9c8270' }}>
            {activeStateInfo.description}
          </span>
        </div>

        <div className="button-grid">
          {PUPPY_STATES.map((s) => {
            const isActive = currentState === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`state-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectState(s.id)}
                title={s.description}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="options-row">
          <button
            type="button"
            className={`toggle-speaking-btn ${speaking ? 'active' : ''}`}
            onClick={() => setSpeaking((prev) => !prev)}
          >
            <span>{speaking ? '🔊' : '🔇'}</span>
            <span>Speaking Mode: {speaking ? 'Active' : 'Inactive'}</span>
          </button>

          <div className="dialogue-preview">
            <span>💡</span>
            <span>
              Crossfades between transparent PNGs with Framer Motion transitions.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
