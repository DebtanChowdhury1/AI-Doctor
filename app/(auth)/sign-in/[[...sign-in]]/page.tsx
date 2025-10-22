import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <div className="glass-card mt-10 w-full max-w-md rounded-3xl p-6">
        <SignIn signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
