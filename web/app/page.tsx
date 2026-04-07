import React from 'react';
import { LucideCamera, LucideZap, LucideShieldCheck, LucideGlobe, LucideDownload, LucideCheckCircle, LucideSmartphone, LucideApple } from 'lucide-react';

/**
 * NumLens Global Landing Page
 * Design Philosophy: Jony Ive Minimalist / Glassmorphism
 * Strategy: Elon Musk Trend + Sheryl Sandberg Monetization
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white font-sans antialiased">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-8 flex justify-between items-center backdrop-blur-md bg-black/30 border-b border-white/5">
        <div className="text-xl font-light tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
             <LucideCamera className="w-5 h-5 text-white" />
          </div>
          NUM<span className="font-bold">LENS</span>
        </div>
        <div className="flex gap-8 items-center text-sm font-medium text-white/60 hover:text-white transition-colors cursor-pointer">
           <a href="#pricing" className="hover:text-white">Pricing</a>
           <a href="#download" className="px-5 py-2 bg-white text-black rounded-full hover:bg-white/90 transition-all font-bold">Download APK</a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-500 text-sm font-bold mb-8 animate-pulse">
           🚀 GLOBAL LAUNCH 2026
        </div>
        <h1 className="text-6xl md:text-8xl font-light tracking-tight mb-8 leading-[1.1]">
           Calculate Anything. <br />
           <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Instantly.</span>
        </h1>
        <p className="text-xl text-white/50 max-w-2xl mx-auto mb-12 font-light">
           The world's first AR camera calculator. Point your lens at any math problem, 영수증, or stock chart and see the answer in 0.01 seconds.
        </p>
        
        {/* Mockup Preview Area (Ive-style) */}
        <div className="relative max-w-4xl mx-auto mt-20 p-2 bg-gradient-to-b from-white/10 to-transparent rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden aspect-[16/9]">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center grayscale-[0.5] opacity-40"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="backdrop-blur-xl bg-white/10 p-8 rounded-3xl border border-white/20 text-center shadow-2xl">
                 <p className="text-xs tracking-[0.3em] font-bold text-blue-500 mb-2">SCANNING</p>
                 <h2 className="text-5xl font-light mb-1">1,250 + 845</h2>
                 <p className="text-5xl font-bold text-white">2,095</p>
              </div>
           </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-32 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
        <FeatureCard 
          icon={<LucideZap className="w-8 h-8 text-blue-500" />}
          title="0.01s Latency"
          description="John Carmack optimized engine. Real-time frame processing on-device."
        />
        <FeatureCard 
          icon={<LucideShieldCheck className="w-8 h-8 text-blue-500" />}
          title="Privacy First"
          description="All data stays on your phone. No cloud processing, zero data leaks."
        />
        <FeatureCard 
          icon={<LucideGlobe className="w-8 h-8 text-blue-500" />}
          title="Global Modular"
          description="Supports all mathematical symbols and currency formats worldwide."
        />
      </section>

      {/* Pricing Section (Sandberg) */}
      <section id="pricing" className="py-32 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-light mb-4">Simple, Transparent Pricing</h2>
          <p className="text-white/50 mb-16">Start your 5-calculation free trial today.</p>
          
          <div className="max-w-sm mx-auto bg-white p-12 rounded-[2.5rem] text-black shadow-2xl border-4 border-blue-500 relative">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
               Most Popular
            </div>
            <p className="text-sm font-bold text-blue-600 mb-2">MONTHLY PLAN</p>
            <h3 className="text-6xl font-black mb-6">$4.99<span className="text-xl font-medium text-black/50">/mo</span></h3>
            <ul className="text-left space-y-4 mb-10 text-sm font-medium">
               <li className="flex gap-2 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-600" /> Unlimited Calculations</li>
               <li className="flex gap-2 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-600" /> Ad-free Experience</li>
               <li className="flex gap-2 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-600" /> 0.01s Processing Speed</li>
               <li className="flex gap-2 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-600" /> Multi-device Sync</li>
            </ul>
            <button className="w-full py-5 bg-black text-white rounded-2xl font-black hover:scale-[1.02] transition-transform shadow-xl">
               Get Started for Free
            </button>
          </div>
        </div>
      </section>

      {/* Download Section (GaryVee Strategy) */}
      <section id="download" className="py-40 px-6 text-center max-w-7xl mx-auto">
        <h2 className="text-5xl font-light mb-8">Ready to evolve?</h2>
        <p className="text-white/50 mb-12 max-w-xl mx-auto text-lg font-light leading-relaxed">
          Choose your platform and join the future of human-machine calculation. 
          Direct distribution for ultimate performance.
        </p>
        
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
          {/* Android Button */}
          <a href="/NumLens.apk" className="group relative flex items-center gap-4 px-10 py-5 bg-blue-600 rounded-2xl hover:bg-blue-500 transition-all duration-300 font-bold overflow-hidden shadow-2xl shadow-blue-600/20">
            <LucideSmartphone className="w-8 h-8" />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider opacity-60">Available for</p>
              <p className="text-xl">Android (APK)</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
               <LucideDownload className="w-20 h-20" />
            </div>
          </a>

          {/* iOS Button */}
          <a href="#ios-request" className="group relative flex items-center gap-4 px-10 py-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all duration-300 font-bold overflow-hidden">
            <LucideApple className="w-8 h-8" />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider opacity-60">Beta Access for</p>
              <p className="text-xl">Apple iOS</p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
               <LucideDownload className="w-20 h-20" />
            </div>
          </a>
        </div>
        
        <p className="mt-12 text-white/20 text-xs font-light max-w-sm mx-auto">
          Android installation requires 'Unknown Sources' permission. <br/>
          iOS requires Enterprise profile or TestFlight invite.
        </p>
      </section>

      <footer className="py-20 px-6 border-t border-white/5 text-center text-white/20 text-sm font-light">
          © 2026 NumLens Global. Built with Anti-gravity Architecture.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all duration-500">
      <div className="mb-8 p-4 bg-blue-600/10 rounded-2xl inline-block group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-white/40 leading-relaxed font-light">{description}</p>
    </div>
  );
}
