import { HandlerContext } from "@xmtp/message-kit";

export async function handleEns(context: HandlerContext) {
  const {
    message: {
      content: { command, params },
    },
  } = context;

  const baseUrl = "https://ens.steer.fun/";
  if (command == "renew") {
    // Destructure and validate parameters for the swap command
    const { domain } = params;

    if (!domain) {
      context.reply(
        "Missing required parameters. Please provide amount, token_from, and token_to."
      );
      return;
    }
    // Generate URL for the swap transaction
    let url_ens = baseUrl + "frames/manage?name=" + domain;
    context.send(`${url_ens}`);
  } else if (command == "help") {
    context.send(
      "Here is the list of commands:\n/register [domain]: Register a domain.\n/check [domain]: Check if a domain is available.\n/help: Show the list of commands"
    );
  } else if (command == "check") {
    const { domain } = params;

    if (!domain) {
      context.reply("Please provide a domain name to check.");
      return;
    }
    const response = await fetch(`https://ensdata.net/${domain}`);
    const data = await response.json();
    console.log(data);
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
