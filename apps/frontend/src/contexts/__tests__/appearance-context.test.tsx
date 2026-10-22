import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeSelector } from '@/components/settings/theme-selector';
import { APPEARANCE_STORAGE_KEY, AppearanceProvider } from '../appearance-context';

afterEach(() => {
  window.localStorage.removeItem(APPEARANCE_STORAGE_KEY);
  delete document.documentElement.dataset.kervoxTheme;
});

it('applies the selected theme and restores it after the settings view remounts', () => {
  const first = render(<AppearanceProvider><ThemeSelector /></AppearanceProvider>);

  expect((screen.getByRole('radio', { name: /KERVOX Signature/ }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: /Black/ }));
  expect(document.documentElement.dataset.kervoxTheme).toBe('black');
  expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('black');

  first.unmount();
  render(<AppearanceProvider><ThemeSelector /></AppearanceProvider>);
  expect((screen.getByRole('radio', { name: /Black/ }) as HTMLInputElement).checked).toBe(true);
});

it.each([
  ['Blue', 'blue'],
  ['Red', 'red'],
  ['KERVOX Signature', 'claude'],
])('applies the %s palette immediately', (label, value) => {
  render(<AppearanceProvider><ThemeSelector /></AppearanceProvider>);

  if (value === 'claude') fireEvent.click(screen.getByRole('radio', { name: /^Black/ }));
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${label}`) }));

  expect(document.documentElement.dataset.kervoxTheme).toBe(value);
  expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe(value);
});

it('migrates a previously saved Green preference to Red', () => {
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, 'green');

  render(<AppearanceProvider><ThemeSelector /></AppearanceProvider>);

  expect((screen.getByRole('radio', { name: /^Red/ }) as HTMLInputElement).checked).toBe(true);
  expect(document.documentElement.dataset.kervoxTheme).toBe('red');
  expect(window.localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBe('red');
});
