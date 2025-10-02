'use client';

import type { ActivityItem } from '@/lib/admin/dashboard';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DeleteActivityModal from './DeleteActivityModal';
import RecentActivity from './RecentActivity';

interface RecentActivityClientProps {
  initialActivities: ActivityItem[];
}

export default function RecentActivityClient({
  initialActivities,
}: RecentActivityClientProps) {
  const router = useRouter();
  const [activityToDelete, setActivityToDelete] = useState<ActivityItem | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (activity: ActivityItem) => {
    setActivityToDelete(activity);
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/activity-changes/${activityToDelete.source}/${activityToDelete.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }

      alert('활동 내역이 삭제되었습니다.');
      setActivityToDelete(null);
      router.refresh(); // 페이지 새로고침
    } catch (error) {
      console.error('활동 내역 삭제 실패:', error);
      alert(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <RecentActivity
        activities={initialActivities}
        onDeleteClick={handleDeleteClick}
      />
      <DeleteActivityModal
        isOpen={!!activityToDelete}
        onClose={() => setActivityToDelete(null)}
        activity={activityToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </>
  );
}
