import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-black/5 rounded-2xl',
          },
        }}
      />
    </div>
  );
}
