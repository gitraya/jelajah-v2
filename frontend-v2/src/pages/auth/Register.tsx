import { ArrowLeft, Check, Eye, EyeOff, Globe } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

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
import { postAPIData } from "@/lib/api";
import { getErrorMessage, validatePassword, validator } from "@/lib/utils";

const MUST_SET_PASSWORD_MESSAGE =
  "Email: User with this email already exists. Please set your password to activate your account.";

export default function Register() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<any>();
  const { login, error: loginError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const query = new URLSearchParams(search);

  const redirectPath = query.get("redirect") || "/";
  const defaultEmail = query.get("email") || "";

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      await postAPIData("/auth/register/", data);
      const isLoggedIn = await login(data.email, data.password);
      if (isLoggedIn) {
        navigate(redirectPath);
        toast.success("Account created successfully!");
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);

      if (errorMessage === MUST_SET_PASSWORD_MESSAGE) {
        toast.error(
          "Please set your password to activate your account. Redirecting..."
        );
        setTimeout(() => {
          navigate(
            "/resend-set-password-email?email=" + encodeURIComponent(data.email)
          );
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordChecks = validatePassword(watch("password"));

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
          <p className="text-muted-foreground">
            Create your account to start planning
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create account</CardTitle>
            <CardDescription>
              Join the community of travelers and start your next adventure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {(error || loginError) && (
                <Alert variant="destructive">
                  <AlertDescription>{error || loginError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  aria-invalid={errors.first_name ? "true" : "false"}
                  {...register("first_name", {
                    required: validator.required,
                    minLength: validator.minLength(2),
                    maxLength: validator.maxLength(50),
                  })}
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">
                    {errors.first_name.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Enter your last name"
                  aria-invalid={errors.last_name ? "true" : "false"}
                  {...register("last_name", {
                    required: validator.required,
                    minLength: validator.minLength(2),
                    maxLength: validator.maxLength(50),
                  })}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">
                    {errors.last_name.message as string}
                  </p>
                )}
              </div>

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
                    placeholder="Create a strong password"
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

                {watch("password") && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      Password requirements:
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {[
                        ["length", "8+ characters"],
                        ["uppercase", "Uppercase"],
                        ["lowercase", "Lowercase"],
                        ["number", "Number"],
                      ].map(([key, label]) => (
                        <div
                          key={key}
                          className={`flex items-center gap-1 ${
                            (passwordChecks as any)[key]
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              (passwordChecks as any)[key]
                                ? "opacity-100"
                                : "opacity-30"
                            }`}
                          />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password2">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pr-10"
                    aria-invalid={errors.password2 ? "true" : "false"}
                    {...register("password2", {
                      required: validator.required,
                      validate: (value: string) =>
                        value === watch("password") || "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password2 && (
                  <p className="text-xs text-destructive">
                    {errors.password2.message as string}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={`/login${search}`}
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
