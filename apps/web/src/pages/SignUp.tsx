import { SignUp as ClerkSignUp } from "@clerk/clerk-react";

export default function SignUp() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <ClerkSignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
