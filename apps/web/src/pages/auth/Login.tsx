import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Botao } from "@/components/ui/Botao";
import { Campo, Entrada } from "@/components/ui/Campo";
import { emailDemo, SENHA_DEMO } from "@/demo/semente";
import { ApiError, MODO_DEMO } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import { AuthLayout } from "./AuthLayout";

export default function Login() {
  const entrar = useAuth((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Para onde a pessoa ia antes de ser mandada ao login. Devolvê-la ao destino
  // original evita que um link compartilhado sempre termine na Mesa.
  const destino = (location.state as { from?: string } | null)?.from ?? "/";

  async function autenticar(e: string, s: string) {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(e, s);
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void autenticar(email, senha);
  }

  return (
    <AuthLayout
      titulo="Bom te ver."
      subtitulo="Suas composições estão do jeito que você deixou."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="link-sublinhado text-tinta">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-6" noValidate>
        <Campo rotulo="E-mail">
          {(id) => (
            <Entrada id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          )}
        </Campo>
        <Campo rotulo="Senha" erro={erro}>
          {(id) => (
            <Entrada id={id} type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          )}
        </Campo>
        <Botao type="submit" variante="tinta" tamanho="lg" className="w-full justify-center" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>
      </form>

      {MODO_DEMO && (
        <div className="mt-8 border-l-2 border-lapis pl-4 text-sm text-tinta-2">
          <p>
            <span className="font-medium text-tinta">Modo demonstração.</span> Nada sai do seu navegador.
          </p>
          <button
            onClick={() => void autenticar(emailDemo("laramendes"), SENHA_DEMO)}
            className="link-sublinhado mt-1 text-lapis"
            disabled={enviando}
          >
            Entrar como Lara Mendes, compositora de exemplo
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
