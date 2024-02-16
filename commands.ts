import {
  CacheType,
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  User,
} from "discord";
import { getUserBananas, giveBanana, leaderboard } from "./database.ts";
import { incrementUserThrows } from "./database.ts";
import { willThrowHit } from "./functions.ts";

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
    .setDMPermission(false)
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

    await interaction.deferReply();

    const bananasCount = +(interaction.options.getInteger("amount") || 1);
    const absBananasCount = Math.abs(bananasCount);

    await giveBanana(user!.id, bananasCount);
    const unit = bananasCount < 0 ? "anti-banana" : "banana";

    await interaction.editReply(
      `${emoji} <@${user!.id}> has been given ${absBananasCount} ${
        absBananasCount == 1 ? unit : unit + "s"
      }!`,
    );
    return;
  },
};

commands["nanas"] = {
  config: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("nanas")
    .setDescription("See how many bananas you have")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Who's bananas do you want to see?")
    ),
  handler: async (interaction) => {
    await interaction.deferReply();

    const user = interaction.options.getUser("user");
    if (!user || !user?.id) {
      const userBananas = await getUserBananas(interaction.user.id);
      await interaction.editReply(
        `${emoji} You have ${userBananas} ${
          userBananas == 1 ? "banana" : "bananas"
        }!`,
      );
      return;
    }

    const userBananas = await getUserBananas(user!.id);
    await interaction.editReply(
      `${emoji} ${user!.username} has ${userBananas} ${
        userBananas == 1 ? "banana" : "bananas"
      }!`,
    );
    return;
  },
};

commands["leaderboard"] = {
  config: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("leaderboard")
    .setDescription("See who has the most bananas"),
  handler: async (interaction, client) => {
    const top = await leaderboard();
    if (top.length === 0) {
      await interaction.reply("No bananas have been given yet!");
      return;
    }
    await interaction.deferReply();

    const guild = await client.guilds.fetch(interaction.guildId!);
    const ids = top.map(([id]) => id);
    const users = (await Promise.all(
      ids.map(async (id) => {
        try {
          return { [id]: await guild.members.fetch(id).then((m) => m.user) };
        } catch (_) {
          return { [id]: null };
        }
      }),
    ))
      .reduce(
        (acc, user) => ({ ...acc, ...user }),
        {} as Record<string, User | null>,
      );

    const leaderboardPositions = top
      .filter(([id]) => !!users[id])
      .map(([user, bananas]) => {
        const absBananas = Math.abs(bananas);
        const unit = bananas < 0 ? "anti-banana" : "banana";
        const tag = `**${users[user]!.displayName}**` || `<@${user}>`;

        return `${tag} has ${absBananas} ${
          absBananas == 1 ? unit : unit + "s"
        }`;
      });

    let message = `## :trophy: Banana Leaderboard :trophy:\n\n`;
    for (let i = 0; i < leaderboardPositions.length; i++) {
      if (message.length + leaderboardPositions[i].length > 1900) {
        message += `... and ${leaderboardPositions.length - i} more`;
        break;
      }
      message += `${i + 1}. ${leaderboardPositions[i]}\n`;
    }

    await interaction.editReply(message);
    return;
  },
};

commands["throw"] = {
  config: new SlashCommandBuilder()
    .setDMPermission(false)
    .setName("throw")
    .setDescription("Throw a banana at someone")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Who do you want to throw a banana at?")
        .setRequired(true)
    ),
  handler: async (interaction) => {
    const target = interaction.options.getUser("user");
    if (!target || !target?.id) {
      await interaction.reply("You need to provide a target for your banana!");
      return;
    }

    await interaction.deferReply();

    const bananaCount = await getUserBananas(interaction.user.id);
    if (bananaCount < 1) {
      await interaction.editReply(
        "You don't have any bananas to throw!",
      );
      return;
    }

    if (target.id === interaction.user.id) {
      await interaction.editReply(
        `<@${interaction.user.id}> threw a 🍌 at <@${interaction.user.id}>... :facepalm:`,
      );
      return;
    }

    await interaction.editReply(
      `<@${interaction.user.id}> threw a 🍌 at <@${target.id}> :drum:`,
    );

    if (Math.random() < 0.5) {
      await interaction.followUp(
        `:boom: <@${target.id}> was hit by the banana!`,
      );
      await giveBanana(interaction.user.id, -1);
      await giveBanana(target.id, 1);
      return;
    }
    // Missed
    const bananaGone = Math.random() < 0.25;
    const outcome = Math.random() < 0.5 ? "jumped over" : "dodged under";
    let message = `:dash: <@${target.id}> ${outcome} the banana!`;
    if (bananaGone) {
      await giveBanana(interaction.user.id, -1);
      message += `\nThe :banana: is gone!`;
    }
    await interaction.followUp(message);
  },
};
