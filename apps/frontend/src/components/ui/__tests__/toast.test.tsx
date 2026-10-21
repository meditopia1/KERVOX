import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '../toast';

function ToastTrigger() {
  const { addToast } = useToast();

  return (
    <button type="button" onClick={() => addToast({ title: 'Saved', description: 'Your changes are ready.', type: 'success' })}>
      Show notification
    </button>
  );
}

describe('shared toast feedback', () => {
  it('announces and dismisses a notification', () => {
    render(<ToastProvider><ToastTrigger /></ToastProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Show notification' }));
    expect(screen.getByRole('status').textContent).toContain('Your changes are ready.');

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
