const database = await Deno.openKv(Deno.env.get("DENO_KV_URL"));

export async function saveUserBananas(user: string, bananas: number) {
  return (await database.set(["naynays", user], bananas)).ok;
}

export async function getUserBananas(user: string): Promise<number> {
  return (await database.get<number>(["naynays", user])).value || 0;
}

export async function giveBanana(user: string, number = 1) {
  const currentBananas = await getUserBananas(user);
  return saveUserBananas(user, currentBananas + number);
}

export async function takeBanana(user: string, number = 1) {
  const currentBananas = await getUserBananas(user);
  return saveUserBananas(user, currentBananas - number);
}

export async function leaderboard(limit = 0): Promise<[string, number][]> {
  const cur = await database.list<number>({ prefix: ["naynays"] });
  const entries: [string, number][] = [];
  for await (const entry of cur) {
    entries.push([entry.key.at(1)!.toString(), entry.value]);
  }
  entries.sort((a, b) => b[1] - a[1]);
  if (limit > 0) {
    return entries.slice(0, limit);
  }
  return entries;
}

export async function getUserThrows(user: string): Promise<number> {
  return (await database.get<number>(["throws", user])).value || 0;
}

export async function saveUserThrows(user: string, throws: number) {
  return (await database.set(["throws", user], throws)).ok;
}

export async function incrementUserThrows(user: string, throws = 1) {
  const currentThrows = await getUserThrows(user);
  return saveUserThrows(user, currentThrows + throws);
}

export async function getAllUserThrows(limit = 0): Promise<[string, number][]> {
  const cur = await database.list<number>({ prefix: ["throws"] });
  const entries: [string, number][] = [];
  for await (const entry of cur) {
    entries.push([entry.key.at(1)!.toString(), entry.value]);
  }
  entries.sort((a, b) => b[1] - a[1]);
  if (limit > 0) {
    return entries.slice(0, limit);
  }
  return entries;
}
