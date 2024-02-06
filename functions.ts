import { Client } from "discord";
import { leaderboard } from "./database.ts";

export const leaderRole = Deno.env.get("BANANA_LEADER_ROLE_ID");

async function updateLeaderMember(
  client: Client<boolean>,
  leaderId: string,
  roleId: string,
) {
  await client.guilds.cache.forEach(async (guild) => {
    const role = guild.roles.cache.get(roleId!);
    if (!role) {
      console.error("Could not find role with ID", roleId);
      return;
    }

    role.members.forEach(async (member) => {
      await member.roles.remove(role);
    });

    const member = await guild.members.fetch(leaderId);
    if (!member) {
      console.error("Could not find member with ID", leaderId);
      return;
    }

    await member.roles.add(role);
  });
}

export async function syncLeaderRole(client: Client<boolean>) {
  try {
    if (!leaderRole) {
      console.error("No leader role ID provided");
      return;
    }

    const board = await leaderboard(1);
    if (!board || board.length < 1) {
      console.error("Could not find leader");
      return;
    }

    await updateLeaderMember(client, board[0][0], leaderRole);
  } catch (error) {
    console.error("Error while syncing leader role", error);
  }
}
