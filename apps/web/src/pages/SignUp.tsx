import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

export default function SignUp() {
  return (
    <div className="flex h-screen items-center justify-center bg-[hsl(var(--background))]">
      <ClerkSignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
