"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./cli/app");
(0, app_1.startCli)().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
});
