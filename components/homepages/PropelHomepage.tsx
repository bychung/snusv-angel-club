'use client';

import AngelInquiryModal from '@/components/modals/AngelInquiryModal';
import IRInquiryModal from '@/components/modals/IRInquiryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Handshake, Home, Mail, Target, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OtherHomepage() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white overflow-x-hidden">
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
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25'
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="mb-12">
              <h1 className="text-4xl md:text-8xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  OTHER
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                  ANGEL CLUB
                </span>
              </h1>

              <p className="text-lg md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto">
                혁신적인 스타트업 생태계를 함께 만들어가는 엔젤클럽으로,
                <br />
                미래를 바꾸는 아이디어와 기업가를 지원하는 투자 플랫폼입니다.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              {[
                {
                  icon: TrendingUp,
                  title: '전략적 투자',
                  description:
                    '체계적인 투자 심사와 전문가 네트워크를 통한 스마트한 투자',
                  gradient: 'from-blue-500 to-indigo-500',
                },
                {
                  icon: Users,
                  title: '멘토링 지원',
                  description:
                    '업계 최고 전문가들의 실질적인 멘토링과 네트워킹 기회 제공',
                  gradient: 'from-purple-500 to-blue-500',
                },
                {
                  icon: Target,
                  title: '성장 동반자',
                  description:
                    '단순한 투자를 넘어 스타트업의 성공까지 함께하는 진정한 파트너',
                  gradient: 'from-indigo-500 to-purple-500',
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
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-900/50 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                About Us
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                우리는 혁신적인 아이디어와 뛰어난 기업가들을 발굴하고 지원하는
                전문 투자집단입니다.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6 text-white">
                  우리의 비전
                </h3>
                <p className="text-lg text-gray-300 leading-relaxed mb-8">
                  스타트업 생태계의 건전한 발전과 혁신적인 기술의 상용화를 통해
                  더 나은 미래를 만들어가는 것이 우리의 사명입니다.
                </p>
                <div className="space-y-4">
                  {[
                    '전문적인 투자 심사와 포트폴리오 관리',
                    '체계적인 멘토링과 네트워킹 지원',
                    '지속가능한 스타트업 생태계 구축',
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-8">
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
                    <div className="text-2xl font-bold text-purple-400">
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              함께 성장해요
            </h2>
            <p className="text-xl mb-16 text-gray-300 leading-relaxed">
              혁신적인 아이디어를 가진 스타트업과 투자에 관심있는 파트너를 찾고
              있습니다.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    스타트업 IR
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    혁신적인 아이디어와 확장 가능한 비즈니스 모델을 보유한
                    스타트업의 IR 신청을 기다립니다.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0"
                    onClick={() => setIsIRModalOpen(true)}
                  >
                    IR 문의하기
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Handshake className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    클럽 가입
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    스타트업 투자와 생태계 발전에 관심있는 투자자와 전문가를
                    모집하고 있습니다.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
                    onClick={() => setIsAngelModalOpen(true)}
                  >
                    가입 문의하기
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 border border-white/10">
              <h3 className="text-3xl font-semibold mb-6 text-white">
                기타 문의
              </h3>
              <div className="flex items-center justify-center gap-3 text-xl mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <a
                  href="mailto:other@angel-club.kr"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  other@angel-club.kr
                </a>
              </div>
              <p className="text-gray-300 leading-relaxed">
                언제든지 연락주세요. 함께 혁신의 여정을 만들어가겠습니다.
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
