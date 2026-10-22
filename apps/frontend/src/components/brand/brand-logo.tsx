type BrandLogoProps = {
  mark?: 'wordmark' | 'monogram';
  width?: number;
  height?: number;
  alt?: string;
  decorative?: boolean;
  className?: string;
};

/** The selected SVG follows the theme attribute set before the page paints. */
export function BrandLogo({
  mark = 'wordmark',
  width = mark === 'wordmark' ? 157 : 28,
  height = mark === 'wordmark' ? 32 : 28,
  alt = 'KERVOX',
  decorative = false,
  className = '',
}: BrandLogoProps) {
  return (
    <span
      data-kervox-brand={mark}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative || undefined}
      className={`kervox-brand-logo ${className}`.trim()}
      style={{ width, height }}
    />
  );
}
