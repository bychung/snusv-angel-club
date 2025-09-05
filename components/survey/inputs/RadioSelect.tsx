'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RadioOption } from '@/types/survey';

interface RadioSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function RadioSelect({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
  required = false,
}: RadioSelectProps) {
  return (
    <div className="space-y-4">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled} className="space-y-3">
        {options.map(option => (
          <div
            key={option.value}
            className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value} className="flex-1 cursor-pointer font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
