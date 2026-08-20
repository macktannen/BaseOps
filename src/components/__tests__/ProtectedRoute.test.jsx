import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../ProtectedRoute';

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="navigate">navigate:{to}</div>,
}));

vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => ({ currentUser: null, isAdmin: false }),
}));

describe('ProtectedRoute', () => {
  it('redirects to /login when no user', () => {
    render(<ProtectedRoute><div>Secret Content</div></ProtectedRoute>);
    expect(screen.getByTestId('navigate')).toHaveTextContent('navigate:/login');
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });
});
