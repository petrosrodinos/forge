const jsonContent = (schema: Record<string, unknown>) => ({
  description: "OK",
  content: { "application/json": { schema } },
});

const errorContent = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
        required: ["error"],
      },
    },
  },
});

export const OPEN_API_DOCUMENT = {
  openapi: "3.1.0",
  info: {
    title: "3D Figures API",
    version: "1.0.0",
    description:
      "API for auth, image/model generation, Tripo pipeline, and figure domain resources.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth" },
    { name: "Images" },
    { name: "GenerateAndMesh" },
    { name: "Tripo" },
    { name: "Balance" },
    { name: "Chat" },
    { name: "Figures" },
    { name: "Skins" },
    { name: "Variants" },
    { name: "SkinImages" },
    { name: "Models3D" },
    { name: "Animations" },
    { name: "Pipeline" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
          displayName: { type: "string", nullable: true },
          role: { type: "string" },
          tokenBalance: { type: "number" },
        },
        required: ["id", "email", "role", "tokenBalance"],
      },
      FigureInput: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          metadata: { type: "object", additionalProperties: true },
        },
      },
      GenerateImageInput: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          model: { type: "string" },
          size: { type: "string" },
          n: { type: "number" },
          steps: { type: "number" },
        },
        required: ["prompt"],
      },
      GenerateAndMeshInput: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          model: { type: "string" },
          size: { type: "string" },
          n: { type: "number" },
          steps: { type: "number" },
          modelVersion: { type: "string" },
          meshModelVersion: { type: "string" },
          timeoutMs: { type: "number" },
        },
        required: ["prompt"],
      },
      MeshFromImageUrlInput: {
        type: "object",
        properties: {
          imageUrl: { type: "string" },
          modelVersion: { type: "string" },
        },
        required: ["imageUrl"],
      },
      AiVariantInput: {
        type: "object",
        properties: {
          description: { type: "string" },
          variant: { type: "string", enum: ["A", "B"] },
          context: { type: "object", additionalProperties: true },
          availableModels: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, label: { type: "string" } },
              required: ["id"],
            },
          },
        },
        required: ["description", "variant"],
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  displayName: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "201": jsonContent({
            type: "object",
            properties: { user: { $ref: "#/components/schemas/User" } },
          }),
          "400": errorContent("Validation error"),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { email: { type: "string" }, password: { type: "string" } },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: { "200": jsonContent({ type: "object" }), "400": errorContent("Validation error") },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh session",
        responses: { "200": jsonContent({ type: "object", properties: { ok: { type: "boolean" } } }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        responses: { "200": jsonContent({ type: "object", properties: { ok: { type: "boolean" } } }) },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": jsonContent({ $ref: "#/components/schemas/User" }),
          "401": errorContent("Unauthorized"),
          "404": errorContent("Not found"),
        },
      },
    },
    "/api/models": {
      get: { tags: ["Images"], summary: "List image models (alias)", responses: { "200": jsonContent({ type: "array", items: { type: "object", additionalProperties: true } }) } },
    },
    "/api/aiml/models": {
      get: { tags: ["Images"], summary: "List image models", responses: { "200": jsonContent({ type: "array", items: { type: "object", additionalProperties: true } }) } },
    },
    "/api/generate": {
      post: {
        tags: ["Images"],
        summary: "Generate image (alias)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateImageInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/aiml/generate": {
      post: {
        tags: ["Images"],
        summary: "Generate image",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateImageInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/generate-and-mesh": {
      post: {
        tags: ["GenerateAndMesh"],
        summary: "Generate image and mesh it in one step",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateAndMeshInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/tripo/task/{id}": {
      get: {
        tags: ["Tripo"],
        summary: "Get Tripo task status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }) },
      },
    },
    "/api/tripo/proxy-model": {
      post: {
        tags: ["Tripo"],
        summary: "Proxy model by URL",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
        },
        responses: { "200": { description: "Model bytes stream" }, "400": errorContent("Validation error") },
      },
    },
    "/api/tripo/mesh-from-image-url": {
      post: {
        tags: ["Tripo"],
        summary: "Start mesh task from image URL",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MeshFromImageUrlInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/tripo/prerig-check": {
      post: {
        tags: ["Tripo"],
        summary: "Start pre-rig check",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/tripo/start-rig": {
      post: {
        tags: ["Tripo"],
        summary: "Start rig task",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/tripo/start-retarget": {
      post: {
        tags: ["Tripo"],
        summary: "Start retarget task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { rigTaskId: { type: "string" }, animation: { type: "string" } },
                required: ["rigTaskId", "animation"],
              },
            },
          },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/task/{id}": {
      get: {
        tags: ["Tripo"],
        summary: "Get Tripo task status (alias)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }) },
      },
    },
    "/api/proxy-model": {
      post: {
        tags: ["Tripo"],
        summary: "Proxy model by URL (alias)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
        },
        responses: { "200": { description: "Model bytes stream" }, "400": errorContent("Validation error") },
      },
    },
    "/api/mesh-from-image-url": {
      post: {
        tags: ["Tripo"],
        summary: "Start mesh task from image URL (alias)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MeshFromImageUrlInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/prerig-check": {
      post: {
        tags: ["Tripo"],
        summary: "Start pre-rig check (alias)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/start-rig": {
      post: {
        tags: ["Tripo"],
        summary: "Start rig task (alias)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/start-retarget": {
      post: {
        tags: ["Tripo"],
        summary: "Start retarget task (alias)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { rigTaskId: { type: "string" }, animation: { type: "string" } },
                required: ["rigTaskId", "animation"],
              },
            },
          },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error") },
      },
    },
    "/api/balance/aiml": { get: { tags: ["Balance"], summary: "Get AIML balance", responses: { "200": jsonContent({ type: "object", additionalProperties: true }) } } },
    "/api/balance/tripo": { get: { tags: ["Balance"], summary: "Get Tripo balance", responses: { "200": jsonContent({ type: "object", additionalProperties: true }) } } },
    "/api/chat": {
      post: {
        tags: ["Chat"],
        summary: "Chat SSE endpoint",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  history: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { role: { type: "string" }, content: { type: "string" } },
                    },
                  },
                },
                required: ["message"],
              },
            },
          },
        },
        responses: { "200": { description: "SSE stream (text/event-stream)" } },
      },
    },
    "/api/figures": {
      get: {
        tags: ["Figures"],
        summary: "List figures",
        security: [{ cookieAuth: [] }],
        responses: { "200": jsonContent({ type: "array", items: { type: "object", additionalProperties: true } }), "401": errorContent("Unauthorized") },
      },
      post: {
        tags: ["Figures"],
        summary: "Create figure",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FigureInput" } } } },
        responses: { "201": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error"), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{id}": {
      get: {
        tags: ["Figures"],
        summary: "Get figure",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "404": errorContent("Not found"), "401": errorContent("Unauthorized") },
      },
      put: {
        tags: ["Figures"],
        summary: "Update figure",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FigureInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "404": errorContent("Not found"), "401": errorContent("Unauthorized") },
      },
      delete: {
        tags: ["Figures"],
        summary: "Delete figure",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "404": errorContent("Not found"), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{id}/generate-image": {
      post: {
        tags: ["Figures"],
        summary: "Generate and save figure image",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  skinName: { type: "string" },
                  variant: { type: "string", enum: ["A", "B"] },
                  model: { type: "string" },
                  prompt: { type: "string" },
                  negativePrompt: { type: "string" },
                  size: { type: "string" },
                  steps: { type: "number" },
                },
                required: ["variant", "prompt"],
              },
            },
          },
        },
        responses: { "201": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error"), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/ai-variant": {
      post: {
        tags: ["Figures"],
        summary: "Generate AI variant prompt",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AiVariantInput" } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error"), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins": {
      get: {
        tags: ["Skins"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "figureId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "array", items: { type: "object", additionalProperties: true } }), "401": errorContent("Unauthorized") },
      },
      post: {
        tags: ["Skins"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "figureId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { name: { type: "string" }, isBase: { type: "boolean" } },
              },
            },
          },
        },
        responses: { "201": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins/{skinId}/set-base": {
      post: {
        tags: ["Skins"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins/{skinId}": {
      delete: {
        tags: ["Skins"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins/{skinId}/variants/{variant}": {
      get: {
        tags: ["Variants"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "variant", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "404": errorContent("Not found"), "401": errorContent("Unauthorized") },
      },
      put: {
        tags: ["Variants"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "variant", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins/{skinId}/variants/{variantId}/images": {
      get: {
        tags: ["SkinImages"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "variantId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonContent({ type: "array", items: { type: "object", additionalProperties: true } }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins/{skinId}/variants/{variantId}/images/{imageId}": {
      delete: {
        tags: ["SkinImages"],
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "variantId", in: "path", required: true, schema: { type: "string" } },
          { name: "imageId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/models3d/{model3dId}": {
      get: {
        tags: ["Models3D"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "model3dId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "404": errorContent("Not found"), "401": errorContent("Unauthorized") },
      },
    },
    "/api/models3d/{model3dId}/animations": {
      get: {
        tags: ["Animations"],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "model3dId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": jsonContent({ type: "array", items: { type: "object", additionalProperties: true } }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/pipeline": {
      post: {
        tags: ["Pipeline"],
        summary: "Run full generation pipeline (multipart/form-data + SSE response)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string", format: "binary" },
                  figureId: { type: "string" },
                  variantId: { type: "string" },
                  animations: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
                  modelVersion: { type: "string" },
                },
                required: ["image", "figureId", "variantId"],
              },
            },
          },
        },
        responses: { "200": { description: "SSE stream (text/event-stream)" }, "400": errorContent("Validation error"), "401": errorContent("Unauthorized"), "404": errorContent("Not found") },
      },
    },
  },
};

