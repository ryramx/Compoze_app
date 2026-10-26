import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { projects } from "./projects";
import { carimbos, idPrimario } from "./tipos";

/**
 * Livro-caixa do projeto (ADR 0021): entradas lançadas à mão e custos
 * itemizados. Entrada soma em `projects.funding_current` na mesma transação,
 * como o apoio por PIX confirmado (ADR 0018).
 */
export const projectEntries = pgTable(
  "project_entries",
  {
    id: idPrimario(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["ENTRADA", "CUSTO"] }).notNull(),
    description: text("description").notNull(),
    category: text("category"),
    // Reais inteiros, como o resto do projeto.
    amount: integer("amount").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }),
    ...carimbos,
  },
  (t) => [
    index("project_entries_project_idx").on(t.projectId, t.kind),
    check("project_entries_valor_check", sql`${t.amount} > 0`),
    check("project_entries_descricao_check", sql`char_length(${t.description}) BETWEEN 1 AND 160`),
  ],
);
