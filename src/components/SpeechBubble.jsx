import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './SpeechBubble.css';

/**
 * SpeechBubble Component
 *
 * Props:
 * - text: string - The message to be displayed
 * - buttons: Array<{ label: string, onClick?: () => void, variant?: 'primary' | 'secondary' }> - Optional action buttons
 * - speed: number - Typing speed in ms (default: 24ms per character)
 * - onButtonClick: (btn: any, index: number) => void - Optional callback when button clicked
 */
export default function SpeechBubble({
  text = '',
  buttons = [],
  speed = 24,
  onButtonClick
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Typewriter effect triggered whenever text changes
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex++;
      setDisplayedText(text.slice(0, currentIndex));

      if (currentIndex >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  const handleBtnClick = (btn, index) => {
    if (btn.onClick) {
      btn.onClick();
    }
    if (onButtonClick) {
      onButtonClick(btn, index);
    }
  };

  return (
    <motion.div
      className="speech-bubble-wrapper"
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="speech-bubble-container">
        <div className="speech-bubble-content">
          <div className="speech-bubble-text">
            <span>{displayedText}</span>
            {isTyping && <span className="typing-cursor">|</span>}
          </div>

          {/* Optional Action Buttons */}
          <AnimatePresence>
            {buttons && buttons.length > 0 && (
              <motion.div
                className="speech-bubble-buttons"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {buttons.map((btn, index) => {
                  const label = typeof btn === 'string' ? btn : btn.label;
                  const variant = typeof btn === 'object' && btn.variant ? btn.variant : (index === 0 ? 'primary' : 'secondary');

                  return (
                    <motion.button
                      key={index}
                      type="button"
                      className={`bubble-btn ${variant}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBtnClick(btn, index)}
                    >
                      {label}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Small tail pointing towards the dog */}
        <div className="speech-bubble-tail" />
      </div>
    </motion.div>
  );
}
