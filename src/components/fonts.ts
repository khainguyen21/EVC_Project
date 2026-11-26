import { Overpass } from "next/font/google";

// Overpass is drawn from Highway Gothic, the lettering on US road signs, which
// is the look the public pages' signs and room plates borrow.
export const overpass = Overpass({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-overpass",
});
