import { run, HandlerContext } from "@xmtp/message-kit";
import { handler as agent } from "./handler/agent.js";
import { handleEns } from "./handler/ens.js";
import { group } from "console";

run(async (context: HandlerContext) => {
  const {
    message: {
      typeId,
      content: { content: text, command, params },
    },
    group,
  } = context;
  if (group) return;
  if (typeId !== "text") return;

  if (text.startsWith("/")) {
    await handleEns(context);
    return;
  }
  await agent(context);
});
