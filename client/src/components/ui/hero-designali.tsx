"use client";

import { cn } from "@/lib/utils";

// @ts-ignore
function n(e) {
    // @ts-ignore
    this.init(e || {});
}
n.prototype = {
    // @ts-ignore
    init: function (e) {
        // @ts-ignore
        this.phase = e.phase || 0;
        // @ts-ignore
        this.offset = e.offset || 0;
        // @ts-ignore
        this.frequency = e.frequency || 0.001;
        // @ts-ignore
        this.amplitude = e.amplitude || 1;
    },
    update: function () {
        return (
            // @ts-ignore
            (this.phase += this.frequency),
            // @ts-ignore
            (e = this.offset + Math.sin(this.phase) * this.amplitude)
        );
    },
    value: function () {
        return e;
    },
};

// @ts-ignore
function Line(e) {
    // @ts-ignore
    this.init(e || {});
}

Line.prototype = {
    // @ts-ignore
    init: function (e) {
        // @ts-ignore
        this.spring = e.spring + 0.1 * Math.random() - 0.05;
        // @ts-ignore
        this.friction = E.friction + 0.01 * Math.random() - 0.005;
        // @ts-ignore
        this.nodes = [];
        for (var t, n = 0; n < E.size; n++) {
            t = new (Node as any)();
            // @ts-ignore
            t.x = pos.x;
            // @ts-ignore
            t.y = pos.y;
            // @ts-ignore
            this.nodes.push(t);
        }
    },
    update: function () {
        // @ts-ignore
        let e = this.spring,
            // @ts-ignore
            t = this.nodes[0];
        // @ts-ignore
        t.vx += (pos.x - t.x) * e;
        // @ts-ignore
        t.vy += (pos.y - t.y) * e;
        // @ts-ignore
        for (var n, i = 0, a = this.nodes.length; i < a; i++)
            // @ts-ignore
            (t = this.nodes[i]),
                0 < i &&
                // @ts-ignore
                ((n = this.nodes[i - 1]),
                    (t.vx += (n.x - t.x) * e),
                    (t.vy += (n.y - t.y) * e),
                    (t.vx += n.vx * E.dampening),
                    (t.vy += n.vy * E.dampening)),
                // @ts-ignore
                (t.vx *= this.friction),
                // @ts-ignore
                (t.vy *= this.friction),
                (t.x += t.vx),
                (t.y += t.vy),
                (e *= E.tension);
    },
    draw: function () {
        let e,
            t,
            // @ts-ignore
            n = this.nodes[0].x,
            // @ts-ignore
            i = this.nodes[0].y;
        // @ts-ignore
        ctx.beginPath();
        // @ts-ignore
        ctx.moveTo(n, i);
        // @ts-ignore
        for (var a = 1, o = this.nodes.length - 2; a < o; a++) {
            // @ts-ignore
            e = this.nodes[a];
            // @ts-ignore
            t = this.nodes[a + 1];
            n = 0.5 * (e.x + t.x);
            i = 0.5 * (e.y + t.y);
            // @ts-ignore
            ctx.quadraticCurveTo(e.x, e.y, n, i);
        }
        // @ts-ignore
        e = this.nodes[a];
        // @ts-ignore
        t = this.nodes[a + 1];
        // @ts-ignore
        ctx.quadraticCurveTo(e.x, e.y, t.x, t.y);
        // @ts-ignore
        ctx.stroke();
        // @ts-ignore
        ctx.closePath();
    },
};

// @ts-ignore
function onMousemove(e) {
    function o() {
        lines = [];
        for (let e = 0; e < E.trails; e++)
            lines.push(new (Line as any)({ spring: 0.45 + (e / E.trails) * 0.025 }));
    }
    // @ts-ignore
    function c(e) {
        if (e.touches) {
            // @ts-ignore
            pos.x = e.touches[0].clientX;
            // @ts-ignore
            pos.y = e.touches[0].clientY;
        } else {
            // @ts-ignore
            pos.x = e.clientX;
            // @ts-ignore
            pos.y = e.clientY;
        }
        e.preventDefault();
    }
    // @ts-ignore
    function l(e) {
        // @ts-ignore
        if (e.touches.length === 1) {
            pos.x = e.touches[0].clientX;
            pos.y = e.touches[0].clientY;
        }
    }
    document.removeEventListener("mousemove", onMousemove),
        document.removeEventListener("touchstart", onMousemove),
        document.addEventListener("mousemove", c),
        document.addEventListener("touchmove", c),
        document.addEventListener("touchstart", l),
        c(e),
        o(),
        render();
}

