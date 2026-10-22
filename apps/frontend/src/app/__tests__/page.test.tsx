import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('KERVOX home page', () => {
  it('shows connected-operations messaging without legacy health marketing', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /Welcome to KERVOX/ })).toBeTruthy();
    expect(screen.getByText('Your operations, connected.')).toBeTruthy();
    expect(screen.getByText('One server. One connected workspace.')).toBeTruthy();
    expect(screen.queryByText(/medical coverage|Day1Main|health insurance/i)).toBeNull();
  });

  it('provides a working sign-in destination', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: 'Log-in' }).getAttribute('href')).toBe('/login');
  });

  it('keeps the server hero decorative while preserving readable text', () => {
    const { container } = render(<Home />);
    const hero = container.querySelector('img[src="/kervox-server-hero.png"]');
    expect(hero?.getAttribute('alt')).toBe('');
    expect(screen.getByText(/A central workspace for your teams/)).toBeTruthy();
  });
});
