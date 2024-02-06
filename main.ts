import "std/dotenv/load.ts";

import { Client, GatewayIntentBits, REST, Routes } from "discord";
import { commands } from "./commands.ts";
import { syncLeaderRole } from "./functions.ts";

const token = Deno.env.get("DISCORD_TOKEN");

const rest = new REST({ version: "10" }).setToken(token!);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", async (client) => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Set presence status
  client.user.setActivity({ name: "with bananas", type: 0 });

  // Update commands
  console.log("Started refreshing application (/) commands.");
  await rest.put(Routes.applicationCommands(client.application.id), {
    body: Object.values(commands).map((command) => command.config),
  });
  console.log("Successfully reloaded application (/) commands.");

  // Sync leader role
  Deno.cron(
    "Update banana leader",
    "0/5 * * * *",
    () => {
      syncLeaderRole(client);
    },
  );
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await commands[interaction.commandName].handler(interaction, client);
    await syncLeaderRole(client);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content:
        "There was an error while dispatching bananas, our tactical banana retrieval team has been dispatched to resolve the issue.",
      ephemeral: true,
    });
  }
});

await client.login(token!);
