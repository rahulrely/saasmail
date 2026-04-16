import Link from "next/link";

import { LoginForm } from "@/components/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your email operations workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm />
          <p className="text-sm text-muted-foreground">
            New here? <Link href="/register" className="text-primary">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
