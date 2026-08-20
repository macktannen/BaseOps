import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SaveButton from '../SaveButton';

describe('SaveButton', () => {
  it('renders default label', () => {
    render(<SaveButton />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('renders custom children label', () => {
    render(<SaveButton>Save Flight</SaveButton>);
    expect(screen.getByText('Save Flight')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SaveButton onClick={onClick}>Save</SaveButton>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<SaveButton disabled={true}>Save</SaveButton>);
    expect(screen.getByText('Save').closest('button')).toBeDisabled();
  });
});
