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

const insufficientTokensContent = () => ({
  description: "Insufficient token balance",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: { type: "string" },
          required: { type: "number" },
          balance: { type: "number" },
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
      "API for auth, image/model generation, Tripo mesh jobs, and figure domain resources.",
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
    { name: "Billing" },
    { name: "Pricing" },
    { name: "Admin" },
    { name: "Health" },
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
      FigureCreate: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", description: 'Domain type, e.g. "figure" or "obstacle"' },
          metadata: { type: "object", additionalProperties: true },
        },
        required: ["name", "type"],
      },
      FigureUpdate: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          metadata: { type: "object", additionalProperties: true },
        },
      },
      VariantCreate: {
        type: "object",
        properties: {
          name: { type: "string", description: "Display name for the new variant (letter A, B, C… assigned by server)" },
          prompt: { type: "string", nullable: true },
          negativePrompt: { type: "string", nullable: true },
          imageModel: { type: "string", nullable: true, description: "Optional seed (e.g. copy from active variant); stored on the new row only" },
        },
      },
      VariantUpsert: {
        type: "object",
        properties: {
          name: { type: "string" },
          prompt: { type: "string" },
          negativePrompt: { type: "string" },
          imageModel: { type: "string", description: "AIML image model id" },
        },
      },
      VariantGenerateImageBody: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          model: { type: "string" },
          negativePrompt: { type: "string" },
          sourceImageDataUrl: {
            type: "string",
            description: "Required for image-to-image models: data URL (e.g. data:image/png;base64,...).",
          },
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
          variant: { type: "string", description: "Human-readable variant label (e.g. saved display name)" },
          context: { type: "object", additionalProperties: true },
        },
        required: ["description", "variant"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        responses: { "200": jsonContent({ type: "object", properties: { ok: { type: "boolean" } } }) },
      },
    },
    "/api/openapi.json": {
      get: {
        tags: ["Health"],
        summary: "OpenAPI document (JSON)",
        responses: { "200": { description: "OpenAPI 3.1 document", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } } },
      },
    },
    "/api/stripe/webhook": {
      post: {
        tags: ["Billing"],
        summary: "Stripe webhook (raw JSON body)",
        description:
          "Called by Stripe only. Send the raw request body with header `Stripe-Signature`. Not for browser clients.",
        requestBody: {
          required: true,
          description: "Stripe event JSON; must be the raw body Stripe signed (`Stripe-Signature` header).",
          content: { "application/json": { schema: { type: "object", additionalProperties: true } } },
        },
        responses: {
          "200": jsonContent({ type: "object", properties: { received: { type: "boolean" } } }),
          "400": { description: "Invalid signature or payload" },
          "500": errorContent("Processing error"),
        },
      },
    },
    "/api/billing/packs": {
      get: {
        tags: ["Billing"],
        summary: "List purchasable token packs",
        responses: {
          "200": jsonContent({
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                tokens: { type: "number" },
                price: { type: "number" },
              },
              required: ["id", "name", "tokens", "price"],
            },
          }),
        },
      },
    },
    "/api/billing/checkout": {
      post: {
        tags: ["Billing"],
        summary: "Create Stripe Checkout session",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { packId: { type: "string" } }, required: ["packId"] },
            },
          },
        },
        responses: {
          "200": jsonContent({ type: "object", properties: { url: { type: "string", description: "Stripe Checkout URL" } }, required: ["url"] }),
          "400": errorContent("Invalid body"),
          "401": errorContent("Unauthorized"),
        },
      },
    },
    "/api/billing/balance": {
      get: {
        tags: ["Billing"],
        summary: "Current token balance",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": jsonContent({ type: "object", properties: { balance: { type: "number" } }, required: ["balance"] }),
          "401": errorContent("Unauthorized"),
        },
      },
    },
    "/api/billing/history": {
      get: {
        tags: ["Billing"],
        summary: "Purchase history",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": jsonContent({
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                packId: { type: "string" },
                tokens: { type: "number" },
                amountCents: { type: "number" },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          }),
          "401": errorContent("Unauthorized"),
        },
      },
    },
    "/api/billing/usage": {
      get: {
        tags: ["Billing"],
        summary: "Token usage history (paginated)",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            description: "Page size (max rows per page)",
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 0, default: 0 },
            description: "Number of rows to skip (for offset pagination)",
          },
        ],
        responses: {
          "200": jsonContent({
            type: "object",
            required: ["items", "total", "limit", "offset"],
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    usageKind: { type: "string" },
                    modelId: { type: "string", nullable: true },
                    operation: { type: "string", nullable: true },
                    tokens: { type: "number" },
                    createdAt: { type: "string", format: "date-time" },
                  },
                },
              },
              total: { type: "integer", minimum: 0 },
              limit: { type: "integer" },
              offset: { type: "integer", minimum: 0 },
            },
          }),
          "400": errorContent("Invalid query"),
          "401": errorContent("Unauthorized"),
        },
      },
    },
    "/api/pricing/catalog": {
      get: {
        tags: ["Pricing"],
        summary: "Token pricing catalog (packs, operations, model costs)",
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }) },
      },
    },
    "/api/pricing/costs": {
      get: {
        tags: ["Pricing"],
        summary: "Token costs by feature (fixed + variable references)",
        description:
          "Stable keys for UI. Payload is `{ version, byKey }` where each cost entry is keyed by its `key` field (same data as the internal items list). Fixed `tokens` match wallet debits; variable items point at `imageModels` in /api/pricing/catalog.",
        responses: {
          "200": jsonContent({
            type: "object",
            required: ["version", "byKey"],
            properties: {
              version: { type: "integer", enum: [1] },
              byKey: { type: "object", additionalProperties: true },
            },
          }),
        },
      },
    },
    "/api/admin/metrics": {
      get: {
        tags: ["Admin"],
        summary: "Admin revenue metrics",
        description:
          "Checkout metrics: net volume after fees (`netPurchaseCents`), sum of recorded Stripe fees (`totalStripeFeeCents`), and usage ledger totals (Σ price, Σ priceOriginal, net margin).",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": jsonContent({
            type: "object",
            properties: {
              netPurchaseCents: { type: "number" },
              totalStripeFeeCents: { type: "number" },
              tokenUsagePriceTotal: { type: "number" },
              tokenUsagePriceOriginalTotal: { type: "number" },
              tokenUsageMarginTotal: { type: "number" },
            },
            required: [
              "netPurchaseCents",
              "totalStripeFeeCents",
              "tokenUsagePriceTotal",
              "tokenUsagePriceOriginalTotal",
              "tokenUsageMarginTotal",
            ],
          }),
          "401": errorContent("Unauthorized"),
          "403": errorContent("Forbidden"),
        },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users (admin)",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": jsonContent({
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                displayName: { type: "string", nullable: true },
                role: { type: "string" },
                tokenBalance: { type: "number" },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
              required: ["id", "email", "role", "tokenBalance", "createdAt", "updatedAt"],
            },
          }),
          "401": errorContent("Unauthorized"),
          "403": errorContent("Forbidden"),
        },
      },
    },
    "/api/admin/users/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete user and GCS assets (admin)",
        description:
          "Permanently removes the user and cascaded database records, and deletes all associated objects from the configured GCS bucket (skin images, meshes, animation GLBs).",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "204": { description: "User removed" },
          "400": errorContent("Bad request (e.g. cannot delete self or template account)"),
          "401": errorContent("Unauthorized"),
          "403": errorContent("Forbidden"),
          "404": errorContent("User not found"),
        },
      },
    },
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
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateImageInput" } } } },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
      },
    },
    "/api/aiml/generate": {
      post: {
        tags: ["Images"],
        summary: "Generate image",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateImageInput" } } } },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
      },
    },
    "/api/generate-and-mesh": {
      post: {
        tags: ["GenerateAndMesh"],
        summary: "Generate image and mesh it in one step",
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateAndMeshInput" } } } },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
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
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MeshFromImageUrlInput" } } } },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/tripo/prerig-check": {
      post: {
        tags: ["Tripo"],
        summary: "Start pre-rig check",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/tripo/start-rig": {
      post: {
        tags: ["Tripo"],
        summary: "Start rig task",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/tripo/start-retarget": {
      post: {
        tags: ["Tripo"],
        summary: "Start retarget task",
        security: [{ cookieAuth: [] }],
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
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
          "500": errorContent("Server error"),
        },
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
        security: [{ cookieAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MeshFromImageUrlInput" } } } },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/prerig-check": {
      post: {
        tags: ["Tripo"],
        summary: "Start pre-rig check (alias)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/start-rig": {
      post: {
        tags: ["Tripo"],
        summary: "Start rig task (alias)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { meshTaskId: { type: "string" } }, required: ["meshTaskId"] } } },
        },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/start-retarget": {
      post: {
        tags: ["Tripo"],
        summary: "Start retarget task (alias)",
        security: [{ cookieAuth: [] }],
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
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
          "500": errorContent("Server error"),
        },
      },
    },
    "/api/balance/aiml": { get: { tags: ["Balance"], summary: "Get AIML balance", responses: { "200": jsonContent({ type: "object", additionalProperties: true }) } } },
    "/api/balance/tripo": { get: { tags: ["Balance"], summary: "Get Tripo balance", responses: { "200": jsonContent({ type: "object", additionalProperties: true }) } } },
    "/api/chat": {
      post: {
        tags: ["Chat"],
        summary: "Chat SSE endpoint",
        security: [{ cookieAuth: [] }],
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
        responses: {
          "200": { description: "SSE stream (text/event-stream)" },
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
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
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FigureCreate" } } } },
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
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/FigureUpdate" } } } },
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
        responses: {
          "201": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
      },
    },
    "/api/figures/ai-variant": {
      post: {
        tags: ["Figures"],
        summary: "Generate AI variant prompt (image model list from server catalog)",
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
    "/api/figures/{figureId}/skins/{skinId}": {
      put: {
        tags: ["Skins"],
        summary: "Rename skin",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
            },
          },
        },
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "400": errorContent("Validation error"), "401": errorContent("Unauthorized") },
      },
      delete: {
        tags: ["Skins"],
        summary: "Delete skin",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
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
    "/api/figures/{figureId}/skins/{skinId}/variants": {
      post: {
        tags: ["Variants"],
        summary: "Create variant (server assigns next label A, B, C, …). Optional prompt/model fields seed the new row without linking variants.",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/VariantCreate" } } } },
        responses: { "201": jsonContent({ type: "object", additionalProperties: true }), "401": errorContent("Unauthorized") },
      },
    },
    "/api/figures/{figureId}/skins/{skinId}/variants/by-id/{id}": {
      put: {
        tags: ["Variants"],
        summary: "Update variant by database id (prompt, model, name, etc.)",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/VariantUpsert" } } } },
        responses: {
          "200": jsonContent({ type: "object", additionalProperties: true }),
          "404": errorContent("Not found"),
          "401": errorContent("Unauthorized"),
        },
      },
      delete: {
        tags: ["Variants"],
        summary: "Delete variant by database id",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "id", in: "path", required: true, schema: { type: "string" } },
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
    },
    "/api/figures/{figureId}/skins/{skinId}/variants/{variant}/generate-image": {
      post: {
        tags: ["Variants"],
        summary: "Generate image for this variant and attach as skin image",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "variant", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/VariantGenerateImageBody" } } } },
        responses: {
          "201": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
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
      post: {
        tags: ["SkinImages"],
        summary: "Upload raster for variant (optional replace via imageId)",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "figureId", in: "path", required: true, schema: { type: "string" } },
          { name: "skinId", in: "path", required: true, schema: { type: "string" } },
          { name: "variantId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  image: { type: "string", format: "binary" },
                  imageId: { type: "string", description: "If set, replace this skin image’s raster (clears linked 3D)." },
                },
                required: ["image"],
              },
            },
          },
        },
        responses: {
          "201": jsonContent({ type: "object", additionalProperties: true }),
          "400": errorContent("Validation error"),
          "404": errorContent("Not found"),
          "401": errorContent("Unauthorized"),
        },
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
      delete: {
        tags: ["Models3D"],
        summary: "Delete 3D model record",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "model3dId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" }, "401": errorContent("Unauthorized") },
      },
    },
    "/api/models3d/{model3dId}/rig": {
      post: {
        tags: ["Models3D"],
        summary: "Rig a stored Model3D (SSE)",
        description: "Pre-rig check and Tripo rigging; debits rig tokens. Requires a completed mesh.",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "model3dId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "SSE stream (text/event-stream)" },
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
      },
    },
    "/api/models3d/{model3dId}/animate": {
      post: {
        tags: ["Models3D"],
        summary: "Animation retarget (SSE)",
        description: "Runs Tripo retarget per requested animation; debits animation retarget tokens.",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "model3dId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { animations: { type: "array", items: { type: "string" }, minItems: 1 } },
                required: ["animations"],
              },
            },
          },
        },
        responses: {
          "200": { description: "SSE stream (text/event-stream)" },
          "400": errorContent("Validation error"),
          "401": errorContent("Unauthorized"),
          "402": insufficientTokensContent(),
        },
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
    "/api/models3d/{model3dId}/animations/{animationId}": {
      delete: {
        tags: ["Animations"],
        summary: "Delete animation record",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "model3dId", in: "path", required: true, schema: { type: "string" } },
          { name: "animationId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "204": { description: "Deleted" }, "401": errorContent("Unauthorized") },
      },
    },
  },
};

