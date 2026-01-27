import React from 'react'
import { cn } from '@/lib/utils'
import { VariantProps, cva } from "class-variance-authority";

const buttonVariants = cva(
    "relative group border text-foreground mx-auto text-center rounded-full transition-all duration-300",
    {
        variants: {
            variant: {
                default: "bg-primary/10 hover:bg-primary/5 border-primary/20 text-primary",
                solid: "bg-primary hover:bg-primary/90 text-primary-foreground border-transparent shadow-glow shadow-primary/20",
                ghost: "border-transparent bg-transparent hover:border-border hover:bg-white/5",
                outline: "bg-transparent border-border hover:border-primary/50 hover:bg-primary/5",
            },
            size: {
                default: "px-7 py-2",
                sm: "px-4 py-1.5 text-xs",
                lg: "px-10 py-3 text-lg font-bold",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { neon?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, neon = true, size, variant, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size }), className)}
                ref={ref}
                {...props}
            >
                <span className={cn("absolute h-px opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out inset-x-0 -top-px bg-gradient-to-r w-3/4 mx-auto from-transparent via-primary to-transparent hidden", neon && "block")} />
                {children}
                <span className={cn("absolute group-hover:opacity-30 transition-all duration-500 ease-in-out inset-x-0 h-px -bottom-px bg-gradient-to-r w-3/4 mx-auto from-transparent via-primary to-transparent hidden", neon && "block")} />
            </button>
        );
    }
)

Button.displayName = 'Button';

export { Button, buttonVariants };
