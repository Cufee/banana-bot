import { Client } from "discord";
import { getAllUserThrows, leaderboard } from "./database.ts";

export const leaderRole = Deno.env.get("BANANA_LEADER_ROLE_ID");

async function updateLeaderMember(
  client: Client<boolean>,
  leaderId: string,
  roleId: string,
) {
  await client.guilds.cache.forEach(async (guild) => {
    try {
      const role = guild.roles.cache.get(roleId!);
      if (!role) {
        console.error("Could not find role with ID", roleId);
        return;
      }

      role.members.forEach(async (member) => {
        try {
          await member.roles.remove(role);
        } catch (_) {
          // Ignore
        }
      });

      try {
        const member = await guild.members.fetch(leaderId);
        await member.roles.add(role);
      } catch (_) {
        // Ignore
      }
    } catch (error) {
      console.error("Error while updating leader role", error);
    }
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

export async function willThrowHit(userId: string) {
  const allThrows = (await getAllUserThrows()).filter((entry) => entry[1] > 0);
  allThrows.sort((a, b) => b[1] - a[1]);

  let chance = 0.5; // 50%
  if (allThrows.slice(0, 3).find((entry) => entry[0] === userId)) {
    // User is in top 3
    chance = 0.75; // 75%
  }
  if (allThrows.slice(-3).find((entry) => entry[0] === userId)) {
    // User is in bottom 3
    chance = 0.25; // 25%
  }
  return Math.random() < chance ? 1 : 0;
}
