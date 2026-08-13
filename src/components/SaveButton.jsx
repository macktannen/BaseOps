import React, { useState, useEffect } from 'react';

/**
 * Reusable save button with brief success animation.
 * Props:
 *   onClick: optional click handler (e.g., for non-form buttons)
 *   disabled: boolean to disable the button
 *   triggerSave: boolean indicating a recent successful save (triggers animation)
 *   children: button label
 */
const SaveButton = ({ onClick, disabled, triggerSave, type = "button", children, style: customStyle, className = "" }) => {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (triggerSave) {
      setIsSaved(true);
      const timer = setTimeout(() => setIsSaved(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [triggerSave]);

  const handleClick = (e) => {
    if (onClick) onClick(e);
  };

  const style = {
    opacity: disabled ? 0.6 : 1,
    backgroundColor: isSaved ? '#48bb78' : undefined,
    transition: 'all 0.3s ease',
    transform: isSaved ? 'scale(1.05)' : 'scale(1)',
    ...customStyle,
  };

  return (
    <button
      type={type}
      className={`btn btn-primary ${className}`}
      disabled={disabled}
      onClick={handleClick}
      style={style}
    >
      {isSaved ? '✓ Saved!' : (children || 'Save')}
    </button>
  );
};

export default SaveButton;
