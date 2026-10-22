import { index, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

import { idPrimario, sincronizavel } from "./tipos";
import { users } from "./users";

export const folders = pgTable(
  "folders",
  {
    id: idPrimario(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Ciclos (A dentro de B dentro de A) são barrados pelo gatilho `compoze_pasta_sem_ciclo`.
    parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    ...sincronizavel,
  },
  (t) => [index("folders_owner_idx").on(t.ownerId, t.deletedAt)],
);
