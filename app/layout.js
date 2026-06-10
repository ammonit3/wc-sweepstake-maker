import "./globals.css";
import Nav from "./Nav";
import { Football } from "./Decor";

export const metadata = {
  title: "WC Sweepstake Maker — It's Mathematically Possible!",
  description: "Create your own World Cup 2026 sweepstake in a minute. Auto-draw, live scores, arcane underdog bonuses.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="header-band" />
        <Nav />
        <div className="tagline-bar">
          <Football size={16} />
          <span className="tagline">It&apos;s Mathematically Possible!</span>
          <Football size={16} />
        </div>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
