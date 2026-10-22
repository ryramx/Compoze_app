import { hash, verify } from "@node-rs/argon2";

// argon2id com os parâmetros recomendados pela OWASP (19 MiB, 2 passadas).
const PARAMETROS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const gerarHash = (senha: string) => hash(senha, PARAMETROS);

export async function conferir(hashGuardado: string | null, senha: string): Promise<boolean> {
  if (!hashGuardado) {
    // Faz o mesmo trabalho de quando a conta existe, para que o tempo de
    // resposta não revele quais e-mails estão cadastrados.
    await hash(senha, PARAMETROS);
    return false;
  }
  return verify(hashGuardado, senha).catch(() => false);
}
