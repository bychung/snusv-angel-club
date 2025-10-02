import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { ActivityItem } from '@/lib/admin/dashboard';
import {
  Activity,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  onDeleteClick?: (activity: ActivityItem) => void;
}

export default function RecentActivity({
  activities,
  isLoading = false,
  onDeleteClick,
}: RecentActivityProps) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'signup':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'profile_update':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'investment_update':
        return <Activity className="h-4 w-4 text-purple-600" />;
      case 'fund_application':
        return <DollarSign className="h-4 w-4 text-yellow-600" />;
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
    const diffInHours = Math.floor(
      (now.getTime() - time.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(
        (now.getTime() - time.getTime()) / (1000 * 60)
      );
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
              <div
                key={i}
                className="animate-pulse flex items-center space-x-3"
              >
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            최근 활동이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 group"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {getActivityTitle(activity.type)}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatTime(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {activity.user_name} ({activity.user_email})
                  </p>
                  {activity.details && (
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.details}
                      {activity.updated_by_name && (
                        <span className="ml-2 text-blue-600">
                          (수정자: {activity.updated_by_name})
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {onDeleteClick && (
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteClick(activity)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
