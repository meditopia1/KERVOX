export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#2b2926]">
      <section className="premium-hero relative isolate flex min-h-screen flex-col overflow-hidden bg-[#f5f1e9]">
        <div className="absolute inset-0 -z-10">
          <img src="/kervox-server-hero.png" alt="" fetchPriority="high" className="h-full w-full object-cover object-[68%_center] lg:-translate-y-[7%] lg:scale-[1.16] lg:object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f5f0] via-[#f7f5f0]/95 to-[#f7f5f0]/20 md:bg-[linear-gradient(90deg,rgba(247,245,240,0.99)_0%,rgba(247,245,240,0.95)_35%,rgba(247,245,240,0)_66%)]" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
          <img src="/kervox-logo.svg" alt="KERVOX" width="162" height="33" className="h-[33px] w-auto" />
          <a href="/login" className="rounded-full bg-[#a64c34] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#873b29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64c34]">Log-in</a>
        </header>

        <div className="flex flex-1 items-center px-6 pb-24 pt-16 sm:px-10 lg:px-[5.7%] lg:pb-32">
          <div className="w-full max-w-[900px]">
            <p className="mb-8 text-xs font-bold uppercase tracking-[0.2em] text-[#99442f] sm:text-sm md:text-base">The connected server for your business</p>
            <h1 className="max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-[#2b2926] sm:text-5xl lg:text-[clamp(3rem,3.25vw,4rem)]">
              Welcome to KERVOX.<br />
              <span className="text-[#a64c34]">Your operations, connected.</span>
            </h1>
            <p className="mt-7 max-w-[720px] text-lg leading-relaxed text-[#625d56] sm:text-xl lg:text-2xl">
              A central workspace for your teams, workflows and customer operations.
            </p>
            <p className="mt-8 text-lg font-semibold text-[#873b29] sm:text-xl">One server. One connected workspace.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
