'use client';

import AngelInquiryModal from '@/components/modals/AngelInquiryModal';
import IRInquiryModal from '@/components/modals/IRInquiryModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import {
  Building2,
  ChevronRight,
  Handshake,
  Home,
  Mail,
  Rocket,
  Sparkles,
  Sprout,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ExecutiveMember {
  id: string;
  name: string;
  position: string;
  image: string;
  shortBio: string;
  fullBio: string;
  experience: string[];
}

interface Partner {
  name: string;
  logo: string;
  description: string;
  website?: string;
}

const executiveMembers: ExecutiveMember[] = [
  {
    id: 'ceo1',
    name: '정보영',
    position: '대표이사',
    image: '/members/chungboyoung.png',
    shortBio: '컴퍼니빌딩 / 액셀러레이팅',
    fullBio:
      'LP, GP를 모두 경험하였고 다수의 엔젤투자를 진행해 본 경험이 있습니다. 과거에는 개발자로서 업무를 한 적이 있으며 현재도 투자와 AI 개발을 병행하고 있습니다.',
    experience: [
      '서울대학교 컴퓨터공학부 졸업',
      '한국벤처투자',
      '지앤텍벤처투자',
      '루트벤처스',
    ],
  },
  {
    id: 'ceo2',
    name: '곽준영',
    position: '대표이사',
    image: '/members/kwakjuneyoung.jpeg',
    shortBio: '투자 관리 총괄',
    fullBio:
      '10여년간 변호사로서 대형 로펌과 글로벌 회계법인에서 금융조세, 경영권 분쟁, M&A 등 기업법무를 담당한 베테랑 변호사입니다. 동시에 다양한 엔젤투자 및 개인투자조합/엔젤클럽 운영 등을 통해 스타트업에 대한 투자 감각도 갖추고 있습니다.',
    experience: [
      '(사)엔젤투자협회 정회원',
      '상장사/비상장사 스타트업 법률고문 및 자문, 투자심사',
      '유암코(연합자산관리공사) 고문',
      '서울시립대로스쿨 형사소송법/형사실무교수',
    ],
  },
  {
    id: 'cio',
    name: '김동욱',
    position: '상무',
    image: '/members/kimdongwook.png',
    shortBio: 'EIR (Entrepreneur in Residence)',
    fullBio:
      '다수의 투자 심사 경험과 창업 경험을 바탕으로 프로펠벤처스의 투자 전략 수립과 포트폴리오의 밸류업을 도와주고 있습니다.',
    experience: [
      `King's College London 뇌신경학 박사`,
      '카이페리온',
      'SBI인베스트먼트',
      '동아쏘시오홀딩스',
    ],
  },
];

const partners: Partner[] = [
  {
    name: 'SNUSV 엔젤클럽',
    logo: '/logos/snusv.png',
    description:
      '서울대학교 학생 벤처 네트워크 동아리(SNUSV) Alumni 기반의 엔젤클럽으로, 후배 스타트업을 지원하며 함께 미래를 만들어가는 투자 생태계를 구축합니다.',

    website: 'https://snusv.angel-club.kr',
  },
  {
    name: '법무법인 웨이브',
    logo: '/logos/wave.png',
    description:
      '대형로펌, 글로벌회계법인, 유니콘기업, 투자·스타트업 Exit 등에서 10년 이상의 경력을 가진 변호사들이 설립한 스타트업·중소·중견기업을 위한 로펌입니다.',
    website: 'https://www.wavelaw.co.kr/',
  },
];

