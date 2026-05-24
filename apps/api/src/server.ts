import { getConfig } from "./config.js";
import { createApp } from "./app.js";

const config = getConfig();
const app = await createApp({ config });

await app.listen({
  host: config.host,
  port: config.port
});
