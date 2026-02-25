import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

export default function SignIn() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <ClerkSignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