function render() {
    // @ts-ignore
    if (ctx.running) {
        // @ts-ignore
        ctx.globalCompositeOperation = "source-over";
        // @ts-ignore
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        // @ts-ignore
        ctx.globalCompositeOperation = "lighter";
        // @ts-ignore
        ctx.strokeStyle = "hsla(" + Math.round(f.update()) + ",100%,50%,0.025)";
        // @ts-ignore
        ctx.lineWidth = 10;
        for (var e, t = 0; t < E.trails; t++) {
            // @ts-ignore
            (e = lines[t]).update();
            e.draw();
        }
        // @ts-ignore
        ctx.frame++;
        window.requestAnimationFrame(render);
    }
}

function resizeCanvas() {
    // @ts-ignore
    ctx.canvas.width = window.innerWidth;
    // @ts-ignore
    ctx.canvas.height = window.innerHeight;
}

// @ts-ignore
var ctx: any,
    // @ts-ignore
    f: any,
    e = 0,
    pos: any = {},
    // @ts-ignore
    lines: any[] = [],
    E = {
        debug: true,
        friction: 0.5,
        trails: 80,
        size: 50,
        dampening: 0.025,
        tension: 0.99,
    };
// @ts-ignore
function Node(this: any) {
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.vx = 0;
}

const renderCanvas = function () {
    // @ts-ignore
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.running = true;
    ctx.frame = 1;
    // @ts-ignore
    f = new (n as any)({
        phase: Math.random() * 2 * Math.PI,
        amplitude: 85,
        frequency: 0.0015,
        offset: 285,
    });
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("touchstart", onMousemove);
    document.body.addEventListener("orientationchange", resizeCanvas);
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("focus", () => {
        // @ts-ignore
        if (!ctx.running) {
            // @ts-ignore
            ctx.running = true;
            render();
        }
    });
    window.addEventListener("blur", () => {
        // @ts-ignore
        ctx.running = true;
    });
    resizeCanvas();
};

import { useState, useEffect } from "react";

interface TypeWriterProps {
    strings: string[];
}


const TypeWriter = ({ strings }: TypeWriterProps) => {
    const [currentStringIndex, setCurrentStringIndex] = useState(0);
    const [currentText, setCurrentText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentFullText = strings[currentStringIndex];
        
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (currentText.length < currentFullText.length) {
                    setCurrentText(currentFullText.substring(0, currentText.length + 1));
                } else {
                    setTimeout(() => setIsDeleting(true), 1000);
                }
            } else {
                if (currentText.length > 0) {
                    setCurrentText(currentText.substring(0, currentText.length - 1));
                } else {
                    setIsDeleting(false);
                    setCurrentStringIndex((currentStringIndex + 1) % strings.length);
                }
            }
        }, isDeleting ? 20 : 80);

        return () => clearTimeout(timeout);
    }, [currentText, isDeleting, currentStringIndex, strings]);

    return (
        <span>
            {currentText}
            <span className="animate-pulse">|</span>
        </span>
    );
};

type TColorProp = string | string[];

interface ShineBorderProps {
    borderRadius?: number;
    borderWidth?: number;
    duration?: number;
    color?: TColorProp;
    className?: string;
    children: React.ReactNode;
}

/**
 * @name Shine Border
 * @description It is an animated background border effect component with easy to use and configurable props.
 * @param borderRadius defines the radius of the border.
 * @param borderWidth defines the width of the border.
 * @param duration defines the animation duration to be applied on the shining border
 * @param color a string or string array to define border color.
 * @param className defines the class name to be applied to the component
 * @param children contains react node elements.
 */
function ShineBorder({
    borderRadius = 8,
    borderWidth = 1,
    duration = 14,
    color = "#000000",
    className,
    children,
}: ShineBorderProps) {
    return (
        <div
            style={
                {
                    "--border-radius": `${borderRadius}px`,
                } as React.CSSProperties
            }
            className={cn(
                "relative grid h-full w-full place-items-center rounded-full bg-white p-3 text-black dark:bg-black dark:text-white",
                className,
            )}
        >
            <div
                style={
                    {
                        "--border-width": `${borderWidth}px`,
                        "--border-radius": `${borderRadius}px`,
                        "--shine-pulse-duration": `${duration}s`,
                        "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
                        "--background-radial-gradient": `radial-gradient(transparent,transparent, ${color instanceof Array ? color.join(",") : color},transparent,transparent)`,
                    } as React.CSSProperties
                }
                className={`col-start-1 row-start-1 pointer-events-none before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-full before:p-[--border-width] before:will-change-[background-position] before:content-[""] before:![-webkit-mask-composite:xor] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:![mask-composite:exclude] before:[mask:--mask-linear-gradient] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]`}
            ></div>
            <div className="col-start-1 row-start-1 relative z-10 w-full h-full flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}



export { renderCanvas, TypeWriter, ShineBorder }
