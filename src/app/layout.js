import './globals.css';

export const metadata = {
  title: 'riff',
  description: 'Talk it out. riff turns the ramble into notes and to-dos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="font-body bg-background text-foreground">{children}</body>
    </html>
  );
}
