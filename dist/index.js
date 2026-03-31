"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AimlApiService = exports.TripoService = void 0;
var TripoService_1 = require("./trippo/TripoService");
Object.defineProperty(exports, "TripoService", { enumerable: true, get: function () { return TripoService_1.TripoService; } });
__exportStar(require("./trippo/types"), exports);
var AimlApiService_1 = require("./aimlapi/AimlApiService");
Object.defineProperty(exports, "AimlApiService", { enumerable: true, get: function () { return AimlApiService_1.AimlApiService; } });
__exportStar(require("./aimlapi/types"), exports);
