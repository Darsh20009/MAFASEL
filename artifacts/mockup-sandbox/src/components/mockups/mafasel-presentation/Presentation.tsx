import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Stethoscope, 
  Pills, 
  ShieldCheck, 
  Activity, 
  Bot, 
  Video, 
  CreditCard, 
  Map, 
  TrendingUp, 
  Users, 
  Banknote, 
  Award
} from 'lucide-react';

export function Presentation() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Add Google Font for Tajawal
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#101d23] text-white font-['Tajawal',sans-serif] selection:bg-[#12a99b] selection:text-white overflow-hidden"
      dir="rtl"
    >
      <style dangerouslySetInnerHTML={{__html: `
        .glow-text {
          text-shadow: 0 0 20px rgba(18, 169, 155, 0.5);
        }
        .glow-box {
          box-shadow: 0 0 30px rgba(18, 169, 155, 0.15);
        }
        .bg-grid {
          background-size: 50px 50px;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
        }
      `}} />

      {/* Slide 1: Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-8 bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-[#101d23]/80 via-[#101d23]/50 to-[#101d23] z-0" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="z-10 flex flex-col items-center"
        >
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-[#12a99b] blur-[100px] opacity-30 rounded-full" />
            <img 
              src="/__mockup/images/logo.png" 
              alt="Mafasel Logo" 
              className="w-48 h-auto relative z-10 brightness-0 invert"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML += '<span class="text-6xl font-black text-white relative z-10">مفاصل</span>';
              }}
            />
          </div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-5xl md:text-7xl font-bold mb-6 text-center leading-tight glow-text"
          >
            كل رعايتك الصحية<br />في مكان واحد
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-xl md:text-2xl text-gray-300 text-center max-w-2xl"
          >
            منصة تقنية صحية متكاملة — المملكة العربية السعودية
          </motion.p>
        </motion.div>
        
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 text-gray-400 z-10 flex flex-col items-center"
        >
          <span className="text-sm mb-2 opacity-50">اكتشف المزيد</span>
          <div className="w-px h-16 bg-gradient-to-b from-[#12a99b] to-transparent" />
        </motion.div>
      </section>

      {/* Slide 2: Market Opportunity */}
      <section className="min-h-screen flex flex-col justify-center p-8 md:p-16 relative z-10">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#12a99b]">فرصة السوق</h2>
            <p className="text-2xl text-gray-400 mb-16 max-w-3xl">سوق الرعاية الصحية في المملكة العربية السعودية يشهد تحولاً رقمياً غير مسبوق.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <StatCard 
              icon={<TrendingUp size={40} className="text-[#12a99b]" />}
              value="9.7B"
              suffix="ريال"
              label="حجم سوق الصحة الرقمية المتوقع"
              delay={0.2}
            />
            <StatCard 
              icon={<Users size={40} className="text-[#12a99b]" />}
              value="36M"
              suffix="نسمة"
              label="تعداد السكان في المملكة"
              delay={0.4}
            />
            <StatCard 
              icon={<Activity size={40} className="text-[#12a99b]" />}
              value="65%"
              suffix=""
              label="نسبة الشباب المستعدين للتبني الرقمي"
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Slide 3: Platform Overview */}
      <section className="min-h-screen flex flex-col justify-center p-8 md:p-16 relative z-10 bg-[#0a1317]">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">منظومة صحية متكاملة</h2>
            <p className="text-xl text-gray-400">8 خدمات أساسية مترابطة لتقديم أفضل تجربة للمريض</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <FeatureCard icon={<Stethoscope />} title="استشارات طبية" delay={0.1} />
            <FeatureCard icon={<Pills />} title="صيدلية رقمية" delay={0.2} />
            <FeatureCard icon={<ShieldCheck />} title="تأمين صحي" delay={0.3} />
            <FeatureCard icon={<Activity />} title="علاج طبيعي" delay={0.4} />
            <FeatureCard icon={<Bot />} title="ذكاء اصطناعي" delay={0.5} />
            <FeatureCard icon={<Video />} title="اجتماعات فيديو" delay={0.6} />
            <FeatureCard icon={<CreditCard />} title="بطاقة صحية" delay={0.7} />
            <FeatureCard icon={<Map />} title="خريطة المراكز" delay={0.8} />
          </div>
        </div>
      </section>

      {/* Slide 4: Business Model */}
      <section className="min-h-screen flex flex-col justify-center p-8 md:p-16 relative z-10">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[#12a99b]">نموذج العمل</h2>
            <p className="text-2xl text-gray-400">مصادر إيرادات متعددة ومستدامة</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevenueCard 
              title="اشتراكات شهرية" 
              desc="باقات مخصصة للعيادات والمراكز الطبية لاستخدام المنصة"
              icon={<Banknote className="w-12 h-12 mb-4 text-[#12a99b]" />}
              delay={0.2}
            />
            <RevenueCard 
              title="عمولة استشارات" 
              desc="نسبة مئوية من قيمة كل استشارة طبية تتم عبر المنصة"
              icon={<TrendingUp className="w-12 h-12 mb-4 text-[#12a99b]" />}
              delay={0.4}
              highlight={true}
            />
            <RevenueCard 
              title="بيع الأدوية" 
              desc="هوامش ربح من مبيعات الصيدلية الرقمية وتوصيل الأدوية"
              icon={<Pills className="w-12 h-12 mb-4 text-[#12a99b]" />}
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Slide 5: Roadmap */}
      <section className="min-h-screen flex flex-col justify-center p-8 md:p-16 relative z-10 bg-[#0a1317]">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">خارطة الطريق</h2>
            <p className="text-xl text-gray-400">رؤيتنا للنمو والتوسع حتى 2031</p>
          </motion.div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2 hidden md:block" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4">
              <TimelineItem year="2026" title="الإطلاق الرسمي" desc="إطلاق المنصة الأساسية في الرياض وجدة" delay={0.2} />
              <TimelineItem year="2027" title="التوسع الوطني" desc="تغطية جميع مناطق المملكة وإضافة خدمات الذكاء الاصطناعي" delay={0.4} />
              <TimelineItem year="2029" title="التكامل الشامل" desc="الربط مع جميع مزودي التأمين والمستشفيات الحكومية" delay={0.6} />
              <TimelineItem year="2031" title="الريادة الإقليمية" desc="التوسع في دول الخليج والشرق الأوسط" delay={0.8} />
            </div>
          </div>
        </div>
      </section>

      {/* Slide 6: Vision 2030 & Team */}
      <section className="min-h-screen flex flex-col items-center justify-center p-8 relative z-10 overflow-hidden">
        {/* Abstract Vision Graphic */}
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] border-[1px] border-[#12a99b] rounded-full absolute animate-[spin_60s_linear_infinite]" />
          <div className="w-[600px] h-[600px] border-[1px] border-white/20 rounded-full absolute animate-[spin_40s_linear_infinite_reverse]" />
          <div className="w-[400px] h-[400px] border-[2px] border-[#12a99b] rounded-full absolute animate-[spin_20s_linear_infinite] shadow-[0_0_50px_rgba(18,169,155,0.2)]" />
        </div>

        <div className="max-w-4xl mx-auto w-full text-center relative z-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <Award className="w-24 h-24 text-[#12a99b] mx-auto mb-8 opacity-80" />
            <h2 className="text-5xl md:text-7xl font-bold mb-8 text-white">متوافقون مع رؤية 2030</h2>
            <p className="text-2xl md:text-3xl text-gray-300 mb-12 leading-relaxed">
              نهدف إلى بناء مجتمع حيوي ونظام صحي متكامل، مساهمين في تحقيق أهداف التحول الوطني في القطاع الصحي.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Badge text="التحول الرقمي" />
              <Badge text="جودة الحياة" />
              <Badge text="خصخصة الرعاية الصحية" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

// Components
function StatCard({ icon, value, suffix, label, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className="bg-[#1a2b34] p-8 rounded-2xl border border-white/5 glow-box hover:border-[#12a99b]/50 transition-colors"
    >
      <div className="mb-6 bg-[#101d23] w-16 h-16 rounded-full flex items-center justify-center border border-[#12a99b]/30">
        {icon}
      </div>
      <div className="text-6xl font-black text-white mb-2 flex items-baseline gap-2">
        {value}
        <span className="text-2xl text-[#12a99b]">{suffix}</span>
      </div>
      <div className="text-gray-400 text-lg">{label}</div>
    </motion.div>
  );
}

function FeatureCard({ icon, title, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay }}
      className="bg-[#101d23] p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-[#1a2b34] transition-colors h-40"
    >
      <div className="text-[#12a99b] mb-4 [&>svg]:w-8 [&>svg]:h-8 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-white font-medium text-lg">{title}</h3>
    </motion.div>
  );
}

