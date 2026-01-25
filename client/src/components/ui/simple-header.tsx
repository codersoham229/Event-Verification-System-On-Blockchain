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
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 w-full border-b border-slate-800/50 backdrop-blur-lg">
            <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => setLocation('/')}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-xl shadow-lg shadow-green-500/50">
                            <Ticket className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-medium font-bitcount">
                            <span className="text-white">Block</span>
                            <span className="text-green-500">Tix</span>
                        </h1>
                        <p className="text-xs text-gray-400 font-medium">Blockchain Ticketing</p>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden items-center gap-2 lg:flex">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            className={buttonVariants({ variant: 'ghost', className: 'text-gray-300 hover:text-white' })}
                            href={link.href}
                        >
                            {link.label}
                        </a>
                    ))}
                    <Button
                        variant="outline"
                        className="border-slate-700 text-white hover:bg-slate-800"
                        onClick={() => setLocation('/login')}
                    >
                        Login
                    </Button>
                    <Button
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => setLocation('/signup')}
                    >
                        Get Started
                    </Button>
                </div>

                {/* Mobile Navigation */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <Button size="icon" variant="outline" className="lg:hidden border-slate-700">
                        <MenuToggle
                            strokeWidth={2.5}
                            open={open}
                            onOpenChange={setOpen}
                            className="size-6 text-white"
                        />
                    </Button>
                    <SheetContent
                        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg border-slate-800"
                        showClose={false}
                        side="left"
                    >
                        <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                            {/* Mobile Logo */}
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                                <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-xl">
                                    <Ticket className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-xl font-medium font-bitcount">
                                    <span className="text-white">Block</span>
                                    <span className="text-green-500">Tix</span>
                                </h1>
                            </div>

                            {links.map((link) => (
                                <a
                                    key={link.label}
                                    className={buttonVariants({
                                        variant: 'ghost',
                                        className: 'justify-start text-gray-300 hover:text-white',
                                    })}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <SheetFooter className="border-slate-800 bg-slate-900/50">
                            <Button
                                variant="outline"
                                className="border-slate-700 text-white hover:bg-slate-800"
                                onClick={() => { setLocation('/login'); setOpen(false); }}
                            >
                                Login
                            </Button>
                            <Button
                                className="bg-green-500 hover:bg-green-600 text-white"
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
