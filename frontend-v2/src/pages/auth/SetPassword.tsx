import { ArrowLeft, Eye, EyeOff, Globe } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";

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

export default function SetPassword() {
  const navigate = useNavigate();
  const { userId, token } = useParams();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<any>();
  const { setPassword, error } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const success = await setPassword({
        user_id: userId,
        token,
        ...data,
      });

      if (error === "Invalid or expired token") {
        setTimeout(() => navigate("/resend-set-password-email"), 3000);
      }
      if (success) navigate("/login");
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
          <p className="text-muted-foreground">Set your password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Password</CardTitle>
            <CardDescription>
              Choose a strong password for your account
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
                <Label htmlFor="new_password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10"
                    aria-invalid={errors.new_password ? "true" : "false"}
                    {...register("new_password", {
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
                {errors.new_password && (
                  <p className="text-xs text-destructive">
                    {errors.new_password.message as string}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password2">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="new_password2"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pr-10"
                    aria-invalid={errors.new_password2 ? "true" : "false"}
                    {...register("new_password2", {
                      required: "Please confirm your password",
                      validate: (value: string) =>
                        value === watch("new_password") ||
                        "Passwords do not match",
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
                {errors.new_password2 && (
                  <p className="text-xs text-destructive">
                    {errors.new_password2.message as string}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Setting password..." : "Set Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have a password?{" "}
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
