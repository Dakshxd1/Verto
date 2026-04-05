import React from 'react';
import { cn } from '../../lib/utils';

const Badge = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    secondary: 'bg-gray-100 text-gray-700 border-gray-200',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    outline: 'text-gray-600 border-gray-300 bg-white',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Badge;