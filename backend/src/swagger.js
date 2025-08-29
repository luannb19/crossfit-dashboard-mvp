import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'InsightFlow API',
      version: '1.0.0',
      description: 'Documentação da API InsightFlow (rotas, parâmetros, autenticação)',
    },
    servers: [{ url: 'http://localhost:4000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Lê os comentários JSDoc nas rotas
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // (Opcional) exportar o JSON do OpenAPI:
  app.get('/docs.json', (_req, res) => res.json(swaggerSpec));
}
