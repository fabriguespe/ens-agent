import { run, HandlerContext } from "@xmtp/message-kit";
import { handler as agent } from "./handler/agent.js";
import { handleEns } from "./handler/ens.js";

run(async (context: HandlerContext) => {
  const {
    message: {
      typeId,
      content: { content: text, command, params },
    },
  } = context;

  if (typeId !== "text") return;

  if (text.startsWith("/")) {
    await handleEns(context);
    return;
  }
  await agent(context);
});
