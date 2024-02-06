import "std/dotenv/load.ts";

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord";
import { getUserBananas, giveBanana, leaderboard } from "./database.ts";

const emoji = Deno.env.get("BANANA_EMOJI");
const token = Deno.env.get("DISCORD_TOKEN");

const bananaGiveCommand = new SlashCommandBuilder()
  .setName("nana")
  .setDescription("Gib banana")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Who gets the banana?")
  );

const bananasSeeCommand = new SlashCommandBuilder()
  .setName("nanas")
  .setDescription("See how many bananas you have")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Who's bananas do you want to see?")
  );

const leaderboardCommand = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("See who has the most bananas");

const rest = new REST({ version: "10" }).setToken(token!);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", async (client) => {
  console.log(`Logged in as ${client.user.tag}!`);

  console.log("Started refreshing application (/) commands.");
  await rest.put(Routes.applicationCommands(client.application.id), {
    body: [bananaGiveCommand, bananasSeeCommand, leaderboardCommand],
  });
  console.log("Successfully reloaded application (/) commands.");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === bananaGiveCommand.name) {
    const user = interaction.options.getUser("user");
    if (!user || !user?.id) {
      await interaction.reply("You need to provide a banana recipient!");
      return;
    }

    const bananasCount = 1;
    await giveBanana(user!.id, bananasCount);
    await interaction.reply(
      `${emoji} <@${user!.id}> has been given ${bananasCount} ${
        bananasCount == 1 ? "banana" : "bananas"
      }!`,
    );
    return;
  }

  if (interaction.commandName === bananasSeeCommand.name) {
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
  }

  if (interaction.commandName === leaderboardCommand.name) {
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
  }
});

await client.login(token!);
