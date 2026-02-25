import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

export default function SignIn() {
  return (
    <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))]">
      <ClerkSignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
