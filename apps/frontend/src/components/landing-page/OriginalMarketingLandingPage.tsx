'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Boxes, ClipboardCheck,
  HardDrive, Mail, Minus, Network, Plus, Server, ShieldCheck,
} from 'lucide-react';
import { MarketplaceRequestDialog } from './MarketplaceRequestDialog';
import './server-experiences.css';

type Product = {
  name: string;
  category: string;
  icon: typeof Server;
  description: string;
  details: { title: string; text: string }[];
};

// Temporary catalog copy is intentional. Pricing and specifications are confirmed by enquiry.
const products: Product[] = [
  { name: 'Product 1', category: 'Rack server', icon: Server,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean vitae nibh sed sapien posuere feugiat.',
    details: [
      { title: 'Compute', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Configuration', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Connectivity', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Availability', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ] },
  { name: 'Product 2', category: 'Network equipment', icon: Network,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ut massa vitae nisl cursus varius.',
    details: [
      { title: 'Ports', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Throughput', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Management', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Deployment', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ] },
  { name: 'Product 3', category: 'Storage system', icon: HardDrive,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce suscipit mauris non lorem tempor.',
    details: [
      { title: 'Storage', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Expansion', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Interface', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Support', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ] },
  { name: 'Product 4', category: 'Infrastructure bundle', icon: Boxes,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc ultricies velit et libero viverra.',
    details: [
      { title: 'Hardware', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Included items', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Setup', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Delivery', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ] },
];

function ProductInquiry({ product, onBuy, onSell }: {
  product: Product;
  onBuy: (condition: 'new' | 'refurbished', quantity: number) => void;
  onSell: () => void;
}) {
  const [condition, setCondition] = useState<'new' | 'refurbished'>('new');
  const [quantity, setQuantity] = useState(1);

  return (
    <aside className="exp-inquiry" aria-label="Product inquiry">
      <p className="exp-inquiry-label">Product inquiry</p>
      <h3>{product.name}</h3>
      <p className="exp-inquiry-category">{product.category}</p>
      <div className="exp-quote-panel">
        <small>Pricing</small>
        <strong>Request a quote</strong>
        <p>Product pricing and availability are confirmed on enquiry.</p>
      </div>
      <fieldset className="exp-fieldset">
        <legend>Preferred condition</legend>
        <div className="exp-choice-grid">
          {(['new', 'refurbished'] as const).map((option) => (
            <button key={option} type="button" className="exp-choice" aria-pressed={condition === option}
              onClick={() => setCondition(option)}>{option}</button>
          ))}
        </div>
      </fieldset>
      <div className="exp-quantity">
        <div><p className="exp-quantity-label">Quantity</p><small>Units requested</small></div>
        <div className="exp-stepper">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity === 1} aria-label="Decrease quantity"><Minus size={16} aria-hidden="true" /></button>
          <output aria-label="Quantity">{quantity}</output>
          <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            disabled={quantity === 99} aria-label="Increase quantity"><Plus size={16} aria-hidden="true" /></button>
        </div>
      </div>
      <button type="button" className="exp-button exp-button-primary" onClick={() => onBuy(condition, quantity)}>
        Request this product <ArrowUpRight size={17} aria-hidden="true" />
      </button>
      <p className="exp-inquiry-note">Your inquiry is saved for follow-up. No order or payment is placed on this page.</p>
      <div className="exp-sell-link">
        <strong>Have server equipment to sell?</strong>
        <button type="button" onClick={onSell}>Contact us to list a product <ArrowRight size={15} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

export function OriginalMarketingLandingPage({ campaignName = 'KERVOX Server Marketplace', variant = 'marketplace' }: {
  content: unknown;
  campaignName?: string;
  variant?: 'marketplace' | 'funnel';
}) {
  const isFunnel = variant === 'funnel';
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [requestMode, setRequestMode] = useState<'buy' | 'sell' | null>(null);
  const [requestProduct, setRequestProduct] = useState({
    name: products[0].name, category: products[0].category,
    condition: 'new' as 'new' | 'refurbished', quantity: 1,
  });
  const reducedMotion = useReducedMotion();
  const pageRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const product = products[selectedIndex];
  const ProductIcon = product.icon;
  const move = (offset: number) => setSelectedIndex((index) => (index + offset + products.length) % products.length);
  const openBuy = (condition: 'new' | 'refurbished', quantity: number) => {
    setRequestProduct({ name: product.name, category: product.category, condition, quantity });
    setRequestMode('buy');
  };
  const openSell = () => setRequestMode('sell');
  const reveal = reducedMotion ? undefined : { opacity: 0, y: 24 };

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    let frame = 0;
    let previousScrollY = window.scrollY;
    page.dataset.scrollDirection = 'down';
    const updateProgress = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const scheduleProgress = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY !== previousScrollY) {
        page.dataset.scrollDirection = currentScrollY < previousScrollY ? 'up' : 'down';
        previousScrollY = currentScrollY;
      }
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateProgress();
      });
    };
    updateProgress();
    window.addEventListener('scroll', scheduleProgress, { passive: true });
    window.addEventListener('resize', scheduleProgress);

    let observer: IntersectionObserver | undefined;
    if (!reducedMotion && typeof IntersectionObserver !== 'undefined') {
      const elements = Array.from(page.querySelectorAll<HTMLElement>('[data-scroll-reveal]'));
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          // Re-arm only once fully offscreen, so content never fades while it is being read.
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      }, { threshold: [0, 0.08] });
      elements.forEach((element) => {
        // Content already on screen must not disappear when hydration completes.
        const bounds = element.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight) {
          element.classList.add('is-visible');
        }
        observer?.observe(element);
      });
      page.classList.add('scroll-ready');
    }

    return () => {
      window.removeEventListener('scroll', scheduleProgress);
      window.removeEventListener('resize', scheduleProgress);
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      page.classList.remove('scroll-ready');
      delete page.dataset.scrollDirection;
    };
  }, [reducedMotion]);

  return (
    <main ref={pageRef} className={`kervox-experience ${isFunnel ? 'exp-funnel' : 'exp-marketplace'}`}>
      <div ref={progressRef} className="exp-scroll-progress" aria-hidden="true" />
      <header className="exp-header">
        <div className="exp-container exp-header-inner">
          <Link href="/" aria-label="KERVOX home" className="kervox-public-brand inline-flex items-center">
            <BrandLogo width={145} height={30} />
          </Link>
          <nav className="exp-header-nav" aria-label="KERVOX navigation">
            {isFunnel ? <span className="exp-header-tag">KER01 / Infrastructure campaign</span> : <a className="exp-header-link" href="#products">Explore collection</a>}
            {isFunnel ? (
              <a className="exp-button exp-button-primary" href="#products">Request a quote <ArrowUpRight size={16} aria-hidden="true" /></a>
            ) : (
              <button type="button" className="exp-button exp-button-quiet" onClick={openSell}>Sell a product <ArrowUpRight size={16} aria-hidden="true" /></button>
            )}
          </nav>
        </div>
      </header>

      {isFunnel ? (
        <section className="exp-hero exp-funnel-hero" aria-labelledby="hero-heading">
          <div className="exp-container exp-funnel-hero-inner">
            <motion.div className="exp-funnel-hero-copy" initial={reveal} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }}>
              <p className="exp-eyebrow">{campaignName} / Built for what&apos;s next</p>
              <h1 id="hero-heading" className="exp-display" style={{ marginTop: '1.6rem' }}>Build the infrastructure your <em>business depends on.</em></h1>
              <p className="exp-copy">Explore server hardware, network equipment, and infrastructure bundles. Tell us what you need and receive a tailored quote.</p>
              <div className="exp-hero-actions">
                <a href="#products" className="exp-button exp-button-primary">Request a quote <ArrowRight size={17} aria-hidden="true" /></a>
                <button type="button" className="exp-button exp-button-quiet" onClick={openSell}>Sell equipment <ArrowUpRight size={17} aria-hidden="true" /></button>
              </div>
              <a href="#products" className="exp-hero-note">Explore the collection <ArrowDown size={16} aria-hidden="true" /></a>
            </motion.div>
            <motion.div className="exp-funnel-art" initial={reducedMotion ? false : { opacity: 0, scale: .88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: .15 }} aria-hidden="true">
              <Image src="/kervox-server-rack.png" alt="" width={640} height={640} priority className="exp-funnel-rack" />
            </motion.div>
            <div className="exp-funnel-steps" aria-label="How this campaign works">
              <span><b>01</b> Explore equipment</span><span><b>02</b> Share requirements</span><span><b>03</b> Receive a quote</span>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="exp-hero exp-marketplace-hero" aria-labelledby="hero-heading">
            <div className="exp-container exp-marketplace-hero-inner">
              <motion.div className="exp-marketplace-hero-copy" initial={reveal} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }}>
                <p className="exp-eyebrow">{campaignName} / The collection</p>
                <h1 id="hero-heading" className="exp-display" style={{ marginTop: '1.6rem' }}>Server products for the work that matters.</h1>
                <p className="exp-copy">Explore server hardware, network equipment, and infrastructure products in one considered marketplace.</p>
                <div className="exp-hero-actions">
                  <a href="#products" className="exp-button exp-button-primary">Explore products <ArrowRight size={17} aria-hidden="true" /></a>
                  <button type="button" className="exp-button exp-button-quiet" onClick={openSell}>Sell equipment <ArrowUpRight size={17} aria-hidden="true" /></button>
                </div>
                <a href="#products" className="exp-hero-note">Browse the collection <ArrowDown size={16} aria-hidden="true" /></a>
              </motion.div>
              <div className="exp-marketplace-hero-art" role="img" aria-label="Server rack in a connected cloud infrastructure scene">
                <span className="exp-art-caption"><span aria-hidden="true" /> KERVOX / Infrastructure</span>
              </div>
            </div>
          </section>
          <div className="exp-editorial-strip" aria-label="Marketplace overview">
            <div className="exp-container exp-editorial-strip-inner">
              <div data-scroll-reveal><Server size={23} aria-hidden="true" /><span><strong>Server equipment</strong><small>Explore the current collection</small></span></div>
              <div data-scroll-reveal className="exp-reveal-delay-1"><ClipboardCheck size={23} aria-hidden="true" /><span><strong>Quote-led buying</strong><small>Discuss pricing and availability</small></span></div>
              <div data-scroll-reveal className="exp-reveal-delay-2"><Boxes size={23} aria-hidden="true" /><span><strong>Equipment listings</strong><small>Share hardware you want to sell</small></span></div>
            </div>
          </div>
        </>
      )}

      <section id="products" tabIndex={0} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      }} className="exp-products" aria-labelledby="products-heading">
        <div className="exp-container">
          <div className="exp-products-head" data-scroll-reveal>
            <div>
              <p className="exp-eyebrow">{isFunnel ? '01 / Find your equipment' : 'The collection / Featured products'}</p>
              <h2 id="products-heading" className="exp-section-title">{isFunnel ? 'Specify what you need.' : 'Explore our server products.'}</h2>
              <p className="exp-copy">Select a product to review its category and temporary details, then send us your requirements.</p>
            </div>
            <div className="exp-product-count" aria-live="polite" aria-atomic="true"><strong>{String(selectedIndex + 1).padStart(2, '0')}</strong><small>/ {String(products.length).padStart(2, '0')}</small></div>
          </div>
          <div className="exp-progress" aria-hidden="true" data-scroll-reveal><span style={{ width: `${((selectedIndex + 1) / products.length) * 100}%` }} /></div>
          <div className="exp-carousel" data-scroll-reveal>
            <button type="button" className="exp-carousel-arrow is-prev" onClick={() => move(-1)} aria-label="Previous product" aria-controls="marketplace-product-display"><ArrowLeft size={23} aria-hidden="true" /></button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div id="marketplace-product-display" key={product.name} className="exp-carousel-grid" aria-live="polite"
                initial={reducedMotion ? false : { opacity: 0, x: 35, filter: 'blur(7px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={reducedMotion ? undefined : { opacity: 0, x: -24, filter: 'blur(5px)', transition: { duration: .13 } }}
                transition={{ duration: reducedMotion ? 0 : .34, ease: [0.22, 1, 0.36, 1] }}>
                <article className="exp-product-panel">
                  <div className="exp-product-feature">
                    <div>
                      <span className="exp-product-icon"><ProductIcon size={24} aria-hidden="true" /></span>
                      <p className="exp-product-meta">{product.category}</p>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                    </div>
                    <div className="exp-product-visual"><Image src="/kervox-server-rack.png" alt="Server rack equipment" width={330} height={330} className="exp-product-rack" /></div>
                  </div>
                  <div className="exp-product-detail-grid">
                    {product.details.map((detail, index) => (
                      <div className="exp-product-detail" key={detail.title}>
                        <strong>0{index + 1} / {detail.title}</strong><p>{detail.text}</p>
                      </div>
                    ))}
                  </div>
                </article>
                <ProductInquiry product={product} onBuy={openBuy} onSell={openSell} />
              </motion.div>
            </AnimatePresence>
            <button type="button" className="exp-carousel-arrow is-next" onClick={() => move(1)} aria-label="Next product" aria-controls="marketplace-product-display"><ArrowRight size={23} aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      {isFunnel ? (
        <>
          <section className="exp-process" aria-labelledby="process-heading">
            <div className="exp-container">
              <div data-scroll-reveal><p className="exp-eyebrow">02 / What happens next</p>
                <h2 id="process-heading" className="exp-section-title">A clear path from enquiry to quote.</h2></div>
              <div className="exp-process-grid">
                {[
                  { icon: Mail, title: 'Submit an enquiry', text: 'Choose a product and tell us about your requirements.' },
                  { icon: ClipboardCheck, title: 'We review availability', text: 'The team reviews your request and confirms the relevant details.' },
                  { icon: ShieldCheck, title: 'Receive a tailored quote', text: 'We follow up with an offer based on the equipment and quantity you need.' },
                ].map(({ icon: Icon, title, text }, index) => (
                  <article key={title} className={`exp-process-step exp-reveal-delay-${index}`} data-scroll-reveal>
                    <span>0{index + 1}</span><Icon size={26} aria-hidden="true" /><h3>{title}</h3><p>{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
          <section className="exp-funnel-seller" aria-labelledby="sell-heading">
            <div className="exp-container exp-funnel-seller-inner" data-scroll-reveal>
              <div><p className="exp-eyebrow">03 / For sellers</p><h2 id="sell-heading">Have server equipment to sell?</h2><p>Tell us about your equipment. Your listing request will be saved for review.</p></div>
              <button type="button" className="exp-button exp-button-primary" onClick={openSell}>List your equipment <ArrowUpRight size={17} aria-hidden="true" /></button>
            </div>
          </section>
          <section className="exp-funnel-final" aria-labelledby="final-cta-heading">
            <div className="exp-container" data-scroll-reveal><p className="exp-eyebrow">Your next step</p><h2 id="final-cta-heading" className="exp-section-title">Find the right equipment for your work.</h2><p>Browse the collection and send a product enquiry when you are ready.</p><a href="#products" className="exp-button exp-button-primary">Request a quote <ArrowRight size={17} aria-hidden="true" /></a></div>
          </section>
        </>
      ) : (
        <section className="exp-story" aria-labelledby="marketplace-heading">
          <div className="exp-container">
            <div className="exp-story-head" data-scroll-reveal><div><p className="exp-eyebrow">Two ways to connect</p><h2 id="marketplace-heading" className="exp-section-title">A clearer place for infrastructure.</h2></div><p className="exp-copy">Whether you are sourcing equipment or have hardware to offer, start with a conversation tailored to your requirements.</p></div>
            <div className="exp-story-grid">
              <article className="exp-story-card" data-scroll-reveal>
                <ShieldCheck size={29} aria-hidden="true" /><small>For buyers</small><h3>Find equipment for the work ahead.</h3><p>Send a product enquiry and discuss availability and pricing with the team.</p>
              </article>
              <article className="exp-story-card is-seller exp-reveal-delay-1" data-scroll-reveal>
                <Boxes size={29} aria-hidden="true" /><small>For sellers</small><h3>Put your equipment in the conversation.</h3><p>Share the hardware you have available so the team can review it for listing.</p><button type="button" onClick={openSell}>List your equipment <ArrowUpRight size={16} aria-hidden="true" /></button>
              </article>
            </div>
          </div>
        </section>
      )}

      <footer className="exp-footer">
        <div className="exp-container exp-footer-inner"><div><strong>KERVOX</strong><p>Server products and connected infrastructure, brought together.</p></div><div><a href="mailto:info@kervox.cloud">info@kervox.cloud</a><p>© {new Date().getFullYear()} KERVOX</p></div></div>
      </footer>
      <MarketplaceRequestDialog mode={requestMode} product={requestProduct} onClose={() => setRequestMode(null)} />
    </main>
  );
}
