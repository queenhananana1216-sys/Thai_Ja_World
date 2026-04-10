'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  children?: ReactNode;
};

export function AuthFormField({
  id,
  label,
  type = 'text',
  placeholder,
  required,
  error,
  value,
  onChange,
  className,
  children,
}: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-medium text-tj-ink">
        {label}
        {required && <span className="ml-0.5 text-museum-coral">*</span>}
      </Label>
      {children ?? (
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          className={cn(
            'border-gray-300 bg-white focus:border-museum-coral focus:ring-museum-coral/20',
            error && 'border-museum-coral'
          )}
        />
      )}
      {error && <p className="text-xs text-museum-coral">{error}</p>}
    </div>
  );
}
