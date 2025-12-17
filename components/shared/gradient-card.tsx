import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GradientCardProps extends React.ComponentProps<typeof Card> {
    children: React.ReactNode;
}

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