export default function PropelHomepage() {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedMember, setSelectedMember] = useState<ExecutiveMember | null>(
    null
  );
  const [scrollY, setScrollY] = useState(0);
  const [isIRModalOpen, setIsIRModalOpen] = useState(false);
  const [isAngelModalOpen, setIsAngelModalOpen] = useState(false);

  // 인증 상태 가져오기
  const { user } = useAuthStore();

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About', icon: Users },
    { id: 'partners', label: 'Partners', icon: Handshake },
    { id: 'withus', label: 'With Us', icon: Mail },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      const sections = ['home', 'about', 'partners', 'withus'];
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
                컴퍼니빌딩 및 비지니스를 함께 고민하는 액셀러레이터로서,
                <br />
                미래를 바꾸는 기술과 혁신적인 비즈니스에 투자합니다.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              {[
                {
                  icon: Building2,
                  title: '컴퍼니빌딩',
                  description:
                    '창업자를 존중하는 2대주주로서 창업자를 위한 모든 것을 지원합니다.',
                  gradient: 'from-blue-500 to-cyan-500',
                },
                {
                  icon: Rocket,
                  title: '액셀러레이팅',
                  description:
                    '획일적인 프로그램 형태의 액셀러레이팅이 아닌, 각 기업에 알맞는 도움을 제공합니다.',
                  gradient: 'from-cyan-500 to-teal-500',
                },
                {
                  icon: Sprout,
                  title: '시드 투자',
                  description:
                    '단순 시드 투자를 넘어, 폭넓은 네트워크를 지원합니다.',
                  gradient: 'from-teal-500 to-blue-500',
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 group"
                >
                  <CardContent className="p-7 text-center">
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

        {/* About Section - Team */}
        <section id="about" className="min-h-screen py-20 px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Our Team
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                다양한 분야의 전문가들이 함께 프로펠벤처스를 이끌어 나가고
                있습니다.
              </p>
            </div>

            {/* Executive Members */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {executiveMembers.map(member => (
                <Card
                  key={member.id}
                  className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 cursor-pointer group"
                  onClick={() => setSelectedMember(member)}
                >
                  <CardContent className="p-8 text-center">
                    <div className="relative mb-6">
                      <div className="w-44 h-44 mx-auto rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500 p-1">
                        <img
                          src={member.image || '/placeholder.svg'}
                          alt={member.name}
                          className="w-full h-full object-cover rounded-2xl bg-gray-800"
                        />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h4 className="text-xl font-semibold mb-2 text-white">
                      {member.name}
                    </h4>
                    <p className="text-blue-400 font-medium mb-3">
                      {member.position}
                    </p>
                    <p className="text-gray-300 text-sm mb-4">
                      {member.shortBio}
                    </p>
                    <Button
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 group-hover:translate-x-1 transition-all"
                    >
                      자세히 보기 <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Partners Section */}
        <section id="partners" className="min-h-screen py-20 px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Our Partners
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                함께하는 파트너 기관들과의 협력으로 더 큰 가치를 창출합니다
              </p>
            </div>

            <div className="space-y-8">
              {partners.map((partner, index) => (
                <Card
                  key={index}
                  className={`bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 ${
                    partner.website ? 'cursor-pointer hover:-translate-y-1' : ''
                  }`}
                  onClick={() => {
                    if (partner.website) {
                      window.open(
                        partner.website,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }}
                >
                  <CardContent className="px-12 py-8">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                      <div className="lg:col-span-5">
                        <div className="flex items-center justify-center h-48 bg-white/3 rounded-xl">
                          <img
                            src={partner.logo || '/placeholder.svg'}
                            alt={partner.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-7">
                        <div className="flex items-center justify-between">
                          <h3 className="text-3xl font-bold mb-4 text-white">
                            {partner.name}
                          </h3>
                          {partner.website && (
                            <div className="text-blue-400 hover:text-blue-300 transition-colors">
                              <ChevronRight className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <p className="text-gray-300 leading-relaxed text-lg mb-8">
                          {partner.description}
                        </p>
                        {partner.website && (
                          <div className="flex items-center text-blue-400 text-sm">
                            <span>웹사이트 바로가기</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* With Us Section */}
        <section
          id="withus"
          className="min-h-screen flex items-center justify-center py-20 px-8 relative overflow-hidden"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-teal-500/20"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              함께 성장해요
            </h2>
            <p className="text-xl mb-12 text-gray-300 leading-relaxed">
              미래를 바꿀 혁신적인 스타트업과 함께 성장하며, 성공적인 투자
              생태계를 만들어 가고 있습니다.
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* 스타트업 IR 카드 */}
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

              {/* 기타 문의 카드 */}
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    기타 문의
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    투자 문의 외에 다른 협력이나 파트너십에 대한 문의사항이
                    있으시면 언제든 연락해 주세요.
                  </p>
                  <div className="flex items-center justify-center gap-3 text-lg">
                    <a
                      href={`mailto:help@propel.kr`}
                      className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white px-6 py-2 rounded-lg transition-all font-medium"
                    >
                      help@propel.kr
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Member Detail Modal */}
      <Dialog
        open={!!selectedMember}
        onOpenChange={() => setSelectedMember(null)}
      >
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">
              {selectedMember?.name} {selectedMember?.position}
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-500 p-1 flex-shrink-0">
                  <img
                    src={selectedMember.image || '/placeholder.svg'}
                    alt={selectedMember.name}
                    className="w-full h-full object-cover rounded-2xl bg-gray-800"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {selectedMember.name}
                  </h3>
                  <p className="text-blue-400 font-medium">
                    {selectedMember.position}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-white">소개</h4>
                <p className="text-gray-300 whitespace-pre-line">
                  {selectedMember.fullBio}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-white">주요 경력</h4>
                <ul className="space-y-2">
                  {selectedMember.experience.map((exp, index) => (
                    <li
                      key={index}
                      className="text-gray-300 flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