function RevenueCard({ title, desc, icon, delay, highlight = false }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className={`p-8 rounded-2xl border ${highlight ? 'bg-[#12a99b]/10 border-[#12a99b]/50 glow-box' : 'bg-[#1a2b34] border-white/5'} flex flex-col items-start`}
    >
      {icon}
      <h3 className={`text-2xl font-bold mb-4 ${highlight ? 'text-white' : 'text-gray-200'}`}>{title}</h3>
      <p className="text-gray-400 text-lg leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function TimelineItem({ year, title, desc, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="relative flex flex-col items-center md:items-start text-center md:text-right"
    >
      {/* Dot */}
      <div className="w-6 h-6 rounded-full bg-[#12a99b] border-4 border-[#0a1317] relative z-10 mb-6 md:absolute md:top-1/2 md:-translate-y-1/2 md:right-0 md:mb-0 shadow-[0_0_15px_rgba(18,169,155,0.8)]" />
      
      <div className="md:pr-10 md:pt-16">
        <div className="text-[#12a99b] font-black text-3xl mb-2">{year}</div>
        <h4 className="text-white font-bold text-xl mb-2">{title}</h4>
        <p className="text-gray-400 text-sm">{desc}</p>
      </div>
    </motion.div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div className="px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 text-yellow-500 font-medium text-lg flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      {text}
    </div>
  );
}
