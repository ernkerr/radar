import './globals.css';
import AppNav from '@/components/AppNav';

export const metadata = {
  title: 'Aquanor Command',
  description: 'Live compliance command center for seafood import/export operations.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black font-sans antialiased">
        <AppNav />
        <div>{children}</div>
      </body>
    </html>
  );
}
