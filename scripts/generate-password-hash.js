import { hashPassword } from "../lib/auth.js";

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  console.error("Run this script in an interactive terminal so the password can be entered without echoing it.");
  process.exitCode = 1;
} else {
  try {
    const password = await readHidden("Password (at least 16 characters): ");
    const confirmation = await readHidden("Confirm password: ");
    if (password !== confirmation) throw new Error("Passwords do not match.");
    console.log(await hashPassword(password));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();

    const finish = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = chunk => {
      for (const character of chunk) {
        if (character === "\u0003") return finish(new Error("Cancelled."));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    };

    process.stdin.on("data", onData);
  });
}
