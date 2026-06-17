import { ArrowLeft, Globe, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router";

import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { validator } from "@/lib/utils";

export default function ResendSetPasswordEmail() {
  const [searchParams] = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<any>();
  const { resendSetPasswordEmail, error } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaultEmail = searchParams.get("email") || "";

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      setSuccess(false);
      const result = await resendSetPasswordEmail(data.email);
      if (result) setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Browse
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Jelajah</h1>
          </div>
          <p className="text-muted-foreground">Resend password setup email</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resend Setup Email</CardTitle>
            <CardDescription>
              Enter your email to receive a new password setup link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Password setup email sent! Check your inbox.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  aria-invalid={errors.email ? "true" : "false"}
                  defaultValue={defaultEmail}
                  disabled={!!defaultEmail}
                  {...register("email", {
                    required: validator.required,
                    pattern: validator.email,
                  })}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message as string}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Setup Email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
