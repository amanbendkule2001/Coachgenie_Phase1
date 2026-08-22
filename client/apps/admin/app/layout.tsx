
// import "./globals.css";
// import { GeistSans } from "geist/font/sans";
// import { Toaster } from "sonner";

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
// <<<<<<< HEAD
//     <html lang="en" className={GeistSans.className}>
//       <body>
//         {children}

//         <Toaster
//           position="top-right"
//           richColors
//           closeButton
//           duration={3000}
//         />
//       </body>
// =======
//     <html lang="en" suppressHydrationWarning className={GeistSans.className}>
//       <body>{children}</body>
// >>>>>>> 6ccbda3130b43a4e7222f4c75bf560295ff8edbf
//     </html>
//   );
// }


import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "CoachGenie ERP - Coaching Institute Management",
  description: "Enterprise coaching management and analytics system for admissions, attendance, fees, exams, and student growth.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={GeistSans.className}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
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