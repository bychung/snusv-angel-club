'use client';

import BlynxLabChatWidget from '@/components/external/BlynxLabChatWidget';
import AngelInquiryModal from '@/components/modals/AngelInquiryModal';
import IRInquiryModal from '@/components/modals/IRInquiryModal';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight,
  ExternalLink,
  Handshake,
  Home,
  Mail,
  Sparkles,
  Target,
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

interface RegularMember {
  name: string;
  position: string;
  image: string;
  bio: string;
}

interface Portfolio {
  name: string;
  logo: string;
  website: string;
  description: string;
  category: string;
}

interface Partner {
  name: string;
  logo: string;
  description: string;
  features: string[];
  members: string[];
}

const executiveMembers: ExecutiveMember[] = [
  {
    id: 'executive',
    name: '조세원',
    position: 'SNUSV ANGEL CLUB 회장',
    image: '/members/chosewon.png',
    shortBio: '스터디맥스 대표이사 (SNUSV 3기)',
    fullBio:
      '연쇄창업가로서 일본, 중국, 미국 등 글로벌 비지니스 경험 및 엔젤투자자로서 스타트업 투자/밸류업, 엑싯 경험이 다수 있습니다.',
    experience: ['서울대학교 컴퓨터공학부 졸업', '이투스에듀(주) 창업'],
  },
  {
    id: 'cofounder1',
    name: '김후성',
    position: 'SNUSV ANGEL CLUB 코파운더',
    image: '/members/kimhoosung.png',
    shortBio: '제브라투자자문 이사 (SNUSV 3기)',
    fullBio: '내용을 채워주세요',
    experience: [
      '서울대학교 경영학과 졸업',
      '컬럼비아대학교 MBA',
      '삼일회계법인',
      '한국씨티은행 WM리서치',
    ],
  },
  {
    id: 'cofounder2',
    name: '곽준영',
    position: 'SNUSV ANGEL CLUB 코파운더',
    image: '/members/kwakjuneyoung.png',
    shortBio: '법무법인 WAVE 대표변호사',
    fullBio:
      '변호사 업무 이외에도 다수 개인투자조합 GP로 활동할 뿐 아니라, 다수 스타트업/중소/중견기업 자문을 하며 기업에 대한 이해가 높고 도움을 드리고 있습니다.',
    experience: [
      '고려대학교 법학대학 졸업',
      'EY한영회계법인',
      '법무특허법인 다래 등 대형 로펌 근무',
      'IBK기업은행 미래성장성 심의위원',
    ],
  },
  {
    id: 'board1',
    name: '조재유',
    position: 'SNUSV ANGEL CLUB 운영진',
    image: '/members/chojaeyoo.png',
    shortBio: '블링스 대표이사 (SNUSV 2기)',
    fullBio:
      '초기기업 투자부터 상장기업 M&A 투자실무를 모두 총괄해 본 경험이 있는 베테랑 투자 전문가입니다.',
    experience: [
      '서울대학교 전기공학부 졸업',
      '넥슨, 라인, SK텔레콤 사업 개발',
      'Bain&Company',
      '라인게임즈 일본법인장',
    ],
  },
  {
    id: 'board2',
    name: '이상욱',
    position: 'SNUSV ANGEL CLUB 운영진',
    image: '/members/leesangwook.png',
    shortBio: '네오위즈 사업실장 (SNUSV 4기)',
    fullBio:
      '게임/겜블/블록체인 전문가로서 신규 사업 개발 및 검토를 주로 하고 있습니다.',
    experience: ['서울대학교 동물생명공학부 졸업'],
  },
  {
    id: 'gp',
    name: '정보영',
    position: 'SNUSV ANGEL CLUB 펀드 전담 운용사',
    image: '/members/chungboyoung.png',
    shortBio: '프로펠벤처스, 델타인베스트먼트 대표이사',
    fullBio:
      'LP, GP를 모두 경험하였고 다수의 엔젤투자를 진행해 본 경험이 있습니다. 과거에는 개발자로서 업무를 한 적이 있으며 현재도 투자와 AI개발을 병행하고 있습니다.',
    experience: [
      '서울대학교 컴퓨터공학부 졸업',
      '한국벤처투자',
      '지앤텍벤처투자',
      '루트벤처스',
    ],
  },
];

const regularMembers: RegularMember[] = [
  {
    name: '이멤버',
    position: '투자위원',
    image: '/placeholder.svg?height=150&width=150',
    bio: '핀테크 전문가',
  },
  {
    name: '최멤버',
    position: '투자위원',
    image: '/placeholder.svg?height=150&width=150',
    bio: '헬스케어 전문가',
  },
  {
    name: '정멤버',
    position: '투자위원',
    image: '/placeholder.svg?height=150&width=150',
    bio: '커머스 전문가',
  },
  {
    name: '한멤버',
    position: '투자위원',
    image: '/placeholder.svg?height=150&width=150',
    bio: '모빌리티 전문가',
  },
];

