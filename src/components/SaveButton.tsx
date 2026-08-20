import React, { useState, useEffect, CSSProperties, ReactNode } from 'react';

interface SaveButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  triggerSave?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const SaveButton = ({ onClick, disabled = false, triggerSave = false, type = "button", children, style: customStyle, className = "" }: SaveButtonProps) => {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (triggerSave) {
      setIsSaved(true);
      const timer = setTimeout(() => setIsSaved(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [triggerSave]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
  };

  const style: CSSProperties = {
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
