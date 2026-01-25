"use client";

import { useEffect } from "react";
import { useLocation } from 'wouter';
import { renderCanvas, ShineBorder, TypeWriter } from "@/components/ui/hero-designali";
import { Plus, Rocket, UserCircle, Sparkles, Shield, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const NewHero = () => {
    const [, setLocation] = useLocation();
    const talkAbout = [
        "Blockchain Security",
        "Zero Fraud",
        "Instant Verification",
        "Smart Contracts",
        "Global Access",
    ];

    useEffect(() => {
        renderCanvas();
    }, []);

    return (
        <main className="overflow-hidden relative min-h-screen flex flex-col justify-center">
            <section id="home" className="relative z-10">
                {/* Animated Background Grid */}
                <div className="absolute inset-0 max-md:hidden top-0 -z-10 h-full w-full bg-transparent bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]"></div>

                <div className="flex flex-col items-center justify-center px-6 text-center">
                    {/* Badge */}
                    <div className="mb-8 mt-10">
                        <Badge
                            className="px-5 py-3 bg-gradient-to-r from-green-600/40 via-green-500/40 to-green-400/40 border-2 border-green-400/60 backdrop-blur-xl shadow-2xl shadow-green-500/30 transition-all duration-500 hover:scale-110 text-white"
                        >
                            <Sparkles className="mr-2 h-5 w-5 text-white animate-pulse" />
                            <span className="font-bold text-base">Powered by Ethereum Blockchain</span>
                            <Shield className="ml-2 h-5 w-5 text-white" />
                        </Badge>
                    </div>

                    <div className="mx-auto max-w-5xl">
                        {/* Main Heading Container */}
                        <div className="relative mx-auto h-full p-8 md:p-12 mb-8">
                            <Plus strokeWidth={2} className="text-white/60 absolute -left-5 -top-5 h-10 w-10" />
                            <Plus strokeWidth={2} className="text-white/50 absolute -bottom-5 -left-5 h-10 w-10" />
                            <Plus strokeWidth={2} className="text-white/40 absolute -right-5 -top-5 h-10 w-10" />
                            <Plus strokeWidth={2} className="text-white/60 absolute -bottom-5 -right-5 h-10 w-10" />

                            <h1 className="text-7xl md:text-8xl lg:text-9xl font-normal tracking-tighter font-bitcount">
                                <span className="text-white">Block</span>
                                <span className="text-green-500">
                                    Tix
                                </span>
                            </h1>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 drop-shadow-lg">
                            Next-Gen Event Ticketing
                        </h2>

                        <p className="text-xl text-white/80 max-w-3xl mx-auto mb-10 leading-relaxed">
                            Create and verify tickets with{" "}
                            <span className="text-green-400 font-bold underline decoration-green-500/30">
                                <TypeWriter strings={talkAbout} />
                            </span>.
                            <br />
                            Secure. Transparent. Immutable.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <ShineBorder
                                borderWidth={1.5}
                                duration={10}
                                className="h-auto w-auto p-0.5 bg-white/5 backdrop-blur-md rounded-full"
                                color={["#FFFFFF", "#F5F5F5", "#E5E5E5"]}
                            >
                                <Button
                                    size="lg"
                                    onClick={() => setLocation('/signup')}
                                    className="w-full h-14 px-8 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg flex items-center justify-center gap-2 border-0 group"
                                >
                                    <Rocket className="h-5 w-5 group-hover:animate-bounce" />
                                    Start as Organizer
                                </Button>
                            </ShineBorder>

                            <ShineBorder
                                borderWidth={1.5}
                                duration={12}
                                className="h-auto w-auto p-0.5 bg-white/5 backdrop-blur-md rounded-full"
                                color={["#FFFFFF", "#F5F5F5", "#E5E5E5"]}
                            >
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => setLocation('/user-signup')}
                                    className="w-full h-14 px-8 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-lg flex items-center justify-center gap-2 border border-white/20 group"
                                >
                                    <UserCircle className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                                    Join as User
                                </Button>
                            </ShineBorder>
                        </div>
                    </div>
                </div>

                {/* Canvas Background */}
                <canvas
                    className="pointer-events-none fixed inset-0 -z-10"
                    id="canvas"
                ></canvas>
            </section>

            {/* Hero Image Overlay */}
            <img
                className="absolute left-1/2 top-0 -z-20 -translate-x-1/2 opacity-30 mix-blend-screen pointer-events-none"
                src="https://raw.githubusercontent.com/designali-in/designali/refs/heads/main/apps/www/public/images/gradient-background-top.png"
                alt=""
                role="presentation"
            />
        </main>
    );
};
