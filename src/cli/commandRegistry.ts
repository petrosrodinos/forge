import { CommandDefinition, ToolHandler } from "./types";

const COMMAND_TOOL_MAP: Record<string, string> = {
  "aiml.listModels": "aiml_listModels",
  "aiml.responses": "aiml_responses",
  "aiml.chatCompletion": "aiml_chatCompletion",
  "aiml.generateImage": "aiml_generateImage",
  "aiml.generateImageToFile": "aiml_generateImageToFile",
  "aiml.createVideoGeneration": "aiml_createVideoGeneration",
  "aiml.getVideoGeneration": "aiml_getVideoGeneration",
  "aiml.pollVideoGeneration": "aiml_pollVideoGeneration",
  "aiml.createEmbedding": "aiml_createEmbedding",
  "aiml.textToSpeechToFile": "aiml_textToSpeechToFile",
  "aiml.transcribeFile": "aiml_transcribeFile",
  "aiml.getBalance": "aiml_getBalance",
  "aiml.listApiKeys": "aiml_listApiKeys",
  "aiml.getCurrentKey": "aiml_getCurrentKey",
  "tripo.createTask": "tripo_createTask",
  "tripo.getTask": "tripo_getTask",
  "tripo.pollTask": "tripo_pollTask",
  "tripo.getBalance": "tripo_getBalance",
  "tripo.getStsToken": "tripo_getStsToken",
  "tripo.uploadImageFromPath": "tripo_uploadImageFromPath",
};

export function buildServiceCommands(handlers: Record<string, ToolHandler>): Record<string, CommandDefinition> {
  const commands: Record<string, CommandDefinition> = {};
  for (const [commandName, toolName] of Object.entries(COMMAND_TOOL_MAP)) {
    commands[commandName] = {
      name: commandName,
      description: `Run ${commandName}`,
      execute: async (args) => {
        const handler = handlers[toolName];
        if (!handler) throw new Error(`Missing handler for ${commandName}`);
        return handler(args);
      },
    };
  }
  return commands;
}
