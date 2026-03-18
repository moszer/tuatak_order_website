import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import Header from "./components/Header";
import Cart from "./components/Cart";

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "TUATAK Shabunt | ชาบูสดใหม่ - Premium Thai Shabu & Grill",
  description: "Experience authentic Thai shabu-shabu with fresh ingredients, premium meats, and signature dipping sauces. Order online for delivery or dine-in at TUATAK Shabunt.",
  keywords: "Thai food, shabu, shabunt, TUATAK, ชาบู, grilled seafood, Thai restaurant",
  // ลบ icons ออก หรือไม่ต้องระบุ Next.js จะใช้ favicon.ico อัตโนมัติ
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased`}>
        <CartProvider>
          <Header />
          <Cart />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
