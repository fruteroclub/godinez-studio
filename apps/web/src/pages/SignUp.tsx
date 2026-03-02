import { useState, useEffect, useCallback } from "react";
import { SignUp as ClerkSignUp, useAuth } from "@clerk/clerk-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";

type Step = "code" | "signup";

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();

  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Auto-validate if code comes from URL
  const prefilled = searchParams.get("code");

  const handleValidate = useCallback(
    async (codeToValidate: string) => {
      const trimmed = codeToValidate.trim().toUpperCase();
      if (!trimmed) {
        setError("Ingresa un código de invitación");
        return;
      }

      setIsValidating(true);
      setError("");

      try {
        const res = await apiFetch<{ valid: boolean }>(
          "/api/referral-codes/validate",
          {
            method: "POST",
            body: JSON.stringify({ code: trimmed }),
          },
        );

        if (res.valid) {
          sessionStorage.setItem("referralCode", trimmed);
          setStep("signup");
        } else {
          setError("Código inválido o expirado");
        }
      } catch {
        setError("Error al validar el código");
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  // Auto-validate prefilled code from URL
  useEffect(() => {
    if (prefilled) {
      handleValidate(prefilled);
    }
  }, [prefilled, handleValidate]);

  // After Clerk signup completes, redeem the code
  useEffect(() => {
    if (!isSignedIn || step !== "signup") return;

    const storedCode = sessionStorage.getItem("referralCode");
    if (!storedCode) {
      navigate("/studio");
      return;
    }

    (async () => {
      try {
        const token = await getToken();
        await apiFetch("/api/referral-codes/redeem", {
          method: "POST",
          token,
          body: JSON.stringify({ code: storedCode }),
        });
      } catch {
        // Code already redeemed or invalid — not blocking
      } finally {
        sessionStorage.removeItem("referralCode");
        navigate("/studio");
      }
    })();
  }, [isSignedIn, step, getToken, navigate]);

  if (step === "code") {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-charcoal p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Acceso Beta</h1>
            <p className="text-white/60 mt-2 text-sm">
              Ingresa tu código de invitación para crear tu cuenta
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleValidate(code);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="BETA-XXXXXX"
              autoFocus
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder:text-white/30 focus:border-magenta focus:outline-none focus:ring-2 focus:ring-magenta/20"
            />

            {error && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={isValidating}
              className="w-full rounded-full bg-magenta px-4 py-3 font-semibold text-white transition-colors hover:bg-magenta-dark disabled:opacity-60"
            >
              {isValidating ? "Validando..." : "Continuar"}
            </button>
          </form>

          <p className="text-center text-xs text-white/40">
            ¿Ya tienes cuenta?{" "}
            <a href="/sign-in" className="text-magenta hover:underline">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <ClerkSignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
