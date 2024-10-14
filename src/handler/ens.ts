import { HandlerContext, User } from "@xmtp/message-kit";
import { textGeneration } from "../lib/openai.js";
const chatHistories: Record<string, any[]> = {};

interface EnsData {
  address?: string;
  avatar?: string;
  avatar_small?: string;
  avatar_url?: string;
  contentHash?: string;
  description?: string;
  ens?: string;
  ens_primary?: string;
  github?: string;
  resolverAddress?: string;
  twitter?: string;
  url?: string;
  wallets?: {
    eth?: string;
  };
}

export async function handleEns(context: HandlerContext) {
  const {
    message: {
      content: { command, params },
    },
  } = context;
  console.log(command, params);
  const baseUrl = "https://ens.steer.fun/";
  if (command == "register") {
    // Destructure and validate parameters for the ens command
    const { domain } = params;

    if (!domain) {
      context.reply("Missing required parameters. Please provide domain.");
      return;
    }
    // Generate URL for the ens
    let url_ens = baseUrl + "frames/manage?name=" + domain;
    context.send(`${url_ens}`);
  } else if (command == "help") {
    context.send(
      "Here is the list of commands:\n/register [domain]: Register a domain.\n/info [domain]: Get information about a domain.\n/check [domain]: Check if a domain is available.\n/help: Show the list of commands"
    );
  } else if (command == "info") {
    const { domain } = params;
    const response = await fetch(`https://ensdata.net/${domain}`);
    const data: EnsData = (await response.json()) as EnsData;
    //@ts-ignore
    const formattedData = {
      Address: data?.address,
      "Avatar URL": data?.avatar_url,
      Description: data?.description,
      ENS: data?.ens,
      "Primary ENS": data?.ens_primary,
      GitHub: data?.github,
      "Resolver address": data?.resolverAddress,
      Twitter: data?.twitter,
      URL: `https://app.ens.domains/${domain}`,
    };

    let message = "Domain information:\n\n";
    for (const [key, value] of Object.entries(formattedData)) {
      if (value) {
        message += `${key}: ${value}\n`;
      }
    }

    context.send(message);
  } else if (command == "check") {
    const { domain } = params;

    if (!domain) {
      context.reply("Please provide a domain name to check.");
      return;
    }
    const response = await fetch(`https://ensdata.net/${domain}`);
    const data = await response.json();

    //@ts-ignore
    if (data.status == 404) {
      context.send(
        `Looks like ${domain} is available! Do you want to register it? https://ens.steer.fun/frames/manage?name=${domain}`
      );
    } else {
      context.send(
        `Looks like ${domain} is already registered! Let's try another one`
      );
    }
  }
}

export async function ensAgent(context: HandlerContext) {
  if (!process?.env?.OPEN_AI_API_KEY) {
    console.log("No OPEN_AI_API_KEY found in .env");
    return;
  }

  const {
    message: {
      content: { content, params },
      sender,
    },
  } = context;

  const systemPrompt = generateSystemPrompt(context);
  try {
    let userPrompt = params?.prompt ?? content;

    const { reply, history } = await textGeneration(
      userPrompt,
      systemPrompt,
      chatHistories[sender.address]
    );
    chatHistories[sender.address] = history; // Update chat history for the user

    const messages = reply
      .split("\n")
      .filter((message) => message.trim() !== "");

    for (const message of messages) {
      if (message.startsWith("/")) {
        // Parse and execute the command
        await context.intent(message);
      } else {
        // Send the message as a text response
        await context.send(message);
      }
    }
  } catch (error) {
    console.error("Error during OpenAI call:", error);
    await context.send("An error occurred while processing your request.");
  }
}

function generateSystemPrompt(context: HandlerContext) {
  const systemPrompt = `
    You are a helpful and playful ens domain register bot that lives inside a web3 messaging app.\n
    - Only provide answers based on verified information.
    - Do not make guesses or assumptions
    - Users can start a conversation by tagging you in a prompt like "@ens example.eth" or chatting 1:1
    - You can respond with multiple messages if needed. Each message should be separated by a newline character.
    - You can execute commands by sending the command as a message.

    ## Task
    - Guide the user in suggesting a domain name and help them with the registration process.  You can trigger commands by only sending the command as a message.
    - To trigger registration mini-app: "/register [domain]".
    - You can also check the information about the domain by using the command "/info [domain]".
    - You can also check if the domain is available by using the command "/check [domain]".

    ## Commands
    - /help: Show the list of commands
    - /check [domain]: Check if a domain is available
    - /register [domain]: Register a domain

    Format examples:
    /register vitalik.eth 
    /check vitalik.eth
    /info vitalik.eth
    /help
  .`;

  return systemPrompt;
}
