import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
    return (
        <footer className="bg-dark border-t border-white/5">
            {/* Main Footer */}
            <div className="container py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div>
                        <Link href="/" className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 rounded-full overflow-hidden">
                                <Image
                                    src="/logo.jpg"
                                    alt="TUATAK Shabunt"
                                    width={56}
                                    height={56}
                                    className="object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">TUATAK</h3>
                                <p className="text-xs text-secondary">Shabunt</p>
                            </div>
                        </Link>
                        <p className="text-gray-400 mb-6">
                            Experience authentic Thai shabu-shabu with fresh ingredients,
                            premium meats, and signature dipping sauces.
                        </p>
                        {/* Social Links */}
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-dark-lighter flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-dark-lighter flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" /></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-dark-lighter flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-dark-lighter flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" /></svg>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6">Quick Links</h4>
                        <ul className="space-y-3">
                            <li><Link href="/" className="text-gray-400 hover:text-primary transition-colors">Home</Link></li>
                            <li><Link href="/menu" className="text-gray-400 hover:text-primary transition-colors">Menu</Link></li>
                            <li><Link href="#about" className="text-gray-400 hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="#locations" className="text-gray-400 hover:text-primary transition-colors">Locations</Link></li>
                            <li><Link href="#careers" className="text-gray-400 hover:text-primary transition-colors">Careers</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <span className="text-primary">📍</span>
                                <span className="text-gray-400">123 Sukhumvit Road, Bangkok 10110, Thailand</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-primary">📞</span>
                                <span className="text-gray-400">+66 2-123-4567</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-primary">✉️</span>
                                <span className="text-gray-400">info@tuatak.com</span>
                            </li>
                        </ul>
                    </div>

                    {/* Hours */}
                    <div>
                        <h4 className="text-lg font-semibold text-white mb-6">Opening Hours</h4>
                        <ul className="space-y-3">
                            <li className="flex justify-between">
                                <span className="text-gray-400">Monday - Friday</span>
                                <span className="text-white">10:00 - 22:00</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-gray-400">Saturday</span>
                                <span className="text-white">10:00 - 23:00</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-gray-400">Sunday</span>
                                <span className="text-white">11:00 - 22:00</span>
                            </li>
                        </ul>
                        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-primary text-sm font-medium">🔥 Happy Hour: 15:00 - 17:00</p>
                            <p className="text-gray-400 text-xs mt-1">20% off all drinks!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/5 py-6">
                <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © 2024 TUATAK Shabunt. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm">
                        <a href="#" className="text-gray-500 hover:text-primary transition-colors">Privacy Policy</a>
                        <a href="#" className="text-gray-500 hover:text-primary transition-colors">Terms of Service</a>
                        <a href="#" className="text-gray-500 hover:text-primary transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
