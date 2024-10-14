import { HandlerContext, User } from "@xmtp/message-kit";
import { textGeneration } from "../lib/openai.js";

// In-memory store for chat histories
const chatHistories: Record<string, any[]> = {};

export async function handler(context: HandlerContext) {
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
    console.log(chatHistories[sender.address]);
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
    - Only provide answers based on verified information. If the data or facts are unknown or unclear, respond with 'I do not know' or request further clarification from the user.
    - Do not make guesses or assumptions
    - Do not provide any links or external links
    - Users can start a conversation by tagging you in a prompt like "@ens example.eth" or chatting 1:1
    - You can respond with multiple messages if needed. Each message should be separated by a newline character.
    - You can execute commands by sending the command as a message.

    ## Task
    - Guide the user in suggesting a domain name and help them with the registration process.
    - Once the user knows which domain they want to register you have an internal command to trigger registration mini-app: "/ens [domain]". You can trigger this domain by only sending the command as a message.

    ## Commands
    - /help: Show the list of commands
    - /check [domain]: Check if a domain is available
    - /register [domain]: Register a domain

    Format examples:
    /register vitalik.eth 
    /check vitalik.eth
    /help
  .`;

  return systemPrompt;
}
