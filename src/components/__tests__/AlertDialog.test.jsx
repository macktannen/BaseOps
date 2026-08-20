import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlertDialog from '../AlertDialog';

describe('AlertDialog', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <AlertDialog isOpen={false} title="T" message="M" onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open', () => {
    render(
      <AlertDialog isOpen={true} title="Error" message="Something broke" onClose={() => {}} />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('calls onClose when OK clicked', () => {
    const onClose = vi.fn();
    render(
      <AlertDialog isOpen={true} title="T" message="M" onClose={onClose} />
    );
    fireEvent.click(screen.getByText('OK'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <AlertDialog isOpen={true} title="T" message="M" onClose={onClose} />
    );
    const closeButtons = container.querySelectorAll('button');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
