import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { FileText, Mail, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ApiError } from "@/lib/api/client";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    // Check if already logged in
    if (authService.isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setShowEmailVerification(false);
    setShowResendOption(false);

    try {
      if (isLogin) {
        await authService.login({ email, password });
        toast.success(t("auth.successLogin"));
        navigate("/");
      } else {
        const response = await authService.register({
          email,
          password,
          username: username || email.split("@")[0],
          website, // Include honeypot field
        });

        // Registration successful - show email verification notice
        setShowEmailVerification(true);
        toast.success(t("auth.successRegister"));

        // Clear form
        setEmail("");
        setPassword("");
        setUsername("");
      }
    } catch (error: any) {
      const errorMessage = error.message || t("auth.errorOccurred");
      setError(errorMessage);

      // Check if this is an ApiError with EMAIL_NOT_VERIFIED code
      if (error instanceof ApiError && error.data?.code === "EMAIL_NOT_VERIFIED") {
        setShowResendOption(true);
        setResendEmail(email);
      }

      // Show specific guidance based on error type
      if (errorMessage.includes("verify your email")) {
        setShowEmailVerification(true);
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      const response = await authService.resendVerification(resendEmail);
      toast.success(t("auth.resendSuccess"));
      setShowResendOption(false);
      setShowEmailVerification(true);
      setError("");
    } catch (error: any) {
      const errorMessage = error.message || t("auth.errorOccurred");
      toast.error(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? t("auth.signInDescription")
              : t("auth.registerDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email Verification Notice */}
          {showEmailVerification && !error && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 space-y-2">
                <div className="font-semibold">{t("auth.checkEmailVerification")}</div>
                <div className="text-sm">
                  {t("auth.emailVerificationSteps")}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert with Resend Option */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 space-y-2">
                <div className="font-semibold">{error}</div>
                {showResendOption && (
                  <div className="mt-3">
                    <p className="text-sm mb-2">{t("auth.resendQuestion")}</p>
                    <Button
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {resendingEmail ? t("auth.sending") : t("auth.resendVerification")}
                    </Button>
                  </div>
                )}
                {showEmailVerification && !showResendOption && (
                  <div className="text-sm mt-2 text-blue-700">
                    💡 {t("auth.checkEmailVerification")}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Honeypot field - hidden from users but visible to bots */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">{t("auth.username")}</Label>
                <Input
                  id="username"
                  placeholder={t("auth.yourUsername")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.yourEmail")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("auth.loading") : isLogin ? t("auth.signIn") : t("auth.createAccount")}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin
                ? t("auth.dontHaveAccountSignUp")
                : t("auth.alreadyHaveAccountSignIn")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
