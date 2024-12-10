import {
  run,
  agentReply,
  replaceVariables,
  XMTPContext,
  Agent,
} from "@xmtp/message-kit";
import { systemPrompt } from "./prompt.js";
import { check } from "./skills/check.js";
import { cool } from "./skills/cool.js";
import { info } from "./skills/info.js";
import { register } from "./skills/register.js";
import { renew } from "./skills/renew.js";
import { pay } from "./skills/pay.js";
import { reset } from "./skills/reset.js";
import { token } from "./skills/token.js";
import { game } from "./skills/game.js";

export const frameUrl = "https://ens.steer.fun/";
export const ensUrl = "https://app.ens.domains/";

export const agent: Agent = {
  name: "Web3 Agent",
  tag: "@bot",
  description: "A web3 agent with a lot of skills.",
  skills: [check, cool, info, register, renew, reset, pay, token, game],
  onMessage: async (context: XMTPContext) => {
    const {
      message: { sender },
      agent,
    } = context;

    let prompt = await replaceVariables(systemPrompt, sender.address, agent);
    await agentReply(context, prompt);
  },
};
run(agent);
