'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  HardDrive,
  Mail,
  Minus,
  Network,
  Plus,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { MarketplaceRequestDialog } from './MarketplaceRequestDialog';

type Product = {
  name: string;
  category: string;
  icon: typeof Server;
  description: string;
  details: { title: string; text: string }[];
};

const products: Product[] = [
  {
    name: 'Product 1',
    category: 'Rack server',
    icon: Server,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean vitae nibh sed sapien posuere feugiat.',
    details: [
      { title: 'Compute', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Configuration', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Connectivity', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Availability', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ],
  },
  {
    name: 'Product 2',
    category: 'Network equipment',
    icon: Network,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ut massa vitae nisl cursus varius.',
    details: [
      { title: 'Ports', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Throughput', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Management', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Deployment', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ],
  },
  {
    name: 'Product 3',
    category: 'Storage system',
    icon: HardDrive,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce suscipit mauris non lorem tempor.',
    details: [
      { title: 'Storage', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Expansion', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Interface', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Support', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ],
  },
  {
    name: 'Product 4',
    category: 'Infrastructure bundle',
    icon: Boxes,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc ultricies velit et libero viverra.',
    details: [
      { title: 'Hardware', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
      { title: 'Included items', text: 'Sed do eiusmod tempor incididunt ut labore et dolore.' },
      { title: 'Setup', text: 'Ut enim ad minim veniam, quis nostrud exercitation.' },
      { title: 'Delivery', text: 'Duis aute irure dolor in reprehenderit in voluptate.' },
    ],
  },
];

function ProductInquiry({ product, onBuy, onSell }: { product: Product; onBuy: (condition: 'new' | 'refurbished', quantity: number) => void; onSell: () => void }) {
  const [condition, setCondition] = useState<'new' | 'refurbished'>('new');
  const [quantity, setQuantity] = useState(1);

  return (
    <aside className="rounded-2xl border border-[#dfd3c5] bg-[#fffefa] p-5 shadow-[0_18px_48px_rgba(49,37,28,0.09)] sm:p-7" aria-label="Product inquiry">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a64c34]">Product inquiry</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#2b2926]">{product.name}</h3>
      <p className="mt-1 text-sm text-[#6d675f]">{product.category}</p>
      <div className="mt-6 rounded-xl border border-[#e9dfd3] bg-[#f9f6f0] px-4 py-4">
        <p className="text-xs font-medium text-[#81796e]">Pricing</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-[#2b2926]">Request a quote</p>
        <p className="mt-1 text-xs leading-5 text-[#81796e]">Product pricing and availability are confirmed on enquiry.</p>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-[#39352f]">Preferred condition</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['new', 'refurbished'] as const).map((option) => (
            <button key={option} type="button" aria-pressed={condition === option} onClick={() => setCondition(option)}
              className={`min-h-11 rounded-lg border px-3 text-sm font-medium capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34] ${condition === option ? 'border-[#a64c34] bg-[#f6e7de] text-[#873b29]' : 'border-[#ded4ca] bg-[#fffefa] text-[#554d45] hover:bg-[#f7f2eb]'}`}>
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#39352f]">Quantity</p>
          <p className="text-xs text-[#81796e]">Units requested</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[#ded4ca] bg-[#fffefa] p-1">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1}
            aria-label="Decrease quantity" className="flex h-8 w-8 items-center justify-center rounded-md text-[#554d45] hover:bg-[#f3eee6] disabled:cursor-not-allowed disabled:opacity-40">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <output aria-label="Quantity" className="min-w-5 text-center text-sm font-semibold tabular-nums">{quantity}</output>
          <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} disabled={quantity === 99}
            aria-label="Increase quantity" className="flex h-8 w-8 items-center justify-center rounded-md text-[#554d45] hover:bg-[#f3eee6] disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button type="button" onClick={() => onBuy(condition, quantity)} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a64c34] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(166,76,52,0.17)] transition-all hover:-translate-y-0.5 hover:bg-[#873b29] hover:shadow-[0_14px_28px_rgba(166,76,52,0.23)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34] motion-reduce:transform-none">
        Request this product <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[#81796e]">Your inquiry is saved for follow-up. No order or payment is placed on this page.</p>
      <div className="mt-5 border-t border-[#eee7dd] pt-5">
        <p className="text-sm font-semibold text-[#39352f]">Have server equipment to sell?</p>
        <button type="button" onClick={onSell} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#873b29] underline-offset-4 hover:underline">Contact us to list a product <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

export function OriginalMarketingLandingPage(_props: { content: unknown }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [requestMode, setRequestMode] = useState<'buy' | 'sell' | null>(null);
  const [requestProduct, setRequestProduct] = useState<{ name: string; category: string; condition: 'new' | 'refurbished'; quantity: number }>({ name: products[0].name, category: products[0].category, condition: 'new', quantity: 1 });
  const reducedMotion = useReducedMotion();
  const product = products[selectedIndex];
  const ProductIcon = product.icon;
  const move = (offset: number) => setSelectedIndex((index) => (index + offset + products.length) % products.length);
  const openBuy = (condition: 'new' | 'refurbished', quantity: number) => {
    setRequestProduct({ name: product.name, category: product.category, condition, quantity });
    setRequestMode('buy');
  };
  const openSell = () => setRequestMode('sell');

  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#2b2926]">
      <header className="sticky top-0 z-30 border-b border-[#e6e0d7] bg-[#fffefa]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="KERVOX home" className="inline-flex items-center">
            <Image src="/kervox-logo.svg" alt="KERVOX" width={145} height={30} className="h-[30px] w-auto" />
          </Link>
          <nav aria-label="Marketplace navigation" className="flex items-center gap-3 sm:gap-6">
            <a href="#products" className="hidden text-sm font-medium text-[#554d45] hover:text-[#873b29] sm:inline">Explore products</a>
            <button type="button" onClick={openSell} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d8cec2] bg-[#fffefa] px-4 text-sm font-semibold text-[#39352f] transition-colors hover:bg-[#f4eee6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">
              Sell a product <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-[#e6e0d7]">
        <div className="absolute inset-0 -z-10 bg-[#f7f5f0] sm:hidden" style={{ backgroundImage: "url('/kervox-server-hero.png')", backgroundRepeat: 'no-repeat', backgroundSize: 'auto 76%', backgroundPosition: 'right -200px bottom -105px' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 hidden bg-[#f7f5f0] sm:block lg:hidden" style={{ backgroundImage: "url('/kervox-server-hero.png')", backgroundRepeat: 'no-repeat', backgroundSize: 'auto 76%', backgroundPosition: 'right -135px bottom -105px' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 hidden bg-[#f7f5f0] lg:block xl:hidden" style={{ backgroundImage: "url('/kervox-server-hero.png')", backgroundRepeat: 'no-repeat', backgroundSize: 'auto 160%', backgroundPosition: 'right -300px bottom -125px' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 hidden bg-[#f7f5f0] xl:block 2xl:hidden" style={{ backgroundImage: "url('/kervox-server-hero.png')", backgroundRepeat: 'no-repeat', backgroundSize: 'auto 160%', backgroundPosition: 'right -150px bottom -125px' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 hidden bg-[#f7f5f0] 2xl:block" style={{ backgroundImage: "url('/kervox-server-hero.png')", backgroundRepeat: 'no-repeat', backgroundSize: 'auto 160%', backgroundPosition: 'right -100px bottom -125px' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 lg:hidden" style={{ background: 'linear-gradient(180deg, #f7f5f0 0%, rgba(247,245,240,.98) 50%, transparent 68%)' }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 hidden lg:block" style={{ background: 'linear-gradient(90deg, #f7f5f0 0%, rgba(247,245,240,.96) 35%, rgba(247,245,240,.25) 53%, transparent 64%)' }} aria-hidden="true" />
        <motion.div aria-hidden="true" className="pointer-events-none absolute -right-20 top-16 -z-10 h-96 w-96 rounded-full bg-[#d9a185]/20 blur-[100px]" animate={reducedMotion ? undefined : { scale: [1, 1.28, 1], opacity: [.3, .6, .3] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="mx-auto flex min-h-[850px] max-w-7xl items-start px-5 pb-[320px] pt-20 sm:min-h-[720px] sm:px-8 sm:pb-[280px] lg:min-h-[590px] lg:items-center lg:py-24">
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }} className="max-w-[640px]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a64c34]">KERVOX Server Marketplace</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.07] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Server products for the work that matters.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5e5750]">Explore server hardware, network equipment, and infrastructure products in one considered marketplace.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#products" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#a64c34] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(166,76,52,0.16)] transition-colors hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">
                Explore products <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button type="button" onClick={openSell} className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#d8cec2] bg-[#fffefa]/90 px-5 text-sm font-semibold text-[#39352f] transition-colors hover:bg-[#fffefa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">
                Sell equipment <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <a href="#products" className="mt-12 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6d675f] hover:text-[#873b29]">
              Browse the collection <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </motion.div>
        </div>
      </section>

      <section id="products" tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowLeft') move(-1); if (event.key === 'ArrowRight') move(1); }} className="scroll-mt-20 px-5 py-16 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a64c34] sm:px-8 lg:py-24" aria-labelledby="products-heading">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a64c34]">The collection</p>
            <h2 id="products-heading" className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Explore our server products.</h2>
            <p className="mt-4 text-base leading-7 text-[#6d675f]">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Select a product to review its details and enquire.</p>
          </div>

          <div className="mt-9 flex items-center justify-between border-t border-[#dfd3c5] pt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a64c34]">
            <span>Featured collection</span>
            <span aria-live="polite" aria-atomic="true" className="tabular-nums text-[#6d675f]">{String(selectedIndex + 1).padStart(2, '0')} <span className="text-[#b5a89b]">/</span> {String(products.length).padStart(2, '0')}</span>
          </div>

          <div className="relative mt-6">
            <button type="button" onClick={() => move(-1)} aria-label="Previous product" aria-controls="marketplace-product-display" className="absolute left-0 top-[375px] z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfbbaa] bg-[#fffefa]/95 text-[#873b29] shadow-[0_12px_32px_rgba(45,30,20,.18),inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-[#a64c34] hover:bg-[#a64c34] hover:text-white hover:shadow-[0_18px_38px_rgba(118,61,40,.28)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a64c34] motion-reduce:transition-none sm:-left-7 sm:top-[240px] lg:top-1/2 2xl:-left-16"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button>
          <AnimatePresence mode="wait" initial={false}>
          <motion.div id="marketplace-product-display" key={product.name} initial={reducedMotion ? false : { opacity: 0, x: 38, filter: 'blur(8px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={reducedMotion ? undefined : { opacity: 0, x: -24, filter: 'blur(6px)', transition: { duration: .12 } }} transition={{ duration: reducedMotion ? 0 : .26, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]" aria-live="polite">
            <div className="self-start overflow-hidden rounded-2xl border border-[#e3d9ce] bg-[#fffefa] shadow-[0_12px_36px_rgba(49,37,28,0.045)]">
              <div className="grid items-center gap-6 border-b border-[#ebe3d9] bg-[radial-gradient(circle_at_75%_20%,#f5dfca,transparent_52%),#faf6f0] px-6 py-8 sm:px-9 md:grid-cols-[1fr_.8fr]">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#e8d3c2] bg-[#fffefa] text-[#a64c34]"><ProductIcon className="h-6 w-6" aria-hidden="true" /></span>
                  <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#a64c34]">{product.category}</p>
                  <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{product.name}</h3>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-[#6d675f]">{product.description}</p>
                </div>
                <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-xl border border-[#eadfd2] bg-[radial-gradient(circle_at_50%_100%,#edc9b5,transparent_60%),#f9f6ef] p-4">
                  <div className="absolute inset-x-8 bottom-5 h-4 rounded-full bg-[#6f3c2b]/15 blur-lg" aria-hidden="true" />
                  <motion.div animate={reducedMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                    <Image src="/kervox-server-rack.png" alt="Server rack equipment" width={260} height={260} className="relative h-52 w-auto object-contain drop-shadow-[0_20px_18px_rgba(49,37,28,.22)]" />
                  </motion.div>
                </div>
              </div>
              <div className="grid gap-px bg-[#eee7dd] sm:grid-cols-2">
                {product.details.map((detail, index) => (
                  <div key={detail.title} className="bg-[#fffefa] p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#a64c34]">0{index + 1} / {detail.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#6d675f]">{detail.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <ProductInquiry product={product} onBuy={openBuy} onSell={openSell} />
          </motion.div>
          </AnimatePresence>
            <button type="button" onClick={() => move(1)} aria-label="Next product" aria-controls="marketplace-product-display" className="absolute right-0 top-[375px] z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border border-[#cfbbaa] bg-[#fffefa]/95 text-[#873b29] shadow-[0_12px_32px_rgba(45,30,20,.18),inset_0_1px_0_rgba(255,255,255,.9)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-[#a64c34] hover:bg-[#a64c34] hover:text-white hover:shadow-[0_18px_38px_rgba(118,61,40,.28)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a64c34] motion-reduce:transition-none sm:-right-7 sm:top-[240px] lg:top-1/2 2xl:-right-16"><ArrowRight className="h-5 w-5" aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e6e0d7] bg-[#fffefa] px-5 py-16 sm:px-8" aria-labelledby="marketplace-heading">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[.85fr_1.15fr] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a64c34]">Buy and sell</p>
            <h2 id="marketplace-heading" className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">A clearer place for infrastructure.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#e6e0d7] bg-[#f9f6f0] p-5">
              <ShieldCheck className="h-6 w-6 text-[#a64c34]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">For buyers</h3>
              <p className="mt-2 text-sm leading-6 text-[#6d675f]">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae sem vel erat.</p>
            </div>
            <div className="rounded-xl border border-[#e6e0d7] bg-[#f9f6f0] p-5">
              <Mail className="h-6 w-6 text-[#a64c34]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">For sellers</h3>
              <p className="mt-2 text-sm leading-6 text-[#6d675f]">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus id nibh at augue.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#2b2926] px-5 py-10 text-[#e4dbd1] sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-bold tracking-[0.2em] text-white">KERVOX</p>
            <p className="mt-2 max-w-md text-sm leading-6">Server products and connected infrastructure, brought together.</p>
          </div>
          <div className="text-sm">
            <a href="mailto:info@kervox.cloud" className="font-medium text-white underline-offset-4 hover:underline">info@kervox.cloud</a>
            <p className="mt-2 text-[#bdb1a5]">© {new Date().getFullYear()} KERVOX</p>
          </div>
        </div>
      </footer>
      <MarketplaceRequestDialog mode={requestMode} product={requestProduct} onClose={() => setRequestMode(null)} />
    </main>
  );
}
