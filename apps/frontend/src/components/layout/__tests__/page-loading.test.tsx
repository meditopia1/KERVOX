import { render, screen } from '@testing-library/react';
import { InlinePageLoading, LoadingPanel, PageLoading } from '../page-loading';

describe('workspace loading states', () => {
  it('announces full-page loading without suggesting fabricated progress', () => {
    const { container } = render(<PageLoading message="Opening the dashboard..." />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Opening the dashboard...')).toBeVisible();
    expect(container.querySelector('[data-kervox-brand="wordmark"]')).toBeInTheDocument();
    expect(container.querySelector('.kv-loading-track')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it('keeps an in-page wait to one accessible status region', () => {
    render(<InlinePageLoading title="Claims queue" message="Loading claims..." />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Claims queue' })).toBeVisible();
    expect(screen.getByText('Loading claims...')).toBeVisible();
  });

  it('provides a compact status for data panels', () => {
    render(<LoadingPanel message="Searching members..." />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Searching members...')).toBeVisible();
  });
});
