'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

interface CorporateRegistrationInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function CorporateRegistrationInput({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: CorporateRegistrationInputProps) {
  const [part1, setPart1] = useState('');
  const [part2, setPart2] = useState('');

  // value를 파싱해서 2개 파트로 분리 (xxxxxx-xxxxxxx)
  useEffect(() => {
    if (value) {
      const cleanValue = value.replace(/-/g, '');
      if (cleanValue.length >= 6) {
        setPart1(cleanValue.substring(0, 6));
      }
      if (cleanValue.length >= 7) {
        setPart2(cleanValue.substring(6, 13));
      }
    } else {
      setPart1('');
      setPart2('');
    }
  }, [value]);

  // 2개 파트가 변경될 때 합쳐서 onChange 호출 (실제 변경시에만 업데이트)
  useEffect(() => {
    let nextVal = value;
    if (part1 || part2) {
      const combined = `${part1}${part2}`;
      if (combined.length === 13) {
        nextVal = `${part1}-${part2}`;
      } else if (combined.length > 0) {
        // 부분적으로만 입력된 경우에도 저장
        let formatted = part1;
        if (part2) formatted += `-${part2}`;
        nextVal = formatted;
      }
    } else {
      nextVal = '';
    }

    if (nextVal !== value) {
      onChange(nextVal);
    }
  }, [part1, part2, value, onChange]);

  const handlePart1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,6}$/.test(val)) {
      setPart1(val);
      if (val.length === 6) {
        // 자동으로 다음 필드로 포커스 이동
        const nextInput = document.getElementById('corporate-part2');
        nextInput?.focus();
      }
    }
  };

  const handlePart2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,7}$/.test(val)) {
      setPart2(val);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex gap-2 items-center">
        <Input
          id="corporate-part1"
          type="text"
          value={part1}
          onChange={handlePart1Change}
          placeholder="000000"
          disabled={disabled}
          maxLength={6}
          className={`w-24 text-center ${error ? 'border-red-500' : ''}`}
        />
        <span>-</span>

        <Input
          id="corporate-part2"
          type="text"
          value={part2}
          onChange={handlePart2Change}
          placeholder="0000000"
          disabled={disabled}
          maxLength={7}
          className={`w-28 text-center ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
