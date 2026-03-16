import type { Metadata } from "next";
import AdminShell from './components/AdminShell';

export const metadata: Metadata = {
  title: "Admin Panel | TUATAK Shabunt",
  description: "ระบบจัดการร้านอาหาร TUATAK Shabunt",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
