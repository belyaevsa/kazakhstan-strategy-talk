import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      toast.success(t("auth.resetSuccess"));
    } catch (err: any) {
      const message = err.message || t("auth.errorOccurred");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t("auth.resetTitle")}</CardTitle>
          <CardDescription>{t("auth.resetDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                {t("auth.resetNoToken")}
              </AlertDescription>
            </Alert>
          ) : done ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {t("auth.resetDone")}
                </AlertDescription>
              </Alert>
              <Button className="w-full" onClick={() => navigate("/auth")}>
                {t("auth.signIn")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.newPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("auth.loading") : t("auth.resetSubmit")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
