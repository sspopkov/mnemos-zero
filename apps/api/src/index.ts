import 'dotenv/config';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { prisma } from './prisma';

async function bootstrap() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'mnemos-zero API',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  app.get(
    '/api/health',
    {
      schema: {
        tags: ['system'],
        response: {
          200: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
            },
            required: ['ok'],
          },
        },
      },
    },
    async () => {
      return { ok: true };
    },
  );

  app.get(
    '/api/messages',
    {
      schema: {
        tags: ['messages'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                text: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'text', 'createdAt'],
            },
          },
        },
      },
    },
    async () => {
      return prisma.message.findMany({ orderBy: { id: 'desc' } });
    },
  );

  const host = process.env.HOST ?? '0.0.0.0';
  const port = Number(process.env.PORT ?? 4000);

  await app.listen({ host, port });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