const portfolios: Portfolio[] = [
  {
    name: '테이밍랩',
    logo: '/logos/taminglab.svg',
    website: 'https://what-time.kr/',
    description: '중고 명품시계 커머스',
    category: 'Commerce',
  },
  {
    name: '앱빌챗',
    logo: '/logos/appbuildchat.webp',
    website: 'https://www.appbuildchat.com/',
    description: 'AI를 활용한 앱 빌드 SaaS',
    category: 'AI',
  },
  {
    name: '블리츠다이나믹스',
    logo: '/logos/blitz.png',
    website: 'https://team.blitz-dynamics.com/',
    description: 'AI로 외식 기업을 혁신',
    category: 'AI Food Tech',
  },
  {
    name: '어보브테크',
    logo: '/logos/abovetech.png',
    website: 'https://www.abovetech.io/',
    description: 'AI 기반 컴패니언 서비스',
    category: 'AI Companion',
  },
  {
    name: '네플라',
    logo: '/logos/nepla.svg',
    website: 'https://www.nepla.ai/',
    description: 'AI 기반의 법률 정보 검색, 지원 도구 및 마케팅 서비스',
    category: 'AI Legal Tech',
  },
];

const partners: Partner[] = [
  {
    name: '프로펠벤처스(주)',
    logo: '/logos/propel.jpg',
    description:
      '프로펠벤처스는 컴퍼니빌더 및 액셀러레이터로서 투자기업들이 성장하기 위한 모든 부분에 대하여 지원합니다.',
    features: ['액셀러레이터', '컴퍼니빌더', '개인투자조합을 통한 투자'],
    members: [
      '정보영 대표 (컴퍼니빌딩/액셀러레이팅 담당)',
      '곽준영 대표 (관리 총괄 담당)',
      '김동욱 상무 (투자 심사 담당)',
    ],
  },
];

