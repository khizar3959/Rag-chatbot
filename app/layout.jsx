import './globals.css';

export const metadata = {
  title: 'TechMart AI Support Agent',
  description: 'AI-Powered E-Commerce Customer Support, Order Tracking & Refund Automation',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
