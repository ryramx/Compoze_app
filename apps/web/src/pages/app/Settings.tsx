import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Cabecalho } from "@/components/compoze/Cabecalho";
import { Confirmar } from "@/components/compoze/Confirmar";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { AreaDeTexto, Campo, Entrada } from "@/components/ui/Campo";
import { MODO_DEMO } from "@/lib/api";
import { cn } from "@/lib/cn";
import { definirTema, useTema, type Tema } from "@/lib/tema";
import { useAuth } from "@/store/authStore";
import { useCompoze } from "@/store/compozeStore";

const BIO_MAX = 280;

function Bloco({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-linha py-10 md:grid-cols-[240px_minmax(0,1fr)] md:gap-12">
      <div>
        <h2 className="font-serif text-[1.45rem] leading-tight">{titulo}</h2>
        <p className="mt-1.5 text-[13.5px] text-tinta-3">{descricao}</p>
      </div>
      <div className="max-w-lg">{children}</div>
    </section>
  );
}

export default function Settings() {
  const eu = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId));
  const atualizarEu = useCompoze((s) => s.updateCurrentUser);
  const hidratar = useCompoze((s) => s.hydrate);
  const limpar = useCompoze((s) => s.limpar);
  const sair = useAuth((s) => s.logout);
  const navegar = useNavigate();
  const [tema] = useTema();
  const [nome, setNome] = useState(eu?.name ?? "");
  const [bio, setBio] = useState(eu?.bio ?? "");
  const [cidade, setCidade] = useState(eu?.location.city ?? "");
  const [pais, setPais] = useState(eu?.location.country ?? "");
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [restaurando, setRestaurando] = useState(false);

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErroNome("Informe um nome.");
      return;
    }
    setErroNome(null);
    atualizarEu({
      name: nome.trim(),
      bio: bio.trim(),
      location: { ...(eu?.location ?? { lat: 0, lng: 0 }), city: cidade.trim(), country: pais.trim() },
    });
    toast("Perfil atualizado.");
  }

  async function restaurarExemplo() {
    const { restaurarDadosDeExemplo } = await import("@/demo/servidor");
    restaurarDadosDeExemplo();
    limpar();
    if (eu) await hidratar(eu.id);
    toast("Dados de exemplo restaurados.");
    navegar("/");
  }

  return (
    <Pagina>
      <Cabecalho titulo="Ajustes" />

      <Bloco titulo="Perfil" descricao="Como você aparece nos créditos, no mapa e para quem escreve com você.">
        <form onSubmit={salvar} className="space-y-6">
          <Campo rotulo="Nome artístico" erro={erroNome}>
            {(id) => <Entrada id={id} value={nome} onChange={(e) => setNome(e.target.value)} />}
          </Campo>
          <Campo rotulo="Sobre você" dica={<span className="numeral">{bio.length}/{BIO_MAX}</span>}>
            {(id) => <AreaDeTexto id={id} rows={3} maxLength={BIO_MAX} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="O que você escreve, toca, procura." />}
          </Campo>
          <div className="grid gap-6 sm:grid-cols-2">
            <Campo rotulo="Cidade">{(id) => <Entrada id={id} value={cidade} onChange={(e) => setCidade(e.target.value)} />}</Campo>
            <Campo rotulo="País">{(id) => <Entrada id={id} value={pais} onChange={(e) => setPais(e.target.value)} />}</Campo>
          </div>
          <Botao type="submit" variante="tinta">
            Salvar perfil
          </Botao>
        </form>
      </Bloco>

      <Bloco titulo="Aparência" descricao="Papel de dia, tinta de noite — ou o que o seu sistema mandar.">
        <div className="flex" role="radiogroup" aria-label="Tema">
          {(
            [
              ["claro", "Papel"],
              ["escuro", "Noite"],
              ["sistema", "Sistema"],
            ] as [Tema, string][]
          ).map(([v, r]) => (
            <button
              key={v}
              role="radio"
              aria-checked={tema === v}
              onClick={() => definirTema(v)}
              className={cn(
                "-ml-px flex-1 border px-4 py-2.5 text-sm first:ml-0",
                tema === v ? "relative z-10 border-tinta bg-tinta text-papel" : "border-linha-forte text-tinta-2 hover:text-tinta",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </Bloco>

      {MODO_DEMO && (
        <Bloco titulo="Demonstração" descricao="Os dados desta versão vivem só no seu navegador.">
          <p className="mb-4 text-[14px] text-tinta-2">Voltar ao caderno de exemplo apaga tudo o que foi criado ou editado aqui.</p>
          <Botao variante="perigo" onClick={() => setRestaurando(true)}>
            Restaurar dados de exemplo
          </Botao>
        </Bloco>
      )}

      <Bloco titulo="Sessão" descricao="Sair deste navegador.">
        <Botao
          onClick={() => {
            sair();
            navegar("/login");
          }}
        >
          Sair do Compoze
        </Botao>
      </Bloco>

      <Confirmar
        aberto={restaurando}
        aoMudar={setRestaurando}
        titulo="Restaurar dados de exemplo?"
        descricao="Tudo o que foi criado ou editado nesta demonstração será substituído pelo caderno de exemplo."
        acao="Restaurar"
        aoConfirmar={() => void restaurarExemplo()}
      />
    </Pagina>
  );
}
