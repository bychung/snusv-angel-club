'use client';

import AngelInquiryModal from '@/components/modals/AngelInquiryModal';
import IRInquiryModal from '@/components/modals/IRInquiryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Handshake, Home, Mail, Target, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PropelHomepage() {
  const [activeSection, setActiveSection] = useState('home');
  const [scrollY, setScrollY] = useState(0);
  const [isIRModalOpen, setIsIRModalOpen] = useState(false);
  const [isAngelModalOpen, setIsAngelModalOpen] = useState(false);

  // 인증 상태 가져오기
  const { user } = useAuthStore();

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About', icon: Users },
    { id: 'withus', label: 'With Us', icon: Mail },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      const sections = ['home', 'about', 'withus'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 text-white overflow-x-hidden">
      {/* Login/Dashboard Button - Top Right */}
      <div
        className={`fixed top-1 right-3 z-50 transition-all duration-500 ease-in-out ${
          scrollY > 100
            ? 'opacity-0 translate-y-[-20px] pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <Link href={user ? '/dashboard' : '/login'}>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm shadow-lg text-xs px-3 py-1.5"
          >
            {user ? '대시보드' : '로그인'}
          </Button>
        </Link>
      </div>

      {/* Floating Navigation */}
      <nav className="fixed right-1 md:right-8 top-1/2 transform -translate-y-1/2 z-50">
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-1 md:p-2 shadow-2xl">
          <div className="flex flex-col gap-0.5 md:gap-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`group relative p-2 md:p-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25'
                      : 'hover:bg-white/10'
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`w-4 h-4 md:w-5 md:h-5 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-white'
                    }`}
                  />

                  {/* Tooltip */}
                  <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap border border-white/10">
                      {item.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Home Section */}
        <section
          id="home"
          className="min-h-screen flex items-center justify-center px-8 pt-6 md:pt-0 relative overflow-hidden"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="mb-12">
              <h1 className="text-4xl md:text-8xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  PROPEL
                </span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
                  VENTURES
                </span>
              </h1>

              <p className="text-lg md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto">
                혁신적인 스타트업과 함께 성장하는 벤처캐피탈로,
                <br />
                미래를 바꾸는 기술과 비즈니스 모델에 투자하며 성공을
                만들어갑니다.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              {[
                {
                  icon: TrendingUp,
                  title: '전략적 투자',
                  description:
                    '다양한 산업 분야의 전문 지식을 바탕으로 한 체계적이고 전략적인 투자',
                  gradient: 'from-blue-500 to-cyan-500',
                },
                {
                  icon: Users,
                  title: '성장 가속화',
                  description:
                    '전문 멘토링, 전략적 파트너십 및 글로벌 네트워크를 통한 빠른 성장',
                  gradient: 'from-cyan-500 to-teal-500',
                },
                {
                  icon: Target,
                  title: '가치 창조',
                  description:
                    'IPO나 M&A까지 전 과정에서 최적의 가치를 창조하는 전문 파트너',
                  gradient: 'from-teal-500 to-blue-500',
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 group"
                >
                  <CardContent className="p-8 text-center">
                    <div
                      className={`w-16 h-16 bg-gradient-to-r ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-white">
                      {item.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="min-h-screen py-20 px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                About Us
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                혁신적인 기술과 강력한 비즈니스 모델을 보유한 스타트업에
                투자하는 전문 벤처캐피탈입니다.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6 text-white">
                  우리의 비전
                </h3>
                <p className="text-lg text-gray-300 leading-relaxed mb-8">
                  초기 단계 스타트업부터 성장 기업까지, 혁신적인 기술과 비즈니스
                  모델을 바탕으로 미래를 선도하는 기업들의 성공에 기여하는 것이
                  우리의 사명입니다.
                </p>
                <div className="space-y-4">
                  {[
                    '체계적인 Due Diligence와 전문 심사',
                    '포트폴리오 기업 성장 지원 및 멘토링',
                    'Exit Strategy 기획 및 IPO/M&A 지원',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl p-8">
                <h4 className="text-2xl font-bold mb-4 text-white">
                  투자 현황
                </h4>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">
                      Coming Soon
                    </div>
                    <div className="text-sm text-gray-300">
                      포트폴리오 기업수
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-cyan-400">
                      Coming Soon
                    </div>
                    <div className="text-sm text-gray-300">총 투자금액</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* With Us Section */}
        <section
          id="withus"
          className="min-h-screen py-20 px-8 relative overflow-hidden pb-24"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-teal-500/20"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              함께 성장해요
            </h2>
            <p className="text-xl mb-16 text-gray-300 leading-relaxed">
              미래를 바꿀 혁신적인 스타트업과 학예있는 기업가들을 지원하며,
              성공적인 투자 생태계를 만들어 가고 있습니다.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    스타트업 IR
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    차세대 기술과 높은 성장 가능성을 보유한 스타트업의 투자
                    제안을 기다립니다.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
                    onClick={() => setIsIRModalOpen(true)}
                  >
                    IR 문의하기
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Handshake className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    파트너십
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    전문적인 시각과 다양한 경험을 바탕으로 함께 성공을 만들어갈
                    경험 많은 투자자와 어드바이저를 모집하고 있습니다.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white border-0"
                    onClick={() => setIsAngelModalOpen(true)}
                  >
                    파트너 문의하기
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
              <h3 className="text-3xl font-semibold mb-6 text-white">
                기타 문의
              </h3>
              <div className="flex items-center justify-center gap-3 text-xl mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <a
                  href="mailto:contact@propelventures.kr"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  contact@propel.kr
                </a>
              </div>
              <p className="text-gray-300 leading-relaxed">
                언제든지 연락주세요. 함께 미래의 성공 스토리를 만들어가겠습니다.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* IR 문의 모달 */}
      <IRInquiryModal
        isOpen={isIRModalOpen}
        onClose={() => setIsIRModalOpen(false)}
      />

      {/* 엔젤클럽 가입 문의 모달 */}
      <AngelInquiryModal
        isOpen={isAngelModalOpen}
        onClose={() => setIsAngelModalOpen(false)}
      />
    </div>
  );
}
