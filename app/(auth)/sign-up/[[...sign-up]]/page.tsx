import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center">
      <div className="glass-card mt-10 w-full max-w-md rounded-3xl p-6">
        <SignUp signInUrl="/sign-in" />
      </div>
    </div>
  );
}
