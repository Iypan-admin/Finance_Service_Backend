const { execSync } = require("child_process");

try {
    const fonts = execSync("fc-list : family", { encoding: "utf8" });
    console.log("Available fonts on Railway:\n", fonts);
} catch (err) {
    console.error("Error listing fonts:", err.message);
}
