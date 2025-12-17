import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GradientCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode;
}

/**
 * Glassmorphic card component that wraps shadcn Card with frosted glass effect.
 * Preserves the original UI design's beautiful translucent backdrop styling.
 *
 * Features:
 * - Semi-transparent white background (white/10)
 * - Backdrop blur for glassmorphic effect
 * - Subtle border with transparency
 * - Large shadow for depth
 * - Rounded corners (2xl)
 */
export function GradientCard({ children, className, ...props }: GradientCardProps) {
  return (
    <Card
      className={cn(
        'bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20',
        className
      )}
      {...props}
    >
      <CardContent className="p-8">{children}</CardContent>
    </Card>
  );
}
