import { CSSProperties } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  light?: boolean;
  iconOnly?: boolean;
}

const Logo = ({ size = 28, className = '', style = {}, light = false, iconOnly = false }: LogoProps) => {
  const src = iconOnly 
    ? (light ? '/logo-mark-white.png' : '/logo-mark.png')
    : (light ? '/logo-white.png' : '/logo.png');

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
