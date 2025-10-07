'use client';

const featureTiles = [
  {
    title: 'Parcel Intelligence',
    description: 'Blend GIS data with financial assumptions in real time.',
    icon: '🗺️'
  },
  {
    title: 'Scenario Builder',
    description: 'Model absorption and revenue projections across parcels.',
    icon: '📈'
  },
  {
    title: 'AI Document Review',
    description: 'Ingest approvals, minutes, and contracts with structured outputs.',
    icon: '🤖'
  }
];

const ctas = [
  { label: 'Launch Budget Prototype', href: '/budget-grid' },
  { label: 'View CoreUI Shell', href: '/coreui-app' }
];

const LandingPagePrototype = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
              <span className="text-2xl">🌄</span>
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Prototype</p>
              <h1 className="font-semibold tracking-tight">Landscape Platform</h1>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#call-to-action" className="transition hover:text-white">
              Get Started
            </a>
            <a href="https://github.com/Greggwolin/landscape" className="transition hover:text-white" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center">
          <span className="rounded-full border border-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-indigo-200/80">
            Internal Prototype
          </span>
          <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Rapid experiments for product design
          </h2>
          <p className="max-w-2xl text-base text-slate-300 md:text-lg">
            This sandbox isolates visual ideas so you can iterate quickly without risking regressions in the
            main application. Swap components, evaluate layout systems, and share feedback with the team before
            merging.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4" id="call-to-action">
            {ctas.map((cta) => (
              <a
                key={cta.label}
                href={cta.href}
                className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-400"
              >
                {cta.label}
              </a>
            ))}
            <button className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white">
              Share Feedback
            </button>
          </div>
        </section>

        <section id="features" className="border-t border-white/5 bg-white/5 py-16">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-3">
            {featureTiles.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-black/20 p-6 transition hover:border-indigo-500/80 hover:bg-black/10"
              >
                <div className="mb-4 text-4xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-200">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Landscape – Prototype channel</p>
          <div className="flex gap-4">
            <span>Design iteration #{Math.floor(Math.random() * 42) + 1}</span>
            <span className="hidden md:inline">Feedback Slack channel: #prototype-lab</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPagePrototype;
