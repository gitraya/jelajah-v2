import { ArrowLeft, Eye, EyeOff, Globe } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";

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
import { Separator } from "@/app/components/ui/separator";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useAuth } from "@/contexts/AuthContext";
import { validator } from "@/lib/utils";

const DEMO_CREDENTIALS = {
  email: "demo@example.com",
  password: "demo12@PW",
};

export default function Login() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<any>();
  const { login, loginWithGoogle, error } = useAuth();
  const query = new URLSearchParams(search);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const redirectPath = query.get("redirect") || "/";
  const defaultEmail = query.get("email") || "";

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const isLoggedIn = await login(data.email, data.password);
      if (isLoggedIn) navigate(redirectPath);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (code: string) => {
    try {
      setIsLoading(true);
      const isLoggedIn = await loginWithGoogle(code);
      if (isLoggedIn) navigate(redirectPath);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setValue("email", DEMO_CREDENTIALS.email);
    setValue("password", DEMO_CREDENTIALS.password);
    onSubmit(DEMO_CREDENTIALS);
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
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
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

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10"
                    aria-invalid={errors.password ? "true" : "false"}
                    {...register("password", {
                      required: validator.required,
                      pattern: validator.password,
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message as string}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <GoogleSignInButton
                  onCode={handleGoogleLogin}
                  label="Sign in with Google"
                  disabled={isLoading}
                />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                >
                  Try Demo Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to={`/register${search}`}
              className="text-primary hover:underline font-medium"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
