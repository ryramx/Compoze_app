import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Aparelhos que aceitaram receber avisos com o Compoze fechado (ADR 0016).
 * Uma linha por inscrição: o mesmo navegador, se trocar de conta, troca de dona.
 *
 * `kind` já separa o Web Push (navegador e PWA, com `p256dh` e `auth`) do
 * Firebase, que o app Android vai usar: lá o `endpoint` guarda o token.
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: idPrimario(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["WEBPUSH", "FCM"] }).notNull().default("WEBPUSH"),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh"),
    auth: text("auth"),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

/**
 * Chaves que o próprio servidor gera na primeira vez que precisa e guarda
 * para sempre: hoje, o par VAPID do Web Push. Trocá-lo invalidaria todas as
 * inscrições, por isso não pode nascer de novo a cada deploy.
 */
export const serverKeys = pgTable("server_keys", {
  name: text("name").primaryKey(),
  value: text("value").notNull(),
  createdAt: quando("created_at").notNull().defaultNow(),
});
