import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobileDropdownMenu from '../MobileDropdownMenu';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('MobileDropdownMenu', () => {
  it('shows selected label', () => {
    render(<MobileDropdownMenu value="b" options={options} onChange={() => {}} />);
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('shows placeholder when no value', () => {
    render(<MobileDropdownMenu value="" options={options} onChange={() => {}} placeholder="Pick one" />);
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('opens menu on click and calls onChange on selection', () => {
    const onChange = vi.fn();
    render(<MobileDropdownMenu value="a" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Option C'));
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('does not open when disabled', () => {
    render(<MobileDropdownMenu value="a" options={options} onChange={() => {}} disabled={true} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Option B')).not.toBeInTheDocument();
  });
});
