'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function PhoneInput({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
}: PhoneInputProps) {
  const [part1, setPart1] = useState('010'); // 기본값 010
  const [part2, setPart2] = useState('');
  const [part3, setPart3] = useState('');

  // value를 파싱해서 3개 파트로 분리 (010-xxxx-xxxx)
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setPart1(parts[0] || '010');
        setPart2(parts[1] || '');
        setPart3(parts[2] || '');
      } else {
        // 하이픈 없이 입력된 경우 처리
        const cleanValue = value.replace(/-/g, '');
        if (cleanValue.length >= 3) {
          setPart1(cleanValue.substring(0, 3));
        }
        if (cleanValue.length >= 7) {
          setPart2(cleanValue.substring(3, 7));
        }
        if (cleanValue.length >= 8) {
          setPart3(cleanValue.substring(7, 11));
        }
      }
    }
  }, [value]);

  // 3개 파트가 변경될 때 합쳐서 onChange 호출 (실제 변경시에만 업데이트)
  useEffect(() => {
    let nextVal = value;
    if (part1 && part2 && part3) {
      nextVal = `${part1}-${part2}-${part3}`;
    } else if (part1 || part2 || part3) {
      // 부분적으로만 입력된 경우에도 저장
      let formatted = part1 || '';
      if (part2) formatted += `-${part2}`;
      if (part3) formatted += `-${part3}`;
      nextVal = formatted;
    } else if (part1 === '010' && !part2 && !part3) {
      // 초기 상태
      nextVal = '';
    }

    if (nextVal !== value) {
      onChange(nextVal);
    }
  }, [part1, part2, part3, value]);

  const handlePart1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPart1(e.target.value);
  };

  const handlePart2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,4}$/.test(val)) {
      setPart2(val);
      if (val.length === 4) {
        // 자동으로 다음 필드로 포커스 이동
        const nextInput = document.getElementById('phone-part3');
        nextInput?.focus();
      }
    }
  };

  const handlePart3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d{0,4}$/.test(val)) {
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
        <select
          value={part1}
          onChange={handlePart1Change}
          disabled={disabled}
          className={`px-3 py-2 border rounded-md bg-background ${
            error ? 'border-red-500' : 'border-input'
          }`}
        >
          <option value="010">010</option>
          <option value="011">011</option>
          <option value="016">016</option>
          <option value="017">017</option>
          <option value="018">018</option>
          <option value="019">019</option>
          <option value="02">02</option>
          <option value="031">031</option>
          <option value="032">032</option>
          <option value="033">033</option>
          <option value="041">041</option>
          <option value="042">042</option>
          <option value="043">043</option>
          <option value="044">044</option>
          <option value="051">051</option>
          <option value="052">052</option>
          <option value="053">053</option>
          <option value="054">054</option>
          <option value="055">055</option>
          <option value="061">061</option>
          <option value="062">062</option>
          <option value="063">063</option>
          <option value="064">064</option>
          <option value="070">070</option>
        </select>
        <span>-</span>

        <Input
          id="phone-part2"
          type="text"
          value={part2}
          onChange={handlePart2Change}
          placeholder="0000"
          disabled={disabled}
          maxLength={4}
          className={`w-24 text-center ${error ? 'border-red-500' : ''}`}
        />
        <span>-</span>

        <Input
          id="phone-part3"
          type="text"
          value={part3}
          onChange={handlePart3Change}
          placeholder="0000"
          disabled={disabled}
          maxLength={4}
          className={`w-24 text-center ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
