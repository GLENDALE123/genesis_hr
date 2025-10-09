'use client';

import { LoginForm } from "@/features/auth"

export default function Page() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6 md:p-10 overflow-y-auto">
      <div className="w-full max-w-sm my-auto">
        <LoginForm />
      </div>
    </div>
  )
}
