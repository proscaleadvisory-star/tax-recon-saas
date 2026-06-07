import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaxRecon — E-Commerce Tax Reconciliation",
  description:
    "Reconcile GST sales and payment data with intelligent matching, variance detection, and audit-ready reporting for Indian e-commerce sellers.",
  keywords: [
    "GST reconciliation",
    "e-commerce tax",
    "GSTR-1",
    "TCS reconciliation",
    "Amazon seller tax",
    "Flipkart seller tax",
    "tax audit",
    "India GST",
  ],
  authors: [{ name: "TaxRecon" }],
  openGraph: {
    title: "TaxRecon — E-Commerce Tax Reconciliation",
    description: "Intelligent GST reconciliation for e-commerce sellers",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
