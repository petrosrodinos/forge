"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredString = requiredString;
exports.optionalString = optionalString;
exports.defaultAudioExt = defaultAudioExt;
exports.inferMimeTypeFromPath = inferMimeTypeFromPath;
exports.resolvePath = resolvePath;
exports.readLocalFile = readLocalFile;
exports.writeBufferToPath = writeBufferToPath;
exports.saveImageFromUrl = saveImageFromUrl;
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
function requiredString(args, key) {
    const value = args[key];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Missing required string argument: ${key}`);
    }
    return value;
}
function optionalString(args, key) {
    const value = args[key];
    if (value === undefined)
        return undefined;
    if (typeof value !== "string")
        throw new Error(`Argument must be string: ${key}`);
    return value;
}
function defaultAudioExt(format) {
    if (typeof format === "string" && format)
        return format;
    return "mp3";
}
function inferMimeTypeFromPath(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === ".png")
        return "image/png";
    if (ext === ".jpg" || ext === ".jpeg")
        return "image/jpeg";
    throw new Error("Unsupported file extension for upload. Use .png, .jpg, or .jpeg");
}
function resolvePath(filePath) {
    return path_1.default.isAbsolute(filePath) ? filePath : path_1.default.resolve(process.cwd(), filePath);
}
async function readLocalFile(filePath) {
    const absolutePath = resolvePath(filePath);
    const data = await (0, promises_1.readFile)(absolutePath);
    return { absolutePath, data };
}
async function writeBufferToPath(buffer, outputPath) {
    const absolutePath = resolvePath(outputPath);
    await (0, promises_1.mkdir)(path_1.default.dirname(absolutePath), { recursive: true });
    await (0, promises_1.writeFile)(absolutePath, buffer);
    return absolutePath;
}
async function saveImageFromUrl(url, outputPath) {
    const res = await axios_1.default.get(url, { responseType: "arraybuffer" });
    return writeBufferToPath(Buffer.from(res.data), outputPath);
}
