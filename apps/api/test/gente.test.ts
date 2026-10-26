import { describe, expect, it } from "vitest";

import { uuidv7 } from "../src/lib/uuidv7";
import { como, convidarEAceitar, novaPessoa, usarApp } from "./ajuda";

const ctx = usarApp();

async function duas() {
  const ana = await novaPessoa(ctx.app, "Ana");
  const bia = await novaPessoa(ctx.app, "Bia");
  return { ana, bia, deAna: como(ctx.app, ana.token), deBia: como(ctx.app, bia.token) };
}

describe("seguir (ADR 0013)", () => {
  it("seguir aparece no perfil dos dois lados, e repetir não conta duas vezes", async () => {
    const { ana, bia, deAna, deBia } = await duas();
    expect((await deAna.put(`/users/${bia.id}/follow`)).statusCode).toBe(204);
    expect((await deAna.put(`/users/${bia.id}/follow`)).statusCode).toBe(204);

    expect((await deAna.get(`/profiles/${bia.username}`)).json()).toMatchObject({ id: bia.id, followers_count: 1, following_count: 0, followed_by_me: true, follows_me: false });
    expect((await deBia.get(`/profiles/${ana.username}`)).json()).toMatchObject({ following_count: 1, followed_by_me: false, follows_me: true });
    expect((await deBia.get(`/users/${bia.id}/followers`)).json().map((u: { id: string }) => u.id)).toEqual([ana.id]);
    expect((await deBia.get(`/users/${ana.id}/following`)).json().map((u: { id: string }) => u.id)).toEqual([bia.id]);

    expect((await deAna.delete(`/users/${bia.id}/follow`)).statusCode).toBe(204);
    expect((await deAna.get(`/profiles/${bia.username}`)).json().followers_count).toBe(0);
  });

  it("as listas dizem, para cada pessoa, se eu sigo e se ela me segue", async () => {
    const { ana, bia, deAna, deBia } = await duas();
    const cris = await novaPessoa(ctx.app, "Cris");
    await deBia.put(`/users/${ana.id}/follow`);
    await como(ctx.app, cris.token).put(`/users/${ana.id}/follow`);
    await deAna.put(`/users/${cris.id}/follow`);

    // Seguidores da Ana, vistos pela Ana: a Bia ganha "Seguir de volta", a Cris já é seguida.
    const seguidores = (await deAna.get(`/users/${ana.id}/followers`)).json();
    expect(seguidores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: bia.id, followed_by_me: false, follows_me: true }),
        expect.objectContaining({ id: cris.id, followed_by_me: true, follows_me: true }),
      ]),
    );
    // A mesma lista vista pela Bia: ela mesma aparece, e a Cris não se relaciona com ela.
    const vistaPelaBia = (await deBia.get(`/users/${ana.id}/followers`)).json();
    expect(vistaPelaBia.find((u: { id: string }) => u.id === cris.id)).toMatchObject({ followed_by_me: false, follows_me: false });
    expect((await deBia.get(`/users/${ana.id}/following`)).json()).toEqual([expect.objectContaining({ id: cris.id, followed_by_me: false })]);
  });

  it("não segue a si mesma nem quem não existe", async () => {
    const { ana, deAna } = await duas();
    expect((await deAna.put(`/users/${ana.id}/follow`)).statusCode).toBe(422);
    expect((await deAna.put(`/users/${uuidv7()}/follow`)).statusCode).toBe(404);
  });

  it("sugere quem escreve comigo e eu ainda não sigo", async () => {
    const { bia, deAna } = await duas();
    const cancao = (await deAna.post("/songs", { title: "Parceria" })).json();
    await convidarEAceitar(ctx.app, deAna, cancao.id, bia);
    expect((await deAna.get("/suggestions/people")).json().map((u: { id: string }) => u.id)).toEqual([bia.id]);
    await deAna.put(`/users/${bia.id}/follow`);
    expect((await deAna.get("/suggestions/people")).json()).toEqual([]);
  });
});

