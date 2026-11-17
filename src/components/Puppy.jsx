import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Puppy.css';

/**
 * State to Sprite Image mapping
 * Assets are located in public/assets/dog/
 */
const STATE_SPRITE_MAP = {
  idle: 'asking.png',
  enter: 'asking.png',
  asking: 'asking.png',
  happy: 'happy.png',
  angry: 'angry.png',
  sad: 'sad.png',
  drinking: 'drinking.png',
  sleeping: 'sleeping.png',
  exit: 'asking.png'
};

/**
 * Fallback placeholder when an image is missing (e.g. sleeping.png)
 */
function SpritePlaceholder({ stateName, fileName }) {
  const getIcon = () => {
    switch (stateName) {
      case 'sleeping':
        return '💤';
      case 'happy':
        return '✨';
      case 'sad':
        return '🥺';
      case 'angry':
        return '😾';
      case 'drinking':
        return '💧';
      case 'asking':
        return '❓';
      default:
        return '🐶';
    }
  };

  return (
    <div className="puppy-placeholder">
      <div className="placeholder-icon">{getIcon()}</div>
      <div className="placeholder-title">{stateName} puppy</div>
      <div className="placeholder-badge">{fileName} missing</div>
    </div>
  );
}

/**
 * Single Sprite Image with graceful error fallback handling
 */
