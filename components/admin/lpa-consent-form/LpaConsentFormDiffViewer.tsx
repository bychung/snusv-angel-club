'use client';

import type { LpaConsentFormDiff } from '@/types/assemblies';
import { AlertCircle } from 'lucide-react';

interface LpaConsentFormDiffViewerProps {
  diff: LpaConsentFormDiff;
}

export default function LpaConsentFormDiffViewer({
  diff,
}: LpaConsentFormDiffViewerProps) {
  if (!diff.hasChanges) {
    return null;
  }

  return (
    <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <h4 className="font-semibold text-yellow-900">변경사항</h4>
      </div>

      <div className="space-y-2 text-sm">
        {/* 조합원 추가 */}
        {diff.contextChanges?.lpMembersAdded &&
          diff.contextChanges.lpMembersAdded.length > 0 && (
            <div>
              <span className="font-medium text-green-700">
                추가된 조합원:{' '}
              </span>
              <span className="text-gray-700">
                {diff.contextChanges.lpMembersAdded.join(', ')}
              </span>
            </div>
          )}

        {/* 조합원 제거 */}
        {diff.contextChanges?.lpMembersRemoved &&
          diff.contextChanges.lpMembersRemoved.length > 0 && (
            <div>
              <span className="font-medium text-red-700">제거된 조합원: </span>
              <span className="text-gray-700">
                {diff.contextChanges.lpMembersRemoved.join(', ')}
              </span>
            </div>
          )}

        {/* 조합원 정보 수정 */}
        {diff.contextChanges?.lpMembersModified &&
          diff.contextChanges.lpMembersModified.length > 0 && (
            <div className="space-y-2">
              <span className="font-medium text-blue-700">
                수정된 조합원 정보:
              </span>
              {diff.contextChanges.lpMembersModified.map(mod => (
                <div key={mod.name} className="ml-4 space-y-1">
                  <div className="font-medium text-gray-800">{mod.name}</div>
                  {Object.entries(mod.changes).map(([field, change]) => (
                    <div key={field} className="ml-4 text-xs">
                      <span className="text-gray-600">
                        {field === 'address' && '주소'}
                        {field === 'contact' && '연락처'}
                        {field === 'shares' && '출자좌수'}
                        {field === 'birthDateOrBusinessNumber' &&
                          '생년월일/사업자번호'}
                        {field === 'ceo' && '대표이사'}
                        {field === 'entity_type' && '엔티티 타입'}
                        {field === 'business_number' && '사업자번호'}
                        {field === 'birth_date' && '생년월일'}
                        {field === 'email' && '이메일'}
                        {field === 'phone' && '연락처'}
                        {field === 'name' && '이름'}:
                      </span>
                      <span className="text-gray-500 line-through ml-1">
                        {change.old || '없음'}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="text-blue-600 font-medium">
                        {change.new}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

        {/* GP 리스트 변경 */}
        {diff.contextChanges?.gpListChanged && (
          <div className="space-y-1">
            <span className="font-medium text-blue-700">
              업무집행조합원 변경:
            </span>
            <div className="ml-4 text-xs">
              <span className="text-gray-500 line-through">
                {diff.contextChanges.gpListChanged.old}
              </span>
              <span className="mx-1">→</span>
              <span className="text-blue-600 font-medium">
                {diff.contextChanges.gpListChanged.new}
              </span>
            </div>
          </div>
        )}

        {/* 템플릿 버전 변경 */}
        {diff.templateChanges?.versionChanged && (
          <div className="flex gap-2">
            <span className="font-medium text-purple-700">
              템플릿 업데이트:
            </span>
            <span className="text-gray-700">
              v{diff.templateChanges.versionChanged.old} →{' '}
              <span className="text-purple-600 font-medium">
                v{diff.templateChanges.versionChanged.new}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
