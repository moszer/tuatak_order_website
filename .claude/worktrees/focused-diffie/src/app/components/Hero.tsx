'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 gradient-hero"></div>

            {/* Floating Food Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 text-6xl animate-float opacity-60">🍲</div>
                <div className="absolute top-40 right-20 text-5xl animate-float delay-200 opacity-60">🔥</div>
                <div className="absolute bottom-40 left-20 text-5xl animate-float delay-300 opacity-60">🦐</div>
                <div className="absolute bottom-20 right-10 text-6xl animate-float delay-100 opacity-60">🥢</div>
                <div className="absolute top-1/2 left-1/4 text-4xl animate-float delay-400 opacity-40">🌶️</div>
                <div className="absolute top-1/3 right-1/3 text-4xl animate-float delay-500 opacity-40">🥬</div>
            </div>

            {/* Content */}
            <div className="container relative z-10 text-center px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Logo */}
                    <div className="mb-8 animate-slideUp">
                        <div className="inline-block w-32 h-32 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
                            <Image
                                src="/logo.jpg"
                                alt="TUATAK Shabunt"
                                width={128}
                                height={128}
                                className="object-cover"
                                priority
                            />
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full mb-6 animate-slideUp delay-100">
                        ⭐ Premium Thai Shabu & Grill
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 animate-slideUp delay-200">
                        TUATAK
                        <span className="block text-gradient">Shabunt</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto animate-slideUp delay-300">
                        Authentic Thai shabu-shabu experience with fresh ingredients,
                        premium meats, and our signature dipping sauces.
                    </p>

                    {/* Thai Text */}
                    <p className="text-lg text-secondary mb-10 font-medium animate-slideUp delay-400">
                        ชาบูสดใหม่ • อร่อยทุกคำ • คุ้มค่าทุกมื้อ 🍲
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideUp delay-500">
                        <Link href="/menu" className="btn-primary text-lg px-8 py-4">
                            <span>View Menu</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                            </svg>
                        </Link>
                        <button className="btn-secondary text-lg px-8 py-4">
                            📍 Find Locations
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto animate-slideUp delay-500">
                        <div>
                            <div className="text-4xl font-bold text-gradient">50+</div>
                            <div className="text-gray-400 text-sm">Menu Items</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gradient">5</div>
                            <div className="text-gray-400 text-sm">Branches</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gradient">4.8</div>
                            <div className="text-gray-400 text-sm">⭐ Rating</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce-slow">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-white opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                </svg>
            </div>
        </section>
    );
}
