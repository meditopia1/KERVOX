import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OriginalMarketingLandingPage } from '../OriginalMarketingLandingPage';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: React.ComponentProps<'img'>) => <img src={src} alt={alt} {...props} />,
}));

describe('server marketplace landing page', () => {
  it('replaces health plans with server products and warm product details', () => {
    render(<OriginalMarketingLandingPage content={{ sections: [{ type: 'plan-slider' }] }} />);

    expect(screen.getByRole('heading', { name: 'Server products for the work that matters.' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Explore our server products.' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: 'Product inquiry' }).textContent).toContain('Product 1');
    expect(screen.queryByRole('group', { name: 'Choose a product' })).toBeNull();
    expect(screen.getAllByText(/Lorem ipsum dolor sit amet/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Hospital Cover|Coverage Type|Summer Health|Day1 covered/i)).toBeNull();
  });

  it('cycles products with the arrows and keeps the selected product in sync', async () => {
    render(<OriginalMarketingLandingPage content={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Previous product' }));
    await waitFor(() => expect(screen.getByRole('complementary', { name: 'Product inquiry' }).textContent).toContain('Product 4'));
    fireEvent.click(screen.getByRole('button', { name: 'Next product' }));
    await waitFor(() => expect(screen.getByRole('complementary', { name: 'Product inquiry' }).textContent).toContain('Product 1'));
    fireEvent.click(screen.getByRole('button', { name: 'Next product' }));
    await waitFor(() => expect(screen.getByRole('complementary', { name: 'Product inquiry' }).textContent).toContain('Product 2'));
  });

  it('opens a saved buyer inquiry with the chosen condition and quantity', async () => {
    render(<OriginalMarketingLandingPage content={{}} />);
    fireEvent.click(screen.getByRole('button', { name: /refurbished/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase quantity' }));
    fireEvent.click(screen.getByRole('button', { name: /Request this product/ }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('dialog').textContent).toContain('Product 1 · Rack server · refurbished · 2 units');
    expect(screen.getByText(/No order or payment is placed on this page/)).toBeTruthy();
  });

  it('submits a seller listing and confirms the saved reference', async () => {
    const originalFetch = global.fetch;
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'saved-request-id' }) });
    global.fetch = mockFetch as typeof fetch;
    try {
      render(<OriginalMarketingLandingPage content={{}} />);
      fireEvent.click(screen.getByRole('button', { name: /Sell a product/ }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), { target: { value: 'Alex Rivera' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'Work email' }), { target: { value: 'alex@example.com' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'Equipment name' }), { target: { value: 'Rack server R740' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'Category' }), { target: { value: 'Rack server' } });
      fireEvent.click(screen.getByRole('button', { name: /Submit listing request/ }));
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({ requestType: 'sell', productName: 'Rack server R740' });
      expect(await screen.findByText(/saved-request-id/)).toBeTruthy();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
