import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

const CardHeader = ({ className, children }) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)}>
    {children}
  </div>
);

const CardTitle = ({ className, children }) => (
  <h3 className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900', className)}>
    {children}
  </h3>
);

const CardDescription = ({ className, children }) => (
  <p className={cn('text-sm text-gray-500', className)}>
    {children}
  </p>
);

const CardContent = ({ className, children }) => (
  <div className={cn('p-6 pt-0', className)}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;

export default Card;