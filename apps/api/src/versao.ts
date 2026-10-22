import { createRequire } from "node:module";

export const VERSAO: string = createRequire(import.meta.url)("../package.json").version;
