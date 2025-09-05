'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumberInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  min,
  max,
  step = 1,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(0);
    } else {
      const numValue = parseInt(val, 10);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="number-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        id="number-input"
        type="number"
        value={value === 0 ? '' : value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`w-full ${error ? 'border-red-500' : ''}`}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
