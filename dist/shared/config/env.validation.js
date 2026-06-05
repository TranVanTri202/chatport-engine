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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
    REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
    OPENAI_API_KEY: Joi.string().required(),
    FIREBASE_PROJECT_ID: Joi.string().required(),
    FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),
    FIREBASE_CLIENT_EMAIL: Joi.string().email().optional(),
    FIREBASE_PRIVATE_KEY: Joi.string().optional(),
    LLM_MODEL: Joi.string().default('gpt-4o-mini'),
    LLM_TEMPERATURE: Joi.number().min(0).max(2).default(0.3),
    LLM_MAX_TOKENS: Joi.number().integer().min(1).max(8192).default(800),
    LLM_TOP_P: Joi.number().min(0).max(1).default(1),
    LLM_FREQUENCY_PENALTY: Joi.number().min(-2).max(2).default(0),
    LLM_PRESENCE_PENALTY: Joi.number().min(-2).max(2).default(0),
    EMBEDDING_MODEL: Joi.string().default('text-embedding-3-small'),
    EMBEDDING_DIMS: Joi.number().default(1536),
    RAG_TOP_K: Joi.number().integer().min(1).max(50).default(5),
    JWT_SECRET: Joi.string().min(8).required(),
    JWT_EXPIRES_IN: Joi.string().default('1h'),
    JWT_REFRESH_EXPIRES_IN_DAYS: Joi.number().integer().min(1).default(30),
    SOCKET_CORS_ORIGIN: Joi.string().default('*'),
    CONVERSATION_HISTORY_LIMIT: Joi.number().integer().min(1).default(40),
    CONVERSATION_RECENT_LIMIT: Joi.number().integer().min(1).default(15),
    CONVERSATION_SUMMARY_TRIGGER_LIMIT: Joi.number().integer().min(1).default(10),
    CONVERSATION_SUMMARY_MAX_CHARS: Joi.number().integer().min(100).default(1200),
    LOG_LEVEL: Joi.string()
        .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
        .default('info'),
})
    .prefs({ abortEarly: false, allowUnknown: true })
    .custom((value, helpers) => {
    const hasServiceAccount = Boolean(value.FIREBASE_SERVICE_ACCOUNT_JSON);
    const hasClientEmail = Boolean(value.FIREBASE_CLIENT_EMAIL);
    const hasPrivateKey = Boolean(value.FIREBASE_PRIVATE_KEY);
    if (hasServiceAccount || (hasClientEmail && hasPrivateKey)) {
        return value;
    }
    return helpers.error('any.custom', {
        message: 'Provide either FIREBASE_SERVICE_ACCOUNT_JSON or both FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY',
    });
});
//# sourceMappingURL=env.validation.js.map