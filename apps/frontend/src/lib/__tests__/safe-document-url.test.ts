import { openSafeDocumentUrl } from '../safe-document-url';

describe('openSafeDocumentUrl', () => {
  const originalOpen = window.open;

  afterEach(() => {
    window.open = originalOpen;
  });

  it('isolates a web document from the application window', () => {
    const open = jest.fn();
    window.open = open;
    expect(openSafeDocumentUrl('https://files.example.com/document.pdf')).toBe(true);
    expect(open).toHaveBeenCalledWith(
      'https://files.example.com/document.pdf', '_blank', 'noopener,noreferrer'
    );
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'not-a-url'])(
    'rejects an unsafe document URL: %s', (url) => {
      const open = jest.fn();
      window.open = open;
      expect(openSafeDocumentUrl(url)).toBe(false);
      expect(open).not.toHaveBeenCalled();
    }
  );
});
