import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Apoio a projeto por PIX (Fase 4d, ADR 0018). O dinheiro vai direto da conta
 * de quem apoia para a chave PIX da dona do projeto; o Compoze só monta o
 * QR Code e anota o que ela confirmou ter recebido.
 *
 * A chave fica numa tabela à parte: `projects` sai inteiro em várias rotas, e
 * a chave (às vezes um CPF) só deve sair para quem vai pagar.
 */
export const projectPix = pgTable(
  "project_pix",
  {
    projectId: uuid("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
    keyType: text("key_type", { enum: ["CPF", "CNPJ", "PHONE", "EMAIL", "EVP"] }).notNull(),
    key: text("key").notNull(),
    // Como o banco de quem paga mostra quem recebe. O padrão do PIX corta em 25 e 15.
    receiverName: text("receiver_name").notNull(),
    city: text("city").notNull(),
    open: boolean("open").notNull().default(true),
    updatedAt: quando("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("project_pix_nome_check", sql`char_length(${t.receiverName}) BETWEEN 1 AND 25`),
    check("project_pix_cidade_check", sql`char_length(${t.city}) BETWEEN 1 AND 15`),
  ],
);

export const projectContributions = pgTable(
  "project_contributions",
  {
    id: idPrimario(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    supporterId: uuid("supporter_id").references(() => users.id, { onDelete: "set null" }),
    // Reais inteiros, como o resto do projeto.
    amount: integer("amount").notNull(),
    // Vai no QR Code (campo txid): a dona acha o apoio no extrato do banco.
    txid: text("txid").notNull().unique(),
    status: text("status", { enum: ["PENDENTE", "CONFIRMADO", "RECUSADO"] }).notNull().default("PENDENTE"),
    paidClaimedAt: quando("paid_claimed_at"),
    decidedAt: quando("decided_at"),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("project_contributions_project_idx").on(t.projectId, t.createdAt),
    index("project_contributions_supporter_idx").on(t.supporterId),
    check("project_contributions_valor_check", sql`${t.amount} > 0`),
  ],
);