function SpriteImage({ stateName, fileName, still = false }) {
  const [hasError, setHasError] = useState(false);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  const baseUrl = import.meta.env.BASE_URL || './';
  const primarySrc = `${baseUrl}assets/dog/${fileName}`;
  const fallbackSrc = fileName === 'asking.png' ? `${baseUrl}assets/dog/asked.png` : null;

  const [currentSrc, setCurrentSrc] = useState(primarySrc);

  const handleError = () => {
    // If asking.png fails, try asked.png before falling back to placeholder
    if (fallbackSrc && !attemptedFallback) {
      setAttemptedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return <SpritePlaceholder stateName={stateName} fileName={fileName} />;
  }

  return (
    <img
      src={currentSrc}
      alt={`${stateName} puppy`}
      className={`puppy-sprite-img ${still ? 'still-mode' : ''}`}
      onError={handleError}
      draggable={false}
    />
  );
}

/**
 * Puppy Component
 *
 * Props:
 * - state: 'idle' | 'enter' | 'asking' | 'happy' | 'angry' | 'sad' | 'drinking' | 'sleeping' | 'exit'
 * - speaking: boolean
 * - still: boolean - when true, puppy uses still mode in reminder popup:
 *                    slides in once, stays completely still while waiting,
 *                    plays 1-time reaction upon answer, then slides out.
 */
export default function Puppy({ state = 'asking', speaking = false, still = false }) {
  const spriteFileName = STATE_SPRITE_MAP[state] || 'asking.png';

  // Standard interactive Framer Motion animation variants (for Playground, Onboarding, Home)
  const motionVariants = {
    // idle: gentle breathing (scale pulse), small head bob
    idle: {
      x: 0,
      y: [0, -6, 0],
      scale: [1, 1.026, 1],
      rotate: [0, 1.5, -1.5, 0],
      opacity: 1,
      transition: {
        y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 4.8, repeat: Infinity, ease: 'easeInOut' }
      }
    },

    // enter: slides in from the right screen edge with a slight overshoot and settle
    enter: {
      x: [400, -16, 0],
      y: 0,
      scale: 1,
      rotate: [6, -2, 0],
      opacity: [0, 1, 1],
      transition: {
        x: { duration: 0.95, times: [0, 0.72, 1], ease: [0.16, 0.9, 0.3, 1.25] },
        rotate: { duration: 0.95, times: [0, 0.72, 1], ease: 'easeOut' },
        opacity: { duration: 0.35 }
      }
    },

    // asking: slow head-tilt rotation back and forth
    asking: {
      x: 0,
      y: [0, -3, 0],
      scale: 1,
      rotate: [-11, 11, -11],
      opacity: 1,
      transition: {
        rotate: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
        y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
      }
    },

    // happy: jump/bounce plus a quick wiggle
    happy: {
      x: 0,
      y: [0, -32, 0, -18, 0],
      scale: [1, 1.04, 0.98, 1.02, 1],
      rotate: [0, -8, 8, -4, 4, 0],
      opacity: 1,
      transition: {
        duration: 0.75,
        repeat: Infinity,
        repeatDelay: 0.2,
        ease: 'easeInOut'
      }
    },

    // angry: shake, then slide out
    angry: {
      x: [
        0, -9, 9, -9, 9, -7, 7, -5, 5, 0, // shake vigorously
        0,                                 // brief pause
        -420                               // slide out!
      ],
      y: [0, -2, 2, -2, 2, 0, 0, 0, 0, 0, 0, 0],
      scale: [1, 1.03, 1.03, 1.03, 1.03, 1.02, 1.02, 1, 1, 1, 1, 0.95],
      rotate: [0, -4, 4, -4, 4, -2, 2, 0, 0, 0, 0, -6],
      opacity: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      transition: {
        duration: 2.3,
        times: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.46, 0.72, 1],
        ease: 'easeInOut'
      }
    },

    // sad: slow droop (slight downward move + scale)
    sad: {
      x: 0,
      y: [0, 16],
      scaleY: [1, 0.93],
      scaleX: [1, 1.03],
      rotate: [0, 2],
      opacity: 1,
      transition: {
        duration: 1.4,
        ease: 'easeOut'
      }
    },

    // drinking: small repeated dip downward
    drinking: {
      x: 0,
      y: [0, 16, 0],
      scale: [1, 0.98, 1],
      rotate: [0, 3, 0],
      opacity: 1,
      transition: {
        duration: 0.75,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },

    // sleeping: slow breathing with floating "Zzz" text
    sleeping: {
      x: 0,
      y: [0, 8, 0],
      scaleY: [1, 0.95, 1],
      scaleX: [1, 1.02, 1],
      rotate: [0, 1.5, 0],
      opacity: 1,
      transition: {
        duration: 3.4,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },

    // exit: slides back out to the right
    exit: {
      x: [0, 420],
      y: 0,
      scale: 1,
      rotate: [0, -4],
      opacity: [1, 0],
      transition: {
        duration: 0.75,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  // Still variants (for reminder popup only)
  // - Entry: slides in from right edge once (~0.5s, smooth ease-out, no overshoot, no bounce), then stops
  // - While waiting: completely still (no rotation, no head tilt, no breathing/scale pulse, no up-down bobbing)
  // - Reactions: one-time small jump (happy), short shake (angry), small droop (sad), then exit slide-out to right
  const stillVariants = {
    enter: {
      x: [360, 0],
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: [0, 1],
      transition: {
        x: { duration: 0.5, ease: 'easeOut' },
        opacity: { duration: 0.35, ease: 'easeOut' }
      }
    },
    asking: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    idle: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    happy: {
      x: 0,
      y: [0, -20, 0],
      scale: [1, 1.04, 1],
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 0.45,
        ease: 'easeInOut'
      }
    },
    angry: {
      x: [0, -7, 7, -6, 6, -3, 3, 0],
      y: 0,
      scale: 1,
      rotate: [0, -2, 2, -1.5, 1.5, 0],
      opacity: 1,
      transition: {
        duration: 0.45,
        ease: 'easeInOut'
      }
    },
    sad: {
      x: 0,
      y: [0, 8],
      scaleY: [1, 0.95],
      scaleX: [1, 1.02],
      rotate: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    },
    exit: {
      x: [0, 380],
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: [1, 0],
      transition: {
        duration: 0.5,
        ease: 'easeIn'
      }
    },
    drinking: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: { duration: 0.2 }
    },
    sleeping: {
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };

  const activeVariants = still ? stillVariants : motionVariants;

  return (
    <div className={`puppy-wrapper ${still ? 'still-wrapper' : ''}`}>
      {/* Floating Zzz particles for sleeping state (animated mode only) */}
      {!still && state === 'sleeping' && (
        <div className="floating-zzz-container">
          {[
            { text: 'Z', delay: 0, x: 20, size: 22 },
            { text: 'z', delay: 0.8, x: 38, size: 17 },
            { text: 'z', delay: 1.6, x: 54, size: 13 }
          ].map((item, idx) => (
            <motion.span
              key={idx}
              className="floating-z"
              style={{ fontSize: item.size }}
              initial={{ opacity: 0, y: 0, x: item.x, scale: 0.7 }}
              animate={{
                opacity: [0, 0.95, 0.8, 0],
                y: [-8, -35, -60, -90],
                x: [item.x, item.x + 8, item.x + 16, item.x + 24],
                scale: [0.7, 1, 1.15, 1.3]
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                delay: item.delay,
                ease: 'easeOut'
              }}
            >
              {item.text}
            </motion.span>
          ))}
        </div>
      )}

      {/* Main Animated Motion Container */}
      <motion.div
        className={`puppy-motion-container ${speaking ? 'speaking-pulse' : ''}`}
        variants={activeVariants}
        initial={false}
        animate={state}
      >
        {/* Sprite Stage with smooth image crossfading */}
        <div className={`puppy-sprite-stage ${still ? 'still-mode' : ''}`}>
          <AnimatePresence mode="sync">
            <motion.div
              key={spriteFileName}
              className="puppy-sprite-layer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <SpriteImage stateName={state} fileName={spriteFileName} still={still} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Soft ground contact shadow - animated mode only */}
      {!still && (
        <div
          className="puppy-ground-shadow"
          style={{
            transform: state === 'happy'
              ? 'scale(0.8)'
              : state === 'drinking'
              ? 'scaleX(1.1) translateY(4px)'
              : state === 'sad'
              ? 'scaleX(1.08)'
              : 'scale(1)',
            opacity: state === 'exit' || state === 'angry' ? 0.3 : 1
          }}
        />
      )}
    </div>
  );
}
