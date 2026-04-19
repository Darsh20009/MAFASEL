import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Stethoscope,
  Pill,
  ShieldPlus,
  Activity,
  Bot,
  CreditCard,
  UserPlus,
  CalendarCheck,
  HeartPulse,
  Star,
  Download,
  Phone,
  Mail,
  MapPin,
  Menu,
  Apple
} from 'lucide-react';

export function Homepage() {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    return () => {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans rtl">
      {/* 1. Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#101d23] text-white border-b border-white/10 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[#101d23]/95">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/__mockup/images/logo.png" alt="Mafasel Logo" className="h-10 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="text-2xl font-bold tracking-tight text-white">مفاصل</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="hover:text-primary transition-colors text-white/90">الرئيسية</a>
            <a href="#" className="hover:text-primary transition-colors text-white/90">خدماتنا</a>
            <a href="#" className="hover:text-primary transition-colors text-white/90">الأطباء</a>
            <a href="#" className="hover:text-primary transition-colors text-white/90">الصيدلية</a>
            <a href="#" className="hover:text-primary transition-colors text-white/90">تواصل معنا</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">تسجيل الدخول</Button>
            <Button className="bg-[#12a99b] hover:bg-[#12a99b]/90 text-white border-0">إنشاء حساب جديد</Button>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-white/10">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      {/* 2. Hero */}
      <section className="relative overflow-hidden bg-[#f5f7fa] pt-20 pb-32 lg:pt-32 lg:pb-40">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#12a99b]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#101d23]/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-pulse" style={{ animationDuration: '10s' }}></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-[#12a99b]/30 bg-[#12a99b]/10 px-3 py-1 text-sm font-medium text-[#12a99b] mb-6">
                <span className="flex h-2 w-2 rounded-full bg-[#12a99b] ml-2 animate-ping"></span>
                المنصة الصحية الأولى في المملكة
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-[#101d23] leading-[1.2] mb-6 tracking-tight">
                كل رعايتك الصحية<br />في <span className="text-[#12a99b]">مكان واحد</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-lg">
                نوفر لك تجربة صحية متكاملة تبدأ من الاستشارة الطبية عن بُعد، مروراً بطلب الأدوية، وحتى حجز جلسات العلاج الطبيعي.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-[#12a99b] hover:bg-[#12a99b]/90 text-white rounded-xl shadow-lg shadow-[#12a99b]/20">
                  احجز موعدك الآن
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-[#101d23]/20 text-[#101d23] hover:bg-[#101d23]/5 rounded-xl">
                  اكتشف خدماتنا
                </Button>
              </div>
            </div>

            <div className="relative mx-auto lg:mr-auto lg:ml-0 w-full max-w-[400px]">
              {/* Phone Mockup */}
              <div className="relative z-10 w-[320px] mx-auto h-[650px] bg-white rounded-[48px] border-[12px] border-[#101d23] shadow-2xl overflow-hidden flex flex-col translate-y-4 hover:-translate-y-2 transition-transform duration-700 ease-out">
                {/* Dynamic Island */}
                <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-20">
                  <div className="w-32 h-7 bg-[#101d23] rounded-b-3xl"></div>
                </div>
                
                {/* App UI Header */}
                <div className="bg-[#12a99b] pt-12 pb-6 px-6 text-white rounded-b-3xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-white/80 text-xs mb-1">مرحباً بك،</p>
                      <p className="font-bold text-lg">أحمد عبدالله</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                      <UserPlus className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/90 mb-1">الموعد القادم</p>
                      <p className="font-bold text-sm">د. خالد الغامدي • باطنية</p>
                    </div>
                    <div className="bg-white text-[#12a99b] text-xs font-bold px-3 py-1.5 rounded-lg">
                      اليوم، 4:30 م
                    </div>
                  </div>
                </div>
                
                {/* App UI Body */}
                <div className="p-6 flex-1 bg-gray-50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">الخدمات السريعة</h3>
                    <a href="#" className="text-xs text-[#12a99b] font-medium">الكل</a>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { icon: Stethoscope, color: "bg-blue-100 text-blue-600", label: "استشارة" },
                      { icon: Pill, color: "bg-teal-100 text-teal-600", label: "صيدلية" },
                      { icon: Activity, color: "bg-purple-100 text-purple-600", label: "مختبر" },
                      { icon: ShieldPlus, color: "bg-orange-100 text-orange-600", label: "تأمين" }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color} shadow-sm`}>
                          <item.icon className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">{item.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <HeartPulse className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 mb-1">تتبع المؤشرات الحيوية</h4>
                      <p className="text-xs text-gray-500">سجل قراءات الضغط والسكر اليومية</p>
                    </div>
                  </div>
                </div>

                {/* App UI Bottom Nav */}
                <div className="h-20 bg-white border-t border-gray-100 flex justify-around items-center px-6 pb-4">
                  {[Stethoscope, CalendarCheck, Bot, UserPlus].map((Icon, i) => (
                    <Icon key={i} className={`h-6 w-6 ${i === 0 ? "text-[#12a99b]" : "text-gray-400"}`} />
                  ))}
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute top-20 -right-12 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <p className="font-bold text-sm">4.9/5</p>
                  <p className="text-xs text-muted-foreground">تقييم المرضى</p>
                </div>
              </div>

              <div className="absolute bottom-32 -left-16 bg-[#101d23] text-white p-4 rounded-2xl shadow-xl flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">توصيل الأدوية</p>
                  <p className="text-xs text-white/70">خلال ساعتين</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats */}
      <section className="bg-[#101d23] text-white py-12 relative z-20 -mt-8 mx-4 lg:mx-auto max-w-6xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#12a99b]/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="container px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-x-reverse divide-white/10">
            <div className="text-center px-4">
              <p className="text-4xl font-bold text-[#12a99b] mb-2">36M+</p>
              <p className="text-sm text-white/80">مستخدم للمنصة</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-bold text-[#12a99b] mb-2">2000+</p>
              <p className="text-sm text-white/80">طبيب معتمد</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-bold text-[#12a99b] mb-2">500+</p>
              <p className="text-sm text-white/80">صيدلية شريكة</p>
            </div>
            <div className="text-center px-4">
              <p className="text-4xl font-bold text-[#12a99b] mb-2">98%</p>
              <p className="text-sm text-white/80">رضا العملاء</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Services */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-[#101d23] mb-4">خدمات صحية متكاملة</h2>
            <p className="text-muted-foreground text-lg">نقدم مجموعة شاملة من الخدمات الطبية والرقمية لتسهيل رحلتك العلاجية</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "استشارات طبية", desc: "تحدث مع نخبة من الأطباء الاستشاريين في مختلف التخصصات عبر مكالمات الفيديو", icon: Stethoscope, color: "text-blue-500", bg: "bg-blue-50" },
              { title: "صيدلية رقمية", desc: "اطلب أدويتك ومستلزماتك الطبية وتصلك إلى باب بيتك في وقت قياسي", icon: Pill, color: "text-[#12a99b]", bg: "bg-[#12a99b]/10" },
              { title: "تأمين صحي", desc: "اربط وثيقة التأمين الخاصة بك واستفد من التغطية المباشرة للخدمات", icon: ShieldPlus, color: "text-orange-500", bg: "bg-orange-50" },
              { title: "علاج طبيعي", desc: "احجز جلسات العلاج الطبيعي والتأهيل الطبي في أفضل المراكز المعتمدة", icon: Activity, color: "text-purple-500", bg: "bg-purple-50" },
              { title: "مساعد ذكي", desc: "اسأل المساعد الطبي الذكي المدعوم بالذكاء الاصطناعي عن أعراضك", icon: Bot, color: "text-indigo-500", bg: "bg-indigo-50" },
              { title: "بطاقة صحية", desc: "ملفك الطبي الشامل وتقاريرك ووصفاتك في مكان واحد آمن", icon: CreditCard, color: "text-pink-500", bg: "bg-pink-50" },
            ].map((service, i) => (
              <Card key={i} className="border border-gray-100 hover:border-[#12a99b]/30 hover:shadow-lg transition-all duration-300 group cursor-pointer overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#12a99b]/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-8 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl ${service.bg} ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <service.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[#101d23] mb-3">{service.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{service.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How it works */}
      <section className="py-24 bg-[#f5f7fa]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl font-bold text-[#101d23] mb-4">كيف تعمل مفاصل؟</h2>
            <p className="text-muted-foreground text-lg">خطوات بسيطة تفصلك عن الرعاية الصحية التي تستحقها</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-l from-[#12a99b] to-transparent opacity-20 border-t border-dashed border-[#12a99b]"></div>
            
            {[
              { num: "01", title: "سجل حسابك", desc: "أنشئ حسابك بسهولة باستخدام نفاذ أو رقم الجوال", icon: UserPlus },
              { num: "02", title: "اختر الخدمة", desc: "تصفح الأطباء أو الصيدليات أو المراكز واختر ما يناسبك", icon: Menu },
              { num: "03", title: "احصل على الرعاية", desc: "ابدأ استشارتك أو استلم أدويتك بكل راحة وأمان", icon: HeartPulse },
            ].map((step, i) => (
              <div key={i} className="relative text-center group">
                <div className="w-24 h-24 mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mb-8 relative z-10 group-hover:-translate-y-2 transition-transform duration-300">
                  <step.icon className="h-10 w-10 text-[#12a99b]" />
                  <div className="absolute -top-4 -right-4 w-10 h-10 bg-[#101d23] text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-[#101d23] mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed px-4">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Testimonials */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold text-[#101d23] mb-4">تجارب المرضى</h2>
            <p className="text-muted-foreground text-lg">نفخر بثقة الآلاف من المستخدمين في خدماتنا الصحية</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "سارة المحمد", role: "مريضة", quote: "تجربة الاستشارة عن بعد كانت ممتازة، الطبيب كان مستمعاً جيداً وتم صرف الوصفة الطبية فوراً ووصلتني للمنزل في نفس اليوم.", avatar: "SM" },
              { name: "فهد العتيبي", role: "مريض", quote: "تطبيق مفاصل وفر علي الكثير من الوقت والجهد، واجهة سهلة الاستخدام وخدمة عملاء راقية جداً. أنصح به بشدة.", avatar: "FA" },
              { name: "نورة الدوسري", role: "مريضة", quote: "خدمة حجز مواعيد العلاج الطبيعي سهلت علي متابعة حالتي مع أفضل المختصين. التطبيق متكامل بكل معنى الكلمة.", avatar: "ND" },
            ].map((review, i) => (
              <Card key={i} className="bg-gray-50 border-0 shadow-sm">
                <CardContent className="p-8">
                  <div className="flex text-yellow-400 mb-6">
                    {[1,2,3,4,5].map(star => <Star key={star} className="h-5 w-5 fill-current" />)}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-8 text-lg font-medium">"{review.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#12a99b] text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {review.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#101d23]">{review.name}</h4>
                      <p className="text-sm text-muted-foreground">{review.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA */}
      <section className="py-24 bg-[#101d23] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#12a99b]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                حمل تطبيق مفاصل<br />وصحتك في جيبك
              </h2>
              <p className="text-xl text-white/70 mb-10 max-w-lg leading-relaxed">
                احصل على وصول فوري لجميع الخدمات الطبية، تتبع أدويتك، واستشر الأطباء في أي وقت ومن أي مكان.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="h-14 px-6 bg-white text-[#101d23] hover:bg-gray-100 rounded-xl flex items-center gap-3">
                  <Apple className="h-6 w-6" />
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 font-medium">حمل من</div>
                    <div className="font-bold text-sm">App Store</div>
                  </div>
                </Button>
                <Button className="h-14 px-6 bg-white text-[#101d23] hover:bg-gray-100 rounded-xl flex items-center gap-3">
                  <svg className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a1.981 1.981 0 0 1-.58-.75A1.968 1.968 0 0 1 2.8 20.6V3.4a1.97 1.97 0 0 1 .23-.836 1.981 1.981 0 0 1 .58-.75zM14.5 12.708l3.121 3.121a1.967 1.967 0 0 1-1.42 3.421c-.347 0-.687-.091-.989-.264L4.76 13.064l9.74-9.74zM15.208 12l4.417-4.417a1.967 1.967 0 0 1 1.42-3.421c.347 0 .687.091.989.264l10.453 5.922L15.208 12zM22.036 10.936l-1.417-1.417L16.202 12l4.417 4.417 1.417-1.417a1.975 1.975 0 0 0 .564-1.393c0-.525-.205-1.028-.564-1.393z" />
                  </svg>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 font-medium">احصل عليه من</div>
                    <div className="font-bold text-sm">Google Play</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="relative h-[400px] hidden lg:block">
               {/* Decorative App Mockups rotated */}
               <div className="absolute top-10 left-20 w-64 h-[500px] bg-[#1a2e38] rounded-[32px] border-8 border-white/10 shadow-2xl rotate-12 transform hover:rotate-6 transition-transform duration-500">
                  <div className="p-4 space-y-4 opacity-50">
                    <div className="h-20 bg-white/10 rounded-xl"></div>
                    <div className="h-32 bg-[#12a99b]/40 rounded-xl"></div>
                    <div className="h-12 bg-white/10 rounded-xl"></div>
                    <div className="h-12 bg-white/10 rounded-xl"></div>
                  </div>
               </div>
               <div className="absolute -top-10 right-10 w-64 h-[500px] bg-white rounded-[32px] border-8 border-white/10 shadow-2xl -rotate-6 transform hover:rotate-0 transition-transform duration-500 z-10">
                 <div className="bg-[#12a99b] h-32 rounded-t-[24px] p-4 text-white">
                    <div className="w-16 h-4 bg-white/20 rounded-full mb-4"></div>
                    <div className="w-32 h-6 bg-white/40 rounded-full"></div>
                 </div>
                 <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                      <div className="w-12 h-12 rounded-full bg-blue-100"></div>
                      <div className="flex-1 bg-gray-100 rounded-xl"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-12 h-12 rounded-full bg-teal-100"></div>
                      <div className="flex-1 bg-gray-100 rounded-xl"></div>
                    </div>
                    <div className="h-24 bg-orange-50 rounded-xl border border-orange-100"></div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-white pt-20 pb-10 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/__mockup/images/logo.png" alt="Mafasel Logo" className="h-8 w-auto filter grayscale opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="text-2xl font-bold tracking-tight text-[#101d23]">مفاصل</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-sm">
                المنصة الصحية الأولى في المملكة العربية السعودية، نهدف إلى تقديم رعاية صحية متكاملة وموثوقة بكل سهولة ويسر.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-[#12a99b] hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-[#12a99b] hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-[#12a99b] hover:text-white transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#101d23] mb-6 text-lg">الخدمات</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">الاستشارات الطبية</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">الصيدلية الرقمية</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">العلاج الطبيعي</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">التأمين الصحي</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#101d23] mb-6 text-lg">روابط هامة</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">من نحن</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">الأطباء</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">الأسئلة الشائعة</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-[#12a99b] transition-colors">انضم كطبيب</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#101d23] mb-6 text-lg">تواصل معنا</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4 text-[#12a99b]" />
                  <span dir="ltr">+966 9200 00000</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-4 w-4 text-[#12a99b]" />
                  <span>info@mafasel.sa</span>
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-[#12a99b]" />
                  <span>الرياض، المملكة العربية السعودية</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between py-8 border-t border-gray-100 gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} منصة مفاصل الصحية. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-[#12a99b]">الشروط والأحكام</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-[#12a99b]">سياسة الخصوصية</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
