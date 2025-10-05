import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Mail, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const EmailVerified = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const statusParam = searchParams.get("status");
    const messageParam = searchParams.get("message");

    if (statusParam === "success") {
      setStatus("success");
      setMessage(messageParam || t("emailVerified.successMessage"));
    } else if (statusParam === "error") {
      setStatus("error");
      setMessage(messageParam || t("emailVerified.errorMessage"));
    } else {
      // If no status param, it's an invalid access
      setStatus("error");
      setMessage(t("emailVerified.invalidAccess"));
    }
  }, [searchParams, t]);

  const handleNavigateToLogin = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            )}
            {status === "error" && (
              <div className="p-3 bg-red-50 rounded-lg">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "success" && t("emailVerified.title")}
            {status === "error" && t("emailVerified.errorTitle")}
            {status === "loading" && t("emailVerified.verifying")}
          </CardTitle>
          <CardDescription>
            {status === "success" && t("emailVerified.description")}
            {status === "error" && t("emailVerified.errorDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alert */}
          {status === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {/* Next Steps */}
          {status === "success" && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-2">{t("emailVerified.nextSteps")}</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>{t("emailVerified.step1")}</li>
                  <li>{t("emailVerified.step2")}</li>
                  <li>{t("emailVerified.step3")}</li>
                </ol>
              </div>
              <Button onClick={handleNavigateToLogin} className="w-full" size="lg">
                {t("emailVerified.goToLogin")}
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>{t("emailVerified.errorHelp")}</p>
              </div>
              <Button onClick={handleNavigateToLogin} variant="outline" className="w-full">
                {t("emailVerified.backToAuth")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerified;
