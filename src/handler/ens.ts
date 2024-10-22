import { HandlerContext } from "@xmtp/message-kit";

import { textGeneration } from "../lib/openai.js";
import { responseParser } from "../lib/openai.js";
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
      content: { command, params, sender },
    },
  } = context;
  const frameUrl = "https://ens.steer.fun/";
  const baseUrl = "https://app.ens.domains/";
  if (command == "renew") {
    // Destructure and validate parameters for the ens command
    const { domain } = params;
    // Check if the user holds the domain
    if (!domain) {
      context.reply("Missing required parameters. Please provide domain.");
      return;
    }

    const response = await fetch(`https://ensdata.net/${domain}`);
    const data: EnsData = (await response.json()) as EnsData;

    if (data?.address !== sender?.address) {
      context.reply(
        "You do not hold this domain. Only the owner can renew it."
      );
      return;
    }

    // Generate URL for the ens
    let url_ens = frameUrl + "frames/manage?name=" + domain;
    context.send(`${url_ens}`);
  } else if (command == "register") {
    // Destructure and validate parameters for the ens command
    const { domain } = params;

    if (!domain) {
      context.reply("Missing required parameters. Please provide domain.");
      return;
    }
    // Generate URL for the ens
    let url_ens = baseUrl + domain + "/register";
    context.send(`${url_ens}`);
  } else if (command == "help") {
    context.send(
      "Here is the list of commands:\n/register [domain]: Register a domain.\n/renew [domain]: Renew a domain.\n/info [domain]: Get information about a domain.\n/check [domain]: Check if a domain is available.\n/help: Show the list of commands"
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
      URL: `${baseUrl}${domain}`,
    };

    let message = "Domain information:\n\n";
    for (const [key, value] of Object.entries(formattedData)) {
      if (value) {
        message += `${key}: ${value}\n`;
      }
    }

    return { code: 200, message };
    // context.send(message);
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
      return {
        code: 200,
        message: `Looks like ${domain} is available! Do you want to register it? ${baseUrl}${domain}`,
      };
    } else {
      return {
        code: 404,
        message: `Looks like ${domain} is already registered! Let's try another one`,
      };
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
    group,
  } = context;

  const systemPrompt = generateSystemPrompt(sender.address);
  try {
    let userPrompt = params?.prompt ?? content;

    const { reply, history } = await textGeneration(
      userPrompt,
      systemPrompt,
      chatHistories[sender.address]
    );
    if (!group) chatHistories[sender.address] = history; // Update chat history for the user

    await processResponseWithIntent(reply, context, sender.address);
    return;
  } catch (error) {
    console.error("Error during OpenAI call:", error);
    await context.send("An error occurred while processing your request.");
  }
}

async function processResponseWithIntent(
  reply: string,
  context: any,
  senderAddress: string
) {
  let messages = reply
    .split("\n")
    .map((message: string) => responseParser(message))
    .filter((message): message is string => message.length > 0);

  for (const message of messages) {
    if (message.startsWith("/")) {
      const response = await context.intent(message);
      if (response && response.message) {
        let msg = responseParser(response.message);

        chatHistories[senderAddress]?.push({
          role: "system",
          content: msg,
        });

        await context.send(response.message);
      }
    } else {
      await context.send(message);
    }
  }
}

function generateSystemPrompt(address: string) {
  const systemPrompt = `
You are a helpful and playful ens domain register bot that lives inside a web3 messaging app.\n
- You can respond with multiple messages if needed. Each message should be separated by a newline character.
- You can trigger commands by only sending the command in a newline message.
- Only provide answers based on verified information.
- Do not make guesses or assumptions
- Users address is: ${address}
- Users can start a conversation by tagging you in a prompt like "@ens example.eth" or chatting 1:1

## Task
Start by telling the user whats possible. Guide the user in suggesting a domain name and help them with the registration process.  
- To trigger renewal: "/renew [domain]".
- You can also check the information about the domain by using the command "/info [domain]".
- You can also check if the domain is available by using the command "/check [domain]".

Commands:
- /help: Show the list of commands
- /check [domain]: Check if a domain is available
- /register [domain]: Register a domain
- /renew [domain]: Renew a domain
- /info [domain]: Get information about a domain

Examples:
- /register vitalik.eth 
- /check vitalik.eth
- /renew vitalik.eth
- /info vitalik.eth
- /help
  .`;

  return systemPrompt;
}
