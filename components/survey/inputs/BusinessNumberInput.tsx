'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

interface BusinessNumberInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function BusinessNumberInput({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: BusinessNumberInputProps) {
  const [part1, setPart1] = useState('');
  const [part2, setPart2] = useState('');
  const [part3, setPart3] = useState('');

  // value를 파싱해서 3개 파트로 분리 (xxx-xx-xxxxx)
  useEffect(() => {
    if (value) {
      const cleanValue = value.replace(/-/g, '');
      if (cleanValue.length >= 3) {
        setPart1(cleanValue.substring(0, 3));
      }
      if (cleanValue.length >= 5) {
        setPart2(cleanValue.substring(3, 5));
      }
      if (cleanValue.length >= 6) {
        setPart3(cleanValue.substring(5, 10));
      }
    }
  }, [value]);

  // 3개 파트가 변경될 때 합쳐서 onChange 호출 (실제 변경시에만 업데이트)
  useEffect(() => {
    let nextVal = value;
    if (part1 || part2 || part3) {
      const combined = `${part1}${part2}${part3}`;
      if (combined.length === 10) {
        nextVal = `${part1}-${part2}-${part3}`;
      } else if (combined.length > 0) {
        // 부분적으로만 입력된 경우에도 저장
        let formatted = part1;
        if (part2) formatted += `-${part2}`;
        if (part3) formatted += `-${part3}`;
        nextVal = formatted;
      }
    } else {
      nextVal = '';
    }

    if (nextVal !== value) {
      onChange(nextVal);
    }
  }, [part1, part2, part3, value]);

  const handlePart1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,3}$/.test(val)) {
      setPart1(val);
      if (val.length === 3) {
        // 자동으로 다음 필드로 포커스 이동
        const nextInput = document.getElementById('business-part2');
        nextInput?.focus();
      }
    }
  };

  const handlePart2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,2}$/.test(val)) {
      setPart2(val);
      if (val.length === 2) {
        // 자동으로 다음 필드로 포커스 이동
        const nextInput = document.getElementById('business-part3');
        nextInput?.focus();
      }
    }
  };

  const handlePart3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,5}$/.test(val)) {
      setPart3(val);
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
          id="business-part1"
          type="text"
          value={part1}
          onChange={handlePart1Change}
          placeholder="000"
          disabled={disabled}
          maxLength={3}
          className={`w-20 text-center ${error ? 'border-red-500' : ''}`}
        />
        <span>-</span>

        <Input
          id="business-part2"
          type="text"
          value={part2}
          onChange={handlePart2Change}
          placeholder="00"
          disabled={disabled}
          maxLength={2}
          className={`w-16 text-center ${error ? 'border-red-500' : ''}`}
        />
        <span>-</span>

        <Input
          id="business-part3"
          type="text"
          value={part3}
          onChange={handlePart3Change}
          placeholder="00000"
          disabled={disabled}
          maxLength={5}
          className={`w-24 text-center ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
