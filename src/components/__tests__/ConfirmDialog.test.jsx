import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog isOpen={true} title="Delete Flight" message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByText('Delete Flight')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog isOpen={true} title="T" message="M" onConfirm={onConfirm} onCancel={() => {}} />
    );
    fireEvent.click(screen.getByText('OK'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog isOpen={true} title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom button labels', () => {
    render(
      <ConfirmDialog isOpen={true} title="T" message="M" onConfirm={() => {}} onCancel={() => {}} confirmText="Yes, delete" cancelText="Back" />
    );
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('applies danger class when danger is true', () => {
    render(
      <ConfirmDialog isOpen={true} title="T" message="M" onConfirm={() => {}} onCancel={() => {}} danger={true} confirmText="Delete" />
    );
    expect(screen.getByText('Delete').className).toContain('btn-danger');
  });
});
