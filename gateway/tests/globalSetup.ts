import { startMockAiService } from "./mockAiService.js";

export default async function setup() {
  const server = startMockAiService(8099);
  return async () => {
    await new Promise((resolve) => server.close(resolve));
  };
}
