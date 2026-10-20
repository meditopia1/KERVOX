export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#e9f4ff]">
        <div className="absolute inset-0 -z-10">
          <img src="/kervox-server-hero.png" alt="" fetchPriority="high" className="h-full w-full object-cover object-[68%_center] lg:-translate-y-[7%] lg:scale-[1.16] lg:object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/20 md:bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.9)_35%,rgba(255,255,255,0)_61%)]" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
          <span className="text-xl font-bold tracking-[0.2em] sm:text-2xl">KERVOX</span>
          <a href="/login" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">Log-in</a>
        </header>

        <div className="flex flex-1 items-center px-6 pb-24 pt-16 sm:px-10 lg:px-[5.7%] lg:pb-32">
          <div className="w-full max-w-[900px]">
            <p className="mb-8 text-xs font-bold uppercase tracking-[0.2em] text-blue-700 sm:text-sm md:text-base">The connected server for your business</p>
            <h1 className="max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-[#070d1e] sm:text-5xl lg:text-[clamp(3rem,3.25vw,4rem)]">
              Welcome to KERVOX.<br />
              <span className="text-blue-600">Your operations, connected.</span>
            </h1>
            <p className="mt-7 max-w-[720px] text-lg leading-relaxed text-slate-600 sm:text-xl lg:text-2xl">
              A central workspace for your teams, workflows and customer operations.
            </p>
            <p className="mt-8 text-lg font-semibold text-blue-800 sm:text-xl">One server. One connected workspace.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
