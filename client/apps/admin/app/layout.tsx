// import "./globals.css";
// import { GeistSans } from 'geist/font/sans';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en" className={GeistSans.className}>
//       <body>{children}</body>
//     </html>
//   );
// }

import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        {children}

        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
        />
      </body>
    </html>
  );
}