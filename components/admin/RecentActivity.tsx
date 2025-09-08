'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Activity, Clock, Edit, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  type: 'signup' | 'profile_update' | 'investment_update';
  user_name: string;
  user_email: string;
  timestamp: string;
  details?: string;
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const supabase = createClient();

      // 최근 프로필 생성/업데이트 활동
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, created_at, updated_at, user_id')
        .order('updated_at', { ascending: false })
        .limit(10);

      // 최근 펀드 멤버 업데이트
      const { data: fundMembers } = await supabase
        .from('fund_members')
        .select(
          `
          id, 
          investment_units, 
          created_at, 
          updated_at,
          profiles (
            name,
            email
          )
        `
        )
        .order('updated_at', { ascending: false })
        .limit(10);

      const activityList: ActivityItem[] = [];

      // 프로필 활동 추가
      profiles?.forEach(profile => {
        // 회원가입 활동 (user_id가 있고 created_at과 updated_at이 비슷한 경우)
        const isNewSignup =
          profile.user_id &&
          Math.abs(
            new Date(profile.created_at).getTime() - new Date(profile.updated_at).getTime()
          ) < 60000;

        if (isNewSignup) {
          activityList.push({
            id: `signup-${profile.id}`,
            type: 'signup',
            user_name: profile.name,
            user_email: profile.email,
            timestamp: profile.updated_at,
            details: '회원가입 완료',
          });
        } else if (profile.created_at !== profile.updated_at) {
          activityList.push({
            id: `profile-${profile.id}`,
            type: 'profile_update',
            user_name: profile.name,
            user_email: profile.email,
            timestamp: profile.updated_at,
            details: '프로필 정보 수정',
          });
        }
      });

      // 펀드 멤버 활동 추가
      fundMembers?.forEach(member => {
        if (member.created_at !== member.updated_at) {
          activityList.push({
            id: `fund-${member.id}`,
            type: 'investment_update',
            user_name: (member.profiles as any)?.name || 'Unknown',
            user_email: (member.profiles as any)?.email || 'unknown@email.com',
            timestamp: member.updated_at,
            details: `출자좌수 변경: ${member.investment_units}좌`,
          });
        }
      });

      // 시간순 정렬
      activityList.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(activityList.slice(0, 8));
    } catch (error) {
      console.error('최근 활동 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'profile_update':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'investment_update':
        return <Activity className="h-4 w-4 text-purple-600" />;
    }
  };

  const getActivityTitle = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup':
        return '새 회원가입';
      case 'profile_update':
        return '프로필 수정';
      case 'investment_update':
        return '출자정보 수정';
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}일 전`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          최근 활동
        </CardTitle>
        <CardDescription>사용자들의 최근 활동 내역입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">최근 활동이 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {getActivityTitle(activity.type)}
                    </p>
                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {activity.user_name} ({activity.user_email})
                  </p>
                  {activity.details && (
                    <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
