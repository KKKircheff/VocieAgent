import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant'> {
  variant?: 'purple-pink' | 'green' | 'red' | 'ghost';
}

/**
 * Gradient button component that wraps shadcn Button with custom gradient styles.
 * Preserves the original UI design's beautiful gradient effects.
 *
 * Variants:
 * - purple-pink: Purple to pink gradient (primary action)
 * - green: Solid green (start recording)
 * - red: Solid red with pulse (stop recording)
 * - ghost: Semi-transparent with border (secondary action)
 */
export function GradientButton({
  variant = 'purple-pink',
  className,
  children,
  ...props
}: GradientButtonProps) {
  const variantStyles = {
    'purple-pink':
      'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0',
    green: 'bg-green-500 hover:bg-green-600 text-white border-0',
    red: 'bg-red-500 hover:bg-red-600 text-white border-0 animate-pulse',
    ghost:
      'bg-white/10 hover:bg-white/20 text-white border border-white/30',
  };

  return (
    <Button
      className={cn(
        'rounded-full px-8 py-4 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
