'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

interface EmailInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function EmailInput({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: EmailInputProps) {
  const [isValidEmail, setIsValidEmail] = useState(true);

  // 이메일 유효성 검사
  useEffect(() => {
    if (value) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      setIsValidEmail(emailRegex.test(value));
    } else {
      setIsValidEmail(true); // 빈 값은 유효한 것으로 처리
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="email-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        id="email-input"
        type="email"
        value={value}
        onChange={handleChange}
        placeholder="example@email.com"
        disabled={disabled}
        className={`w-full ${error || (!isValidEmail && value) ? 'border-red-500' : ''}`}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      {!error && !isValidEmail && value && (
        <p className="text-sm text-red-500 mt-1">올바른 이메일 형식이 아닙니다.</p>
      )}
    </div>
  );
}
