"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEnv = requireEnv;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
