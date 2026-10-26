import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Cabecalho } from "@/components/compoze/Cabecalho";
import { Confirmar } from "@/components/compoze/Confirmar";
import { EscolherImagem } from "@/components/compoze/EscolherImagem";
import { Monograma } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { AreaDeTexto, Campo, Entrada } from "@/components/ui/Campo";
import { useAjuda } from "@/lib/ajuda";
import { MODO_DEMO } from "@/lib/api";
import { baixarVersaoNova, maisNova, ultimaVersao, versaoInstalada } from "@/lib/atualizacao";
import { desligarAvisos, estadoDosAvisos, ligarAvisos, suportaAvisos, type EstadoDosAvisos } from "@/lib/avisos";
import { cn } from "@/lib/cn";
import { NATIVO } from "@/lib/nativo";
import { trocarSenha } from "@/services/api/authService";
import { definirTema, useTema, type Tema } from "@/lib/tema";
import { useAuth } from "@/store/authStore";
import { useCompoze } from "@/store/compozeStore";

const BIO_MAX = 280;

/** Versão do APK e busca por atualização (Fase 3b, só no app Android). */
function VersaoDoApp() {
  const [instalada, setInstalada] = useState<string | null>(null);
  const [estado, setEstado] = useState<"parado" | "procurando" | "em-dia" | "sem-rede" | string>("parado");

  useEffect(() => {
    void versaoInstalada().then(setInstalada);
  }, []);

  async function procurar() {
    setEstado("procurando");
    const nova = await ultimaVersao();
    if (!nova || !instalada) setEstado("sem-rede");
    else setEstado(maisNova(nova, instalada) ? nova : "em-dia");
  }

  const novaVersao = !["parado", "procurando", "em-dia", "sem-rede"].includes(estado);
  return (
    <>
      <p className="mb-4 text-[14px] text-tinta-2">
        Versão instalada: <span className="font-mono">{instalada ?? "…"}</span>
        {estado === "em-dia" && " · é a mais nova."}
        {estado === "sem-rede" && " · sem conexão para conferir agora."}
        {novaVersao && ` · a ${estado} já saiu.`}
      </p>
      {novaVersao ? (
        <Botao variante="tinta" onClick={baixarVersaoNova}>
          Baixar a versão {estado}
        </Botao>
      ) : (
        <Botao onClick={() => void procurar()} disabled={estado === "procurando"}>
          {estado === "procurando" ? "Procurando…" : "Procurar atualização"}
        </Botao>
      )}
    </>
  );
}

/** Avisos com o app fechado, por aparelho (Fase 3d, ADR 0016). */
function AvisosDoAparelho() {
  const [estado, setEstado] = useState<EstadoDosAvisos | null>(null);
  const [mexendo, setMexendo] = useState(false);

  useEffect(() => {
    void estadoDosAvisos().then(setEstado);
  }, []);

  async function trocar() {
    setMexendo(true);
    try {
      if (estado === "ligado") {
        await desligarAvisos();
        setEstado("desligado");
      } else {
        const novo = await ligarAvisos();
        setEstado(novo);
        if (novo === "ligado") toast("Avisos ligados neste aparelho.");
      }
    } catch {
      toast.error("Não deu para ligar os avisos agora. Confira a internet e tente de novo.");
    } finally {
      setMexendo(false);
    }
  }

  if (estado === null) return null;
  const textos: Record<EstadoDosAvisos, string> = {
    ligado: "Ligados neste aparelho.",
    desligado: "Desligados neste aparelho.",
    bloqueado: "O navegador está bloqueando os avisos do Compoze. Libere nas configurações do site (o cadeado ao lado do endereço) e volte aqui.",
    "sem-servidor": "O servidor ainda não está pronto para avisos no Android. Assim que estiver, é só voltar aqui.",
    "sem-suporte": "Este navegador não recebe avisos. No iPhone, instale o Compoze na tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá.",
  };
  return (
    <>
      <p className="mb-4 text-[14px] text-tinta-2">{textos[estado]}</p>
      {(estado === "ligado" || estado === "desligado") && (
        <Botao variante={estado === "ligado" ? "contorno" : "tinta"} onClick={() => void trocar()} disabled={mexendo}>
          {mexendo ? "Um momento…" : estado === "ligado" ? "Desligar avisos" : "Ligar avisos"}
        </Botao>
      )}
    </>
  );
}

