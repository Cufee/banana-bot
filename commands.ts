import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from "discord";
import { getUserBananas, giveBanana, leaderboard } from "./database.ts";

interface Command {
  config: unknown;
  handler: (
    interaction: ChatInputCommandInteraction<CacheType>,
    client: Client<boolean>,
  ) => Promise<void>;
}

const emoji = Deno.env.get("BANANA_EMOJI");
export const commands: Record<string, Command> = {};

commands["nana"] = {
  config: new SlashCommandBuilder()
    .setName("nana")
    .setDescription("Gib banana")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Who gets the banana?")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("How many bananas do you want to give?")
    ),
  handler: async (interaction) => {
    const user = interaction.options.getUser("user");
    if (!user || !user?.id) {
      await interaction.reply("You need to provide a banana recipient!");
      return;
    }

    const bananasCount = +(interaction.options.getInteger("amount") || 1);
    await giveBanana(user!.id, bananasCount);
    await interaction.reply(
      `${emoji} <@${user!.id}> has been given ${bananasCount} ${
        bananasCount == 1 ? "banana" : "bananas"
      }!`,
    );
    return;
  },
};

commands["nanas"] = {
  config: new SlashCommandBuilder()
    .setName("nanas")
    .setDescription("See how many bananas you have")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Who's bananas do you want to see?")
    ),
  handler: async (interaction) => {
    const user = interaction.options.getUser("user");
    if (!user || !user?.id) {
      const userBananas = await getUserBananas(interaction.user.id);
      await interaction.reply(
        `${emoji} You have ${userBananas} ${
          userBananas == 1 ? "banana" : "bananas"
        }!`,
      );
      return;
    }

    const userBananas = await getUserBananas(user!.id);
    await interaction.reply(
      `${emoji} ${user!.username} has ${userBananas} ${
        userBananas == 1 ? "banana" : "bananas"
      }!`,
    );
    return;
  },
};

commands["leaderboard"] = {
  config: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("See who has the most bananas"),
  handler: async (interaction, client) => {
    const top = await leaderboard();
    if (top.length === 0) {
      await interaction.reply("No bananas have been given yet!");
      return;
    }

    const ids = top.map(([id]) => id);
    const users = (await Promise.all(
      ids.map(async (id) => ({ [id]: await client.users.fetch(id) })),
    ))
      .reduce((acc, user) => ({ ...acc, ...user }), {});

    const leaderboardMessage = top
      .map(([user, bananas]) => {
        const tag = `**${users[user].displayName}**` || `<@${user}>`;
        return `${tag} has ${bananas} ${bananas == 1 ? "banana" : "bananas"}`;
      })
      .join("\n");
    await interaction.reply(leaderboardMessage);
    return;
  },
};
