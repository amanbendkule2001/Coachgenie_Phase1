
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


import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";

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