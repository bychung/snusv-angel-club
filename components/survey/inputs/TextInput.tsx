'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
}

export default function TextInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
  required = false,
  maxLength,
}: TextInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="text-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        id="text-input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className={`w-full ${error ? 'border-red-500' : ''}`}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
