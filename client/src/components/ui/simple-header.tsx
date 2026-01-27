'use client';

import React from 'react';
import { Ticket } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { MenuToggle } from '@/components/ui/menu-toggle';
import { useLocation } from 'wouter';

export function SimpleHeader() {
    const [open, setOpen] = React.useState(false);
    const [, setLocation] = useLocation();

    const links = [
        {
            label: 'Features',
            href: '#features',
        },
        {
            label: 'How It Works',
            href: '#how-it-works',
        },
        {
            label: 'Technology',
            href: '#technology',
        },
    ];

    return (
        <header className="bg-background/95 sticky top-0 z-50 w-full border-b border-border backdrop-blur-xl">
            <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setLocation('/')}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative bg-primary/20 border border-primary/30 p-2 rounded-xl shadow-glow shadow-primary/10">
                            <Ticket className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold font-bitcount leading-tight tracking-normal">
                            <span className="text-white">BLOCK</span>
                            <span className="text-primary">TIX</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Blockchain Network</p>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden items-center gap-4 lg:flex">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors px-4"
                            href={link.href}
                        >
                            {link.label}
                        </a>
                    ))}
                    <Button
                        variant="ghost"
                        className="text-xs font-bold uppercase tracking-widest text-white border border-border bg-card hover:bg-muted"
                        onClick={() => setLocation('/login')}
                    >
                        Login
                    </Button>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-widest px-6 shadow-glow shadow-primary/20"
                        onClick={() => setLocation('/signup')}
                    >
                        Get Started
                    </Button>
                </div>

                {/* Mobile Navigation */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <Button size="icon" variant="outline" className="lg:hidden border-border bg-card">
                        <MenuToggle
                            strokeWidth={2.5}
                            open={open}
                            onOpenChange={setOpen}
                            className="size-6 text-primary"
                        />
                    </Button>
                    <SheetContent
                        className="bg-background border-border gap-0 backdrop-blur-xl"
                        showClose={false}
                        side="left"
                    >
                        <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                            {/* Mobile Logo */}
                            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border">
                                <div className="bg-primary/20 p-2 rounded-xl border border-primary/30">
                                    <Ticket className="h-6 w-6 text-primary" />
                                </div>
                                <h1 className="text-2xl font-semibold font-bitcount tracking-normal">
                                    <span className="text-white">BLOCK</span>
                                    <span className="text-primary">TIX</span>
                                </h1>
                            </div>

                            {links.map((link) => (
                                <a
                                    key={link.label}
                                    className="px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all border-l border-transparent hover:border-primary hover:bg-primary/5"
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <SheetFooter className="border-t border-border bg-card p-6 gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 text-xs font-bold uppercase tracking-widest border-border bg-background"
                                onClick={() => { setLocation('/login'); setOpen(false); }}
                            >
                                Login
                            </Button>
                            <Button
                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-widest shadow-glow shadow-primary/20"
                                onClick={() => { setLocation('/signup'); setOpen(false); }}
                            >
                                Get Started
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </nav>
        </header>
    );
}
