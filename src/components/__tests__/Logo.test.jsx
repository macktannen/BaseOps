import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Logo from '../Logo';

describe('Logo', () => {
  it('renders full logo by default', () => {
    render(<Logo size={28} />);
    const img = screen.getByAltText('BaseOps Logo');
    expect(img).toHaveAttribute('src', '/logo.png');
  });

  it('renders light variant', () => {
    render(<Logo size={28} light={true} />);
    const img = screen.getByAltText('BaseOps Logo');
    expect(img).toHaveAttribute('src', '/logo-white.png');
  });

  it('renders icon-only mark', () => {
    render(<Logo size={28} iconOnly={true} />);
    const img = screen.getByAltText('BaseOps Logo');
    expect(img).toHaveAttribute('src', '/logo-mark.png');
  });

  it('renders light icon-only mark', () => {
    render(<Logo size={28} light={true} iconOnly={true} />);
    const img = screen.getByAltText('BaseOps Logo');
    expect(img).toHaveAttribute('src', '/logo-mark-white.png');
  });
});
