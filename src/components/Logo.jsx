import React from 'react';

const Logo = ({ size = 24, className = '', style, light = false }) => {
  return (
    <img 
      src="/logo.png" 
      alt="BaseOps Logo"
      width={size * 3} // Aspect ratio adjustment
      style={{ 
        height: size, 
        objectFit: 'contain', 
        filter: light ? 'brightness(0) invert(1)' : 'none',
        ...style 
      }} 
      className={className} 
    />
  );
};

export default Logo;
