import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { AvisoAcordando } from "@/components/compoze/AvisoAcordando";
import { Botao } from "@/components/ui/Botao";
import { Campo, Entrada } from "@/components/ui/Campo";
import { acordarApi } from "@/lib/acordar";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/authStore";
import { AuthLayout } from "./AuthLayout";

// Mesma regra do contrato da API: o usuário entra na URL do perfil.
const USUARIO_VALIDO = /^[a-z0-9_.-]{3,30}$/;

export default function Register() {
  const cadastrar = useAuth((s) => s.register);
  const navigate = useNavigate();
  const location = useLocation();
  // Quem veio de um link (um convite, por exemplo) volta para ele depois.
  const destino = (location.state as { from?: string } | null)?.from ?? "/";
  const deConvite = destino.startsWith("/convite/");

  const [dados, setDados] = useState({ name: "", username: "", email: "", password: "" });
  const [erros, setErros] = useState<Partial<Record<keyof typeof dados | "geral", string>>>({});
  const [enviando, setEnviando] = useState(false);

  // Acorda a API enquanto a pessoa digita (Render grátis dorme sem uso).
  useEffect(acordarApi, []);

  const mudar = (campo: keyof typeof dados) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDados((d) => ({ ...d, [campo]: campo === "username" ? e.target.value.toLowerCase() : e.target.value }));

  function validar() {
    const e: typeof erros = {};
    if (!dados.name.trim()) e.name = "Como você assina suas canções?";
    if (!USUARIO_VALIDO.test(dados.username)) e.username = "De 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou _.";
    if (!/^\S+@\S+\.\S+$/.test(dados.email)) e.email = "Informe um e-mail válido.";
    if (dados.password.length < 8) e.password = "Use pelo menos 8 caracteres.";
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    setEnviando(true);
    try {
      await cadastrar({ ...dados, name: dados.name.trim() });
      navigate(destino, { replace: true });
    } catch (err) {
      setErros({
        geral:
          err instanceof ApiError && err.status !== 0
            ? err.message
            : "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      titulo="Abra seu caderno."
      subtitulo={
        deConvite
          ? "Crie sua conta e o convite já te leva para a canção."
          : "Uma conta para escrever sozinho ou com quem você quiser."
      }
      rodape={
        <>
          Já tem conta?{" "}
          <Link to="/login" state={location.state} className="link-sublinhado text-tinta">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={enviar} className="space-y-6" noValidate>
        <Campo rotulo="Nome artístico" erro={erros.name}>
          {(id) => <Entrada id={id} autoComplete="name" value={dados.name} onChange={mudar("name")} placeholder="Como aparece nos créditos" />}
        </Campo>
        <Campo rotulo="Usuário" erro={erros.username} dica={dados.username ? `compoze.app/@${dados.username}` : undefined}>
          {(id) => <Entrada id={id} autoComplete="username" value={dados.username} onChange={mudar("username")} placeholder="seu.nome" />}
        </Campo>
        <Campo rotulo="E-mail" erro={erros.email}>
          {(id) => <Entrada id={id} type="email" autoComplete="email" value={dados.email} onChange={mudar("email")} placeholder="voce@exemplo.com" />}
        </Campo>
        <Campo rotulo="Senha" erro={erros.password ?? erros.geral}>
          {(id) => <Entrada id={id} type="password" autoComplete="new-password" value={dados.password} onChange={mudar("password")} />}
        </Campo>
        <Botao type="submit" variante="tinta" tamanho="lg" className="w-full justify-center" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta"}
        </Botao>
        <AvisoAcordando ativo={enviando} />
      </form>
    </AuthLayout>
  );
}