describe("mural (ADR 0013)", () => {
  it("mostra o meu e o de quem eu sigo, do mais novo ao mais antigo, em páginas", async () => {
    const { ana, bia, deAna, deBia } = await duas();
    const carla = await novaPessoa(ctx.app, "Carla");
    await como(ctx.app, carla.token).post("/posts", { content: "ninguém me segue" });
    await deAna.put(`/users/${bia.id}/follow`);
    for (const t of ["um", "dois", "três"]) await deBia.post("/posts", { content: `Bia ${t}` });
    await deAna.post("/posts", { content: "Ana fala" });

    const p1 = (await deAna.get("/feed?limit=3")).json();
    expect(p1.items.map((p: { content: string }) => p.content)).toEqual(["Ana fala", "Bia três", "Bia dois"]);
    expect(p1.items[0].author).toMatchObject({ id: ana.id, username: ana.username });
    expect(p1.items[0].author).not.toHaveProperty("email");
    const p2 = (await deAna.get(`/feed?limit=3&before=${p1.next_cursor}`)).json();
    expect(p2.items.map((p: { content: string }) => p.content)).toEqual(["Bia um"]);
    expect(p2.next_cursor).toBeNull();

    // O mural do perfil: só dela, para qualquer conta.
    const daCarla = (await deBia.get(`/feed?author_id=${carla.id}`)).json();
    expect(daCarla.items.map((p: { content: string }) => p.content)).toEqual(["ninguém me segue"]);
  });

  it("publicar com id do aparelho não duplica, e só quem publicou apaga", async () => {
    const { deAna, deBia } = await duas();
    const id = uuidv7();
    expect((await deAna.post("/posts", { id, content: "  com espaço  " })).statusCode).toBe(201);
    const de_novo = await deAna.post("/posts", { id, content: "com espaço" });
    expect(de_novo.statusCode).toBe(200);
    expect(de_novo.json().content).toBe("com espaço");
    expect((await deBia.post("/posts", { id, content: "roubando o id" })).statusCode).toBe(409);
    expect((await deAna.post("/posts", { content: "   " })).statusCode).toBe(422);

    expect((await deBia.delete(`/posts/${id}`)).statusCode).toBe(403);
    expect((await deAna.delete(`/posts/${id}`)).statusCode).toBe(204);
    expect((await deAna.get(`/posts/${id}`)).statusCode).toBe(404);
  });

  it("cita canção que não é privada, e esconde se ela virar privada", async () => {
    const { deAna, deBia } = await duas();
    const cancao = (await deAna.post("/songs", { title: "Aberta" })).json();
    expect((await deAna.post("/posts", { content: "olha", song_id: cancao.id })).statusCode).toBe(422);
    await deAna.patch(`/songs/${cancao.id}`, { visibility: "PUBLIC" });
    // Quem não escreve a canção não cita.
    expect((await deBia.post("/posts", { content: "dela", song_id: cancao.id })).statusCode).toBe(404);

    const post = (await deAna.post("/posts", { content: "olha", song_id: cancao.id })).json();
    expect(post.song).toEqual({ id: cancao.id, title: "Aberta", status: "IDEIA" });
    await deAna.patch(`/songs/${cancao.id}`, { visibility: "PRIVATE" });
    expect((await deBia.get(`/posts/${post.id}`)).json().song).toBeNull();
  });

  it("curtir conta uma vez por pessoa; comentários em ordem, apagados por quem comentou ou publicou", async () => {
    const { deAna, deBia } = await duas();
    const carla = await novaPessoa(ctx.app, "Carla");
    const deCarla = como(ctx.app, carla.token);
    const post = (await deAna.post("/posts", { content: "refrão novo" })).json();

    await deBia.put(`/posts/${post.id}/like`);
    const curtido = (await deBia.put(`/posts/${post.id}/like`)).json();
    expect(curtido).toMatchObject({ like_count: 1, liked_by_me: true });
    expect((await deAna.get(`/posts/${post.id}`)).json()).toMatchObject({ like_count: 1, liked_by_me: false });
    expect((await deBia.delete(`/posts/${post.id}/like`)).json()).toMatchObject({ like_count: 0, liked_by_me: false });

    const c1 = (await deBia.post(`/posts/${post.id}/comments`, { content: "bonito" })).json();
    const c2 = (await deCarla.post(`/posts/${post.id}/comments`, { content: "manda o áudio" })).json();
    expect((await deAna.get(`/posts/${post.id}/comments`)).json().map((c: { content: string }) => c.content)).toEqual(["bonito", "manda o áudio"]);
    expect((await deAna.get(`/posts/${post.id}`)).json().comment_count).toBe(2);

    expect((await deCarla.delete(`/posts/${post.id}/comments/${c1.id}`)).statusCode).toBe(403);
    expect((await deBia.delete(`/posts/${post.id}/comments/${c1.id}`)).statusCode).toBe(204);
    expect((await deAna.delete(`/posts/${post.id}/comments/${c2.id}`)).statusCode).toBe(204);
    expect((await deAna.get(`/posts/${post.id}/comments`)).json()).toEqual([]);
  });
});
