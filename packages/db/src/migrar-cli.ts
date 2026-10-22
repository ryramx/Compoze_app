import { migrar } from "./migrar";

const url = process.env.DATABASE_URL ?? "postgres://compoze:compoze@localhost:5432/compoze";
await migrar(url);
console.log("Migrações aplicadas.");