/** Senha nova sem a atual (ADR 0019): as outras sessões caem. */
function RedefinirSenha() {
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nova.length < 8) return setErro("A senha precisa de pelo menos 8 caracteres.");
    if (nova !== repetida) return setErro("As duas senhas não são iguais.");
    setErro(null);
    setEnviando(true);
    try {
      await trocarSenha(nova);
      setNova("");
      setRepetida("");
      toast("Senha redefinida. Nos outros aparelhos, entre de novo com a senha nova.");
    } catch {
      toast.error("Não deu para redefinir a senha agora. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className="space-y-6" noValidate>
      <Campo rotulo="Senha nova" dica="Pelo menos 8 caracteres.">
        {(id) => <Entrada id={id} type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />}
      </Campo>
      <Campo rotulo="Repita a senha nova" erro={erro}>
        {(id) => <Entrada id={id} type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />}
      </Campo>
      <Botao type="submit" variante="tinta" disabled={enviando || !nova}>
        {enviando ? "Redefinindo…" : "Redefinir senha"}
      </Botao>
    </form>
  );
}

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
  const trocarFoto = useCompoze((s) => s.trocarFoto);
  const hidratar = useCompoze((s) => s.hydrate);
  const limpar = useCompoze((s) => s.limpar);
  const sair = useAuth((s) => s.logout);
  const navegar = useNavigate();
  const abrirTour = useAjuda((s) => s.abrirTour);
  const abrirAjuda = useAjuda((s) => s.abrirPainel);
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
    await restaurarDadosDeExemplo();
    limpar();
    if (eu) await hidratar(eu.id);
    toast("Dados de exemplo restaurados.");
    navegar("/");
  }

  return (
    <Pagina>
      <Cabecalho titulo="Ajustes" />

      <Bloco titulo="Perfil" descricao="Como você aparece nos créditos, no mapa e para quem escreve com você.">
        <div className="mb-8 flex items-center gap-5">
          <Monograma usuario={eu} tamanho="lg" />
          <EscolherImagem temImagem={!!eu?.avatar} rotuloTrocar={eu?.avatar ? "Trocar foto" : "Pôr uma foto"} rotuloTirar="Tirar foto" trocar={trocarFoto} />
        </div>
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

      {suportaAvisos() && (
        <Bloco titulo="Avisos" descricao="Mensagem nova e convite para canção aparecem no aparelho mesmo com o Compoze fechado.">
          <AvisosDoAparelho />
        </Bloco>
      )}

      {MODO_DEMO && (
        <Bloco titulo="Demonstração" descricao="Os dados desta versão vivem só no seu navegador.">
          <p className="mb-4 text-[14px] text-tinta-2">Voltar ao caderno de exemplo apaga tudo o que foi criado ou editado aqui.</p>
          <Botao variante="perigo" onClick={() => setRestaurando(true)}>
            Restaurar dados de exemplo
          </Botao>
        </Bloco>
      )}

      {NATIVO && (
        <Bloco titulo="Aplicativo" descricao="O app Android não se atualiza sozinho; a versão nova é um APK novo.">
          <VersaoDoApp />
        </Bloco>
      )}

      {!MODO_DEMO && (
        <Bloco titulo="Senha" descricao="Escolha uma senha nova. Este aparelho continua dentro; nos outros, é preciso entrar de novo.">
          <RedefinirSenha />
        </Bloco>
      )}

      <Bloco titulo="Ajuda" descricao="O passeio do primeiro acesso e a explicação de cada tela.">
        <div className="flex flex-wrap gap-2">
          <Botao onClick={abrirTour}>Rever os primeiros passos</Botao>
          <Botao variante="texto" onClick={abrirAjuda}>
            Ajuda desta tela
          </Botao>
        </div>
      </Bloco>

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
