import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-background/70 p-6 shadow-xl backdrop-blur-xl">
        <SignIn signUpUrl="/sign-up" />
      </div>
    </div>
  );
}
