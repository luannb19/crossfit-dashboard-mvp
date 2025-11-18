// src/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "InsightFlow API",
      version: "1.0.0",
      description:
        "API de frequência/analytics. Endpoints protegidos usam Bearer JWT.",
    },
    servers: [{ url: "http://localhost:4000" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        // ==== Auth ====
        AuthLoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "gestor@insightflow.com",
            },
            password: { type: "string", example: "123456" },
          },
        },
        AuthLoginResponse: {
          type: "object",
          properties: {
            token: { type: "string", description: "JWT" },
          },
          example: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
          },
        },

        // ==== Health ====
        HealthOk: {
          type: "object",
          properties: { ok: { type: "boolean", example: true } },
        },
        HealthDbStatus: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: true },
            db: {
              type: "object",
              properties: {
                available: { type: "boolean", example: true },
                reason: { type: "string", nullable: true },
                error: { type: "string", nullable: true },
              },
            },
          },
        },

        // ==== Frequência ====
        GroupBy: { type: "string", enum: ["day", "week", "month"] },
        FrequenciaPoint: {
          type: "object",
          properties: {
            date: { type: "string", example: "2025-01-01" },
            presencas: { type: "integer", example: 4 },
          },
        },
        FrequenciaFilters: {
          type: "object",
          properties: {
            from: { type: "string", example: "2025-01-01" },
            to: { type: "string", example: "2025-01-31" },
            groupBy: { $ref: "#/components/schemas/GroupBy" },
            classId: { type: "string", nullable: true },
            alunoId: { type: "string", nullable: true },
            limit: { type: "integer", example: 31 },
          },
        },
        FrequenciaResponse: {
          type: "object",
          properties: {
            filters: { $ref: "#/components/schemas/FrequenciaFilters" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/FrequenciaPoint" },
            },
            meta: {
              type: "object",
              properties: {
                source: { type: "string", enum: ["demo", "db"] },
                count: { type: "integer", example: 31 },
              },
            },
          },
        },

        // ==== Ranking ====
        RankingItem: {
          type: "object",
          properties: {
            alunoId: { type: "string", example: "a1" },
            presencas: { type: "integer", example: 5 },
          },
        },
        RankingResponse: {
          type: "object",
          properties: {
            period: {
              type: "object",
              properties: {
                from: { type: "string", example: "2025-01-01" },
                to: { type: "string", example: "2025-01-05" },
              },
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/RankingItem" },
            },
          },
        },

        // ==== Heatmap ====
        HeatmapBin: {
          type: "object",
          properties: {
            dow: {
              type: "integer",
              minimum: 1,
              maximum: 7,
              example: 3,
              description: "1=Seg ... 7=Dom",
            },
            hour: { type: "integer", minimum: 0, maximum: 23, example: 9 },
            presencas: { type: "integer", example: 2 },
          },
        },
        HeatmapResponse: {
          type: "object",
          properties: {
            period: {
              type: "object",
              properties: {
                from: { type: "string", example: "2025-01-01" },
                to: { type: "string", example: "2025-01-05" },
              },
            },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/HeatmapBin" },
            },
          },
        },
      },
    },
  },
  // Varre os comentários @swagger nas rotas:
  apis: ["src/routes/**/*.ts"],
});
