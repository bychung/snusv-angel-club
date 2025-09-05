'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

interface BirthDateInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function BirthDateInput({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: BirthDateInputProps) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  // value를 파싱해서 year, month, day로 분리
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setYear(parts[0]);
        setMonth(parts[1]);
        setDay(parts[2]);
      }
    }
  }, [value]);

  // year, month, day가 변경될 때 합쳐서 onChange 호출
  useEffect(() => {
    if (year && month && day) {
      // 유효한 날짜인지 검증
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);

      if (
        yearNum >= 1900 &&
        yearNum <= new Date().getFullYear() &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        dayNum >= 1 &&
        dayNum <= 31
      ) {
        const formattedMonth = month.padStart(2, '0');
        const formattedDay = day.padStart(2, '0');
        onChange(`${year}-${formattedMonth}-${formattedDay}`);
      }
    } else if (!year && !month && !day) {
      onChange('');
    }
  }, [year, month, day]);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,4}$/.test(val)) {
      setYear(val);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (/^\d{0,2}$/.test(val) && parseInt(val, 10) <= 12)) {
      setMonth(val);
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (/^\d{0,2}$/.test(val) && parseInt(val, 10) <= 31)) {
      setDay(val);
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
        <div className="flex-1">
          <Input
            type="text"
            value={year}
            onChange={handleYearChange}
            placeholder="YYYY"
            disabled={disabled}
            maxLength={4}
            className={`w-full text-center ${error ? 'border-red-500' : ''}`}
          />
        </div>
        <span>년</span>

        <div className="w-20">
          <Input
            type="text"
            value={month}
            onChange={handleMonthChange}
            placeholder="MM"
            disabled={disabled}
            maxLength={2}
            className={`w-full text-center ${error ? 'border-red-500' : ''}`}
          />
        </div>
        <span>월</span>

        <div className="w-20">
          <Input
            type="text"
            value={day}
            onChange={handleDayChange}
            placeholder="DD"
            disabled={disabled}
            maxLength={2}
            className={`w-full text-center ${error ? 'border-red-500' : ''}`}
          />
        </div>
        <span>일</span>
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