export default function HomePage() {
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
    { id: 'members', label: 'Members', icon: Users },
    { id: 'portfolios', label: 'Portfolios', icon: Target },
    { id: 'partners', label: 'Partners', icon: Handshake },
    { id: 'withus', label: 'With Us', icon: Mail },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      const sections = ['home', 'members', 'portfolios', 'partners', 'withus'];
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white overflow-x-hidden">
      <BlynxLabChatWidget slug="3um3" />
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
      <nav className="fixed right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-50">
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
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/25'
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
          className="min-h-screen flex items-center justify-center px-8 relative overflow-hidden"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="mb-12">
              <h1 className="text-7xl md:text-8xl font-bold mb-8 leading-tight">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  SNUSV
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                  ANGEL CLUB
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto">
                서울대학교 학생 벤처 네트워크 동아리(SNUSV) Alumni 기반의
                엔젤클럽으로,
                <br />
                후배 스타트업을 지원하며 함께 미래를 만들어가는 투자 생태계를
                구축합니다.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              {[
                {
                  icon: TrendingUp,
                  title: '전문적 투자',
                  description:
                    '전문 심사역 및 성공한 창업가의 경험을 바탕으로 한 전문적인 투자 심사',
                  gradient: 'from-cyan-500 to-blue-500',
                },
                {
                  icon: Users,
                  title: '네트워크 지원',
                  description:
                    'SNUSV 선배 창업가 및 업계 전문가들의 멘토링 제공',
                  gradient: 'from-purple-500 to-pink-500',
                },
                {
                  icon: Target,
                  title: '성장 파트너',
                  description:
                    '단순 투자를 넘어 스타트업의 지속적인 성장을 함께하는 파트너',
                  gradient: 'from-pink-500 to-cyan-500',
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

        {/* Members Section */}
        <section id="members" className="min-h-screen py-20 px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Our Team
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                다양한 분야의 전문가들이 함께하는 투자 전문팀
              </p>
            </div>

            {/* Executive Members */}
            <div className="mb-20">
              <h3 className="text-3xl font-semibold mb-12 text-center text-white">
                운영진
              </h3>
              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {executiveMembers.map(member => (
                  <Card
                    key={member.id}
                    className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 cursor-pointer group"
                    onClick={() => setSelectedMember(member)}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="relative mb-6">
                        <div className="w-44 h-44 mx-auto rounded-2xl overflow-hidden bg-gradient-to-r from-cyan-500 to-purple-500 p-1">
                          <img
                            src={member.image || '/placeholder.svg'}
                            alt={member.name}
                            className="w-full h-full object-cover rounded-2xl bg-gray-800"
                          />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <h4 className="text-xl font-semibold mb-2 text-white">
                        {member.name}
                      </h4>
                      <p className="text-cyan-400 font-medium mb-3">
                        {member.position}
                      </p>
                      <p className="text-gray-300 text-sm mb-4">
                        {member.shortBio}
                      </p>
                      <Button
                        variant="ghost"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 group-hover:translate-x-1 transition-all"
                      >
                        자세히 보기 <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Regular Members */}
            <div>
              <h3 className="text-3xl font-semibold mb-12 text-center text-white">
                주요 엔젤클럽 구성원
              </h3>
              <div className="grid md:grid-cols-4 gap-6">
                {regularMembers.map((member, index) => (
                  <Card
                    key={index}
                    className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden bg-gradient-to-r from-gray-600 to-gray-700 p-1">
                        <img
                          src={member.image || '/placeholder.svg'}
                          alt={member.name}
                          className="w-full h-full object-cover rounded-xl bg-gray-800"
                        />
                      </div>
                      <h4 className="font-semibold mb-1 text-white">
                        {member.name}
                      </h4>
                      <p className="text-gray-400 text-sm mb-1">
                        {member.position}
                      </p>
                      <p className="text-gray-500 text-xs">{member.bio}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Portfolios Section */}
        <section id="portfolios" className="min-h-screen py-20 px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent"></div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Our Portfolios
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                함께 성장하고 있는 혁신적인 스타트업들
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {portfolios.map((portfolio, index) => (
                <Card
                  key={index}
                  className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 cursor-pointer group"
                  onClick={() => window.open(portfolio.website, '_blank')}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center h-20 mb-6 bg-white/10 rounded-xl">
                      <img
                        src={portfolio.logo || '/placeholder.svg'}
                        alt={portfolio.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg text-white">
                        {portfolio.name}
                      </h4>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="mb-4 bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                    >
                      {portfolio.category}
                    </Badge>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {portfolio.description}
                    </p>
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
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Our Partners
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                함께하는 파트너 기관들과의 협력으로 더 큰 가치를 창출합니다
              </p>
            </div>

            {partners.map((partner, index) => (
              <Card
                key={index}
                className="bg-white/5 backdrop-blur-sm border-white/10 mb-8 hover:bg-white/10 transition-all duration-300"
              >
                <CardContent className="p-12">
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                      <div className="flex items-center justify-center h-64 mb-8 bg-white/3 rounded-xl">
                        <img
                          src={partner.logo || '/placeholder.svg'}
                          alt={partner.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <h3 className="text-3xl font-bold mb-6 text-white">
                        {partner.name}
                      </h3>
                      <p className="text-gray-300 leading-relaxed text-lg">
                        {partner.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xl font-semibold mb-6 text-white">
                        주요 특징
                      </h4>
                      <ul className="space-y-4 mb-8">
                        {partner.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"></div>
                            <span className="text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <h4 className="text-xl font-semibold mb-6 text-white">
                        구성원
                      </h4>
                      <div className="space-y-3">
                        {partner.members.map((member, idx) => (
                          <div
                            key={idx}
                            className="text-gray-300 bg-white/5 rounded-lg px-4 py-2 border border-white/10"
                          >
                            {member}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* With Us Section */}
        <section
          id="withus"
          className="min-h-screen py-20 px-8 relative overflow-hidden pb-24"
        >
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-black/50 to-black"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              함께 미래를 만들어가요
            </h2>
            <p className="text-xl mb-16 text-gray-300 leading-relaxed">
              혁신적인 아이디어와 열정을 가진 스타트업, 그리고 함께 투자하고
              싶은 파트너를 찾습니다.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    스타트업 IR
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    혁신적인 기술과 비즈니스 모델을 가진 초기 스타트업의 IR을
                    기다립니다.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                    onClick={() => setIsIRModalOpen(true)}
                  >
                    IR 문의하기
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Handshake className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4 text-white">
                    엔젤클럽 가입
                  </h3>
                  <p className="mb-6 text-gray-300 leading-relaxed">
                    함께 스타트업 생태계에 투자하고 성장시킬 클럽원을
                    모집합니다.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
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
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <a
                  href="mailto:snusv@angel-club.kr"
                  className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  snusv@angel-club.kr
                </a>
              </div>
              <p className="text-gray-300 leading-relaxed">
                언제든지 연락주세요. 함께 혁신의 여정을 시작해보겠습니다.
              </p>
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
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-r from-cyan-500 to-purple-500 p-1 flex-shrink-0">
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
                  <p className="text-cyan-400 font-medium">
                    {selectedMember.position}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-white">소개</h4>
                <p className="text-gray-300">{selectedMember.fullBio}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-white">주요 경력</h4>
                <ul className="space-y-2">
                  {selectedMember.experience.map((exp, index) => (
                    <li
                      key={index}
                      className="text-gray-300 flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                      {exp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Bottom CTA Button */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <Link href="/survey?fund_id=550e8400-e29b-41d4-a716-446655440000">
          <Button
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-2xl shadow-cyan-500/30 backdrop-blur-sm px-8 py-4 text-base font-semibold rounded-full hover:scale-105 transition-all duration-300"
          >
            SNUSV 2호 펀드 출자 신청하기
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </div>

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
