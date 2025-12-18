import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GradientCardProps extends React.ComponentProps<typeof Card> {
    variant?: 'glass' | 'gradient';
}

export function GradientCard({ variant = 'glass', children, className, ...props }: GradientCardProps) {
    const variantStyles = {
        glass: 'bg-white/10 backdrop-blur-lg border border-white/20',
        gradient: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-0'
    };

    return (
        <Card
            className={cn(
                'rounded-2xl shadow-2xl',
                variantStyles[variant],
                className
            )}
            {...props}
        >
            <CardContent className="p-8">{children}</CardContent>
        </Card>
    );
}
