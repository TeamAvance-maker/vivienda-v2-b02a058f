import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Ingresar — Control de obra" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInfo(null);
    try {
      if (mode === "signup") {
        const redirectTo =
          typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        // Si el correo ya está confirmado (cuenta existente), data.user existe
        // En signup normal, hay que esperar confirmación por correo
        if (data.user && !data.session) {
          setInfo(
            "✅ Te enviamos un correo de confirmación. Ábrelo y haz clic en el enlace para activar tu cuenta. Después el administrador debe aprobarte.",
          );
        } else if (data.session) {
          // Auto-confirm activado (no debería pasar) → crear perfil y redirigir
          await ensureProfile(data.user!.id, email, fullName);
          navigate({ to: "/" });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        if (data.user) {
          await ensureProfile(data.user.id, data.user.email ?? email, fullName);
          navigate({ to: "/" });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(
        msg.includes("Email not confirmed")
          ? "Aún no has confirmado tu correo. Revisa tu bandeja."
          : msg.includes("Invalid login")
            ? "Correo o contraseña incorrectos."
            : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error("Escribe tu correo arriba primero.");
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });
    if (error) toast.error(error.message);
    else toast.success("Correo de confirmación reenviado.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="font-display text-2xl font-semibold">Control de obra</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Ingresa con tu correo y contraseña" : "Crea tu cuenta"}
            </p>
          </div>
        </div>

        {info && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nombre completo
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Juan Pérez"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setInfo(null);
            }}
            className="text-primary hover:underline"
          >
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Ingresa"}
          </button>
          <div>
            <button
              type="button"
              onClick={handleResend}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Reenviar correo de confirmación
            </button>
          </div>
        </div>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}

// Asegura que exista una fila en profiles para este usuario.
async function ensureProfile(userId: string, email: string, fullName: string) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (!existing) {
    await supabase.from("profiles").insert({
      id: userId,
      email: email.toLowerCase(),
      full_name: fullName || null,
    });
  }
}
