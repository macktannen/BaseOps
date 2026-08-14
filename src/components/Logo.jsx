import React from 'react';

const Logo = ({ size = 28, className = '', style = {}, light = false, iconOnly = false }) => {
  const src = iconOnly 
    ? (light ? '/logo-mark-white.png' : '/logo-mark.png')
    : (light ? '/logo-white.png' : '/logo.png');

  // Aspect ratio is 855 / 296 ≈ 2.89 for full logo, 1.0 for icon
  const width = iconOnly ? size : Math.round(size * 2.89);

  return (
    <img 
      src={src} 
      alt="BaseOps Logo"
      width={width}
      height={size}
      style={{ 
        height: size, 
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain', 
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style 
      }} 
      className={className} 
    />
  );
};

export default Logo;
