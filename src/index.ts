import { run, HandlerContext } from "@xmtp/message-kit";
import { handleEns, ensAgent } from "./handler/ens.js";

run(async (context: HandlerContext) => {
  await ensAgent(context);
});
