import fs from "fs";
import util from "util";

const LOG_DIR = "./logs";
const LOG_FILE = "app.log";
let start = true;

export function logger(...args: any) {
  //   if (process.env.NODE_ENV === "development") {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  if (args[0] === "clear") {
    fs.writeFileSync(`${LOG_DIR}/${LOG_FILE}`, ``);
    return;
  }
  const timestamp = new Date().toISOString();

  // Formats like console.log:
  // - supports %s %d %j %o %O
  // - pretty prints objects
  // - handles multiple arguments
  const message = util.formatWithOptions(
    {
      colors: false,
      depth: Infinity,
      maxArrayLength: Infinity,
      maxStringLength: Infinity,
    },
    ...args
  );

  fs.appendFileSync(`${LOG_DIR}/${LOG_FILE}`, `[${timestamp}] ${message}\n`);
  //   }
}
