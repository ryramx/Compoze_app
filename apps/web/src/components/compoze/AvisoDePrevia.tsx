/**
 * Aviso de que a tela usa dados de exemplo. Conversas são a Fase 4b e ainda
 * não têm backend; a tela existe para validar o desenho, e dizer isso evita
 * que alguém ache que a mensagem foi enviada.
 */
export function AvisoDePrevia() {
  return (
    <p className="mt-6 border-l-2 border-lapis pl-3 text-[13px] text-tinta-2">
      Prévia com dados de exemplo. Esta parte ainda não grava no servidor.
    </p>
  );
}
