import { describe, expect, it } from "vitest";

import {
  blocoDaApi,
  corDeAutor,
  musicaDaApi,
  pastaDaApi,
  patchDeMusicaParaApi,
  projetoDaApi,
  statusDaApi,
  statusParaApi,
  tipoDeBlocoDaApi,
  tipoDeBlocoParaApi,
  usuarioDaApi,
} from "@/services/api/adapters";
import type { ApiProjectDetail, ApiSongDetail, ApiUserMe } from "@/services/api/dto";

const musicaApi: ApiSongDetail = {
  id: "s1",
  title: "Noite de Verao",
  status: "ESCRITA",
  visibility: "PRIVATE",
  owner_id: "u1",
  folder_id: "f1",
  musical_key: "Am",
  bpm: 92,
  time_signature: "4/4",
  tags: ["mpb"],
  contributions_confirmed: false,
  deleted_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  description: null,
  blocks: [
    {
      id: "b1",
      type: "LYRIC",
      label: null,
      content: "A noite cai",
      position: 0,
      author_id: "u1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  collaborators: [
    { id: "c1", user_id: "u2", role: "LYRICIST", contribution_percent: 40 },
    { id: "c2", user_id: "u3", role: "COMPOSER", contribution_percent: null },
  ],
};

describe("status", () => {
  it("traduz nos dois sentidos sem perder valor", () => {
    for (const s of ["ideia", "escrita", "revisao", "finalizada", "registrada", "gravada"] as const) {
      expect(statusDaApi(statusParaApi(s))).toBe(s);
    }
  });

  it("status desconhecido nao quebra a tela", () => {
    expect(statusDaApi("INVENTADO" as never)).toBe("ideia");
  });
});

describe("tipo de bloco", () => {
  it("traduz nos dois sentidos sem perder valor", () => {
    for (const t of ["section", "chord-line", "lyric-line", "note"] as const) {
      expect(tipoDeBlocoDaApi(tipoDeBlocoParaApi(t))).toBe(t);
    }
  });
});

describe("bloco", () => {
  it("renomeia content para text", () => {
    const bloco = blocoDaApi(musicaApi.blocks[0]);
    expect(bloco.text).toBe("A noite cai");
    expect(bloco.authorId).toBe("u1");
    expect(bloco.type).toBe("lyric-line");
  });

  it("label ausente vira undefined, nao null", () => {
    expect(blocoDaApi(musicaApi.blocks[0]).label).toBeUndefined();
  });
});

describe("musica", () => {
  it("mapeia owner_id para creatorId", () => {
    expect(musicaDaApi(musicaApi).creatorId).toBe("u1");
  });

  it("PRIVATE vira hidden", () => {
    expect(musicaDaApi(musicaApi).hidden).toBe(true);
  });

  it("PUBLIC e UNLISTED nao ficam ocultas", () => {
    expect(musicaDaApi({ ...musicaApi, visibility: "PUBLIC" }).hidden).toBe(false);
    expect(musicaDaApi({ ...musicaApi, visibility: "UNLISTED" }).hidden).toBe(false);
  });

  it("percentual indefinido vira 0 na tela", () => {
    const colaboradores = musicaDaApi(musicaApi).collaborators;
    expect(colaboradores).toEqual([
      { userId: "u2", percentage: 40 },
      { userId: "u3", percentage: 0 },
    ]);
  });

  it("resumo sem blocos nao quebra", () => {
    const { blocks, collaborators, description, ...resumo } = musicaApi;
    const musica = musicaDaApi(resumo);
    expect(musica.blocks).toEqual([]);
    expect(musica.collaborators).toEqual([]);
  });

  it("campos nulos viram undefined", () => {
    const musica = musicaDaApi({ ...musicaApi, folder_id: null, bpm: null, musical_key: null });
    expect(musica.folderId).toBeUndefined();
    expect(musica.bpm).toBeUndefined();
    expect(musica.key).toBeUndefined();
  });
});

describe("patch de musica para a API", () => {
  it("envia apenas os campos presentes no patch", () => {
    expect(patchDeMusicaParaApi({ bpm: 120 })).toEqual({ bpm: 120 });
  });

  it("nao envia nada para um patch vazio", () => {
    expect(patchDeMusicaParaApi({})).toEqual({});
  });

  it("converte status para maiusculas", () => {
    expect(patchDeMusicaParaApi({ status: "finalizada" })).toEqual({ status: "FINALIZADA" });
  });

  it("hidden vira PRIVATE ou PUBLIC, nunca UNLISTED", () => {
    expect(patchDeMusicaParaApi({ hidden: true })).toEqual({ visibility: "PRIVATE" });
    expect(patchDeMusicaParaApi({ hidden: false })).toEqual({ visibility: "PUBLIC" });
  });

  it("undefined explicito vira null, para limpar o campo", () => {
    expect(patchDeMusicaParaApi({ folderId: undefined })).toEqual({ folder_id: null });
  });

  it("renomeia key e timeSignature", () => {
    expect(patchDeMusicaParaApi({ key: "C", timeSignature: "3/4" })).toEqual({
      musical_key: "C",
      time_signature: "3/4",
    });
  });
});

describe("pasta", () => {
  it("parent_id nulo vira undefined", () => {
    const pasta = pastaDaApi({
      id: "f1",
      name: "Ideias",
      parent_id: null,
      owner_id: "u1",
      created_at: "",
      updated_at: "",
    });
    expect(pasta.parentId).toBeUndefined();
    expect(pasta.ownerId).toBe("u1");
  });
});

describe("projeto", () => {
  const projetoApi: ApiProjectDetail = {
    id: "p1",
    name: "Album 2027",
    description: null,
    type: "ALBUM",
    status: "PRODUCAO",
    style: "BANDA",
    release_date: null,
    cover_url: null,
    estimated_cost: 5000,
    funding_target: 10000,
    funding_current: 2500,
    owner_id: "u1",
    deleted_at: null,
    created_at: "",
    updated_at: "",
    songs: [{ song_id: "s1", track_number: 1 }],
  };

  it("calcula o percentual a partir do valor absoluto", () => {
    expect(projetoDaApi(projetoApi).fundingProgress).toBe(25);
  });

  it("meta zero nao divide por zero", () => {
    expect(projetoDaApi({ ...projetoApi, funding_target: 0 }).fundingProgress).toBe(0);
    expect(projetoDaApi({ ...projetoApi, funding_target: null }).fundingProgress).toBe(0);
  });

  it("nao passa de 100 por cento", () => {
    expect(projetoDaApi({ ...projetoApi, funding_current: 99999 }).fundingProgress).toBe(100);
  });

  it("extrai os ids das musicas da relacao", () => {
    expect(projetoDaApi(projetoApi).songIds).toEqual(["s1"]);
  });
});

describe("usuario", () => {
  const usuarioApi: ApiUserMe = {
    id: "u1",
    name: "Ryan",
    username: "ryan",
    bio: null,
    avatar_url: null,
    city: "Salvador",
    state: "BA",
    country: "Brasil",
    instruments: [],
    specialties: [],
    genres: [],
    external_links: [],
    created_at: "",
    email: "ryan@exemplo.com",
    show_on_map: false,
    latitude: -12.97,
    longitude: -38.5,
  };

  it("monta a localizacao a partir de campos separados", () => {
    expect(usuarioDaApi(usuarioApi).location).toEqual({
      city: "Salvador",
      country: "Brasil",
      lat: -12.97,
      lng: -38.5,
    });
  });

  it("perfil publico sem coordenadas vira 0,0", () => {
    const { latitude, longitude, email, show_on_map, ...publico } = usuarioApi;
    const user = usuarioDaApi(publico);
    expect(user.location.lat).toBe(0);
    expect(user.location.lng).toBe(0);
  });

  it("cor de autor e estavel para o mesmo id", () => {
    expect(corDeAutor("abc")).toBe(corDeAutor("abc"));
  });

  it("cor de autor fica sempre na faixa valida", () => {
    for (const id of ["a", "bb", "ccc", "u1", "9f2c1d", ""]) {
      expect(corDeAutor(id)).toBeGreaterThanOrEqual(1);
      expect(corDeAutor(id)).toBeLessThanOrEqual(5);
    }
  });
});
