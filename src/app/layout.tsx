import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { Navbar } from "@/components/Navbar";
import { FirstLoginResetModal } from "@/components/FirstLoginResetModal";
import { TechBackground } from "@/components/TechBackground";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "ARTH MANTRA — PES University Hackathon & Live Score Tracker",
  description: "Official Hackathon portal for Arth Mantra: Strategy Meets Finance at PES University. Register teams, verify payments, and track live scores.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`h-full overflow-x-hidden bg-[#050814] ${plusJakarta.variable} ${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origSetAttr = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, val) {
                    if (
                      name === 'bis_skin_checked' ||
                      name === 'bis_register' ||
                      (typeof name === 'string' && name.indexOf('__processed') !== -1)
                    ) {
                      return;
                    }
                    return origSetAttr.apply(this, arguments);
                  };
                  if (typeof MutationObserver !== 'undefined') {
                    new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (
                          m.type === 'attributes' &&
                          (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register' || (m.attributeName && m.attributeName.indexOf('__processed') !== -1))
                        ) {
                          m.target.removeAttribute(m.attributeName);
                        }
                      }
                    }).observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked', 'bis_register']
                    });
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#050814] text-[#F8FAFC] antialiased selection:bg-[#00D2FF]/20 selection:text-[#00D2FF] overflow-x-hidden w-full max-w-[100vw]">
        <TechBackground />
        <AuthProvider>
          <ToastProvider>
            <FirstLoginResetModal />
            <Navbar />
            <main className="flex-1 w-full overflow-x-hidden">
              {children}
            </main>
            <footer className="border-t border-slate-800/90 bg-[#060A14] py-8 text-center text-xs text-slate-400">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5">
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00D2FF] tracking-wider text-sm uppercase">
                    Arth Mantra Hackathon
                  </span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="font-semibold text-slate-400 text-xs">
                    PES University • Faculty of Management & Commerce
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] font-medium flex items-center gap-2">
                  <span>Strategy Meets Finance</span>
                  <span>•</span>
                  <span>Ideas • Analyze • Build • Invest</span>
                </div>
              </div>
            </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
