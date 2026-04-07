import React from 'react';
import { LucideCamera, LucideZap, LucideShieldCheck, LucideGlobe, LucideDownload, LucideCheckCircle, LucideSmartphone, LucideApple, LucideInfinity } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-6 flex justify-between items-center backdrop-blur-xl bg-black/50 border-b border-white/5">
        <div className="text-xl font-light tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
             <LucideCamera className="w-5 h-5 text-white" />
          </div>
          MASTER<span className="font-bold">COUNT</span>
        </div>
        <div className="flex gap-8 items-center text-sm font-medium text-white/70">
           <a href="#pricing" className="hover:text-white transition-colors">요금제</a>
           <a href="#download" className="px-6 py-2.5 bg-white text-black rounded-full hover:scale-105 transition-transform font-bold shadow-xl">무료 체험하기</a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:min-h-[85vh]">
        {/* Left: Text & Selling Points */}
        <div className="flex-1 text-left pt-10">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-500 text-sm font-bold mb-6">
             ⚡️ 현장 업무의 무기를 손에 쥐세요
          </div>
          <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-8 leading-[1.1]">
             비추는 순간, <br />
             <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">계산은 끝납니다.</span>
          </h1>
          <div className="text-lg text-white/60 mb-10 font-light leading-relaxed space-y-4 max-w-xl">
            <p>
              창고에서 재고를 셀 때, 식당에서 영수증을 정산할 때, 
              복잡한 사무실 서류를 확인할 때… 아직도 계산기에 숫자를 하나하나 치고 계십니까?
            </p>
            <p className="text-white/90 font-medium">
              MasterCount는 스마트폰 렌즈를 비추는 즉시 모든 숫자를 인식하고 계산합니다. 
              압도적인 속도로 당신의 퇴근 시간을 앞당겨 드립니다.
            </p>
          </div>
          <div className="flex gap-4">
             <a href="#download" className="px-8 py-4 bg-blue-600 rounded-full font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30 flex items-center gap-2">
                <LucideDownload className="w-5 h-5" /> 지금 업무에 적용하기
             </a>
          </div>
        </div>
        
        {/* Right: Demo GIF / Video Mockup */}
        <div className="flex-1 w-full max-w-lg relative">
           <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 blur-2xl rounded-full opacity-50 animate-pulse"></div>
           <div className="relative bg-white/5 p-4 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden aspect-[9/16] flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center">
              {/* Overlay to simulate AR scanning */}
              <div className="absolute inset-0 bg-black/40"></div>
              
              {/* Simulated Scanning UI */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                 <div className="w-full h-40 border-2 border-blue-500/50 rounded-xl relative overflow-hidden mb-8">
                    {/* Scanning Laser */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded text-xs font-mono text-blue-400">
                       Detecting: 4,500 * 12
                    </div>
                 </div>
                 
                 <div className="backdrop-blur-xl bg-black/60 p-6 rounded-2xl border border-white/10 w-full text-center shadow-2xl transform">
                    <p className="text-xs tracking-[0.2em] font-bold text-gray-400 mb-1">TOTAL RESULT</p>
                    <p className="text-4xl font-bold text-white tracking-widest">54,000</p>
                 </div>
              </div>
           </div>
           <p className="text-center text-xs text-white/30 mt-4">* 실제 앱의 실시간 인식 데모 화면입니다.</p>
        </div>
      </header>

      {/* Features Outline */}
      <section className="py-20 bg-white/5 border-t border-white/5">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
               <LucideZap className="w-8 h-8 mx-auto text-blue-500 mb-4" />
               <h3 className="font-bold text-lg mb-2">0.01초 실시간 인식</h3>
               <p className="text-white/50 text-sm">타이핑이 필요 없습니다. 렌즈에 담기는 순간 계산이 끝납니다.</p>
            </div>
            <div>
               <LucideShieldCheck className="w-8 h-8 mx-auto text-blue-500 mb-4" />
               <h3 className="font-bold text-lg mb-2">오프라인 보안 연산</h3>
               <p className="text-white/50 text-sm">중요한 회사 기밀이나 영수증 데이터가 서버로 넘어가지 않습니다.</p>
            </div>
            <div>
               <LucideGlobe className="w-8 h-8 mx-auto text-blue-500 mb-4" />
               <h3 className="font-bold text-lg mb-2">복잡한 양식 완벽 대응</h3>
               <p className="text-white/50 text-sm">물류 송장, 영수증, 수기가 섞인 장부 등 현장의 문서를 이해합니다.</p>
            </div>
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light mb-4">합리적인 플랜, 압도적인 효율</h2>
            <p className="text-white/50">당신의 소중한 시간을 절약하는 비용</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white/5 p-10 rounded-[2rem] border border-white/10 hover:border-blue-500/50 transition-colors relative flex flex-col">
              <p className="text-sm font-bold text-blue-400 mb-2">구독형 (Monthly)</p>
              <h3 className="text-5xl font-black mb-4">$2.99<span className="text-lg font-normal text-white/50">/월</span></h3>
              <p className="text-white/60 mb-8 flex-grow">항상 최신 AI 모델과 기능을 제공받는 구독형 서비스입니다. 지속적인 업데이트가 핵심입니다.</p>
              
              <ul className="space-y-3 mb-8 text-sm">
                 <li className="flex gap-3 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-500" /> 무제한 실시간 연산</li>
                 <li className="flex gap-3 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-500" /> 월간 AI 인식 모델 업데이트</li>
                 <li className="flex gap-3 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-500" /> 신규 기능 최우선 적용</li>
              </ul>
              <button className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-colors">
                 월간 구독 시작하기
              </button>
            </div>

            {/* Lifetime Plan */}
            <div className="bg-gradient-to-b from-blue-900/40 to-black p-10 rounded-[2rem] border-2 border-blue-500 relative flex flex-col shadow-2xl shadow-blue-900/20">
              <div className="absolute -top-4 right-8 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                 Best Value
              </div>
              <p className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                평생 소장용 <LucideInfinity className="w-4 h-4" />
              </p>
              <h3 className="text-5xl font-black mb-4">$19.99<span className="text-lg font-normal text-white/50 text-transparent">/한 번</span></h3>
              <p className="text-white/60 mb-8 flex-grow">구독 스트레스 없이, 한 번 결제로 MasterCount의 안티그래비티 급 성능을 영원히 소유하세요.</p>
              
              <ul className="space-y-3 mb-8 text-sm">
                 <li className="flex gap-3 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-500" /> 평생 무제한 사용권</li>
                 <li className="flex gap-3 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-500" /> 추가 비용 0원</li>
                 <li className="flex gap-3 items-center"><LucideCheckCircle className="w-5 h-5 text-blue-500" /> 1:1 우선 지원 센터</li>
              </ul>
              <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25">
                 평생 라이선스 구매
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-32 px-6 bg-gradient-to-t from-blue-900/10 to-transparent border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-light mb-4 text-center">지금 바로 현장에 도입하세요</h2>
          <p className="text-white/50 mb-16 text-center max-w-xl mx-auto">
            중간 마진 없이 가장 다이렉트한 프리미엄 배포 방식을 채택했습니다.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Android */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 flex flex-col">
               <LucideSmartphone className="w-10 h-10 text-white mb-6" />
               <h3 className="text-2xl font-bold mb-2">Android 사용자</h3>
               <p className="text-white/60 text-sm mb-8 flex-grow">
                 구글 플레이스토어 수수료 0%. <br />웹에서 최신 버전의 APK를 직접 다운로드하여 즉각적인 성능을 경험하세요.
               </p>
               <a href="/MasterCount.apk" className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors">
                  <LucideDownload className="w-5 h-5" /> APK 직접 다운로드
               </a>
               <p className="text-[10px] text-white/30 text-center mt-3">* 설치 시 '알 수 없는 출처' 허용이 필요합니다.</p>
            </div>

            {/* iOS */}
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 flex flex-col">
               <LucideApple className="w-10 h-10 text-white mb-6" />
               <h3 className="text-2xl font-bold mb-2">iOS 사용자</h3>
               <p className="text-white/60 text-sm mb-8 flex-grow">
                 Apple 정책상 외부 설치가 제한됩니다. <br />안전하게 웹에서 라이선스를 활성화한 후 앱에 부여하는 방식을 권장합니다.
               </p>
               <button className="flex items-center justify-center gap-2 w-full py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/20">
                  <LucideApple className="w-5 h-5" /> 웹 결제 후 기기 등록
               </button>
               <p className="text-[10px] text-white/30 text-center mt-3">* Enterprise 인증 방식 사용 시 직접 다운로드가 활성화됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/5 text-center text-white/30 text-sm">
          © 2026 MasterCount Technologies. Built with Anti-gravity Architecture.
      </footer>
    </div>
  );
}
