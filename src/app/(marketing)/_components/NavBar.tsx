import BrandLogo from "@/components/BrandLogo";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

const NavBar = () => {
  return (
    <header className="flex shadow-xl py-6 fixed top-0 z-10 w-full bg-background/95">
      <nav className="container font-semibold gap-10 items-center flex">
        <Link href="/" className="mr-auto">
          <BrandLogo />
        </Link>
        <Link href="#" className="text-lg">
          Features
        </Link>
        <Link href="/#pricing" className="text-lg">
          Pricing
        </Link>
        <Link href="#" className="text-lg">
          About
        </Link>
        <span className="text-lg">
          <SignedIn>
            <Link href="/dashboard">Dashboard</Link>
          </SignedIn>
          <SignedOut>
            <SignInButton>Login</SignInButton>
          </SignedOut>
        </span>
      </nav>
    </header>
  );
};

export default NavBar;
