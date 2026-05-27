import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),

  OPENAI_API_KEY: Joi.string().required(),
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
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  SOCKET_CORS_ORIGIN: Joi.string().default('*'),

  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
});
