import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { CORSPlugin } from "@orpc/server/plugins";
import { ZodSmartCoercionPlugin, ZodToJsonSchemaConverter } from "@orpc/zod";
import type { AppRouter } from "../routers";

export function createOpenAPIHandler(router: AppRouter) {
  return new OpenAPIHandler(router, {
    // TODO fix any usage, in CI, this throws a big type error
    // biome-ignore lint/suspicious/noExplicitAny: Type error in CI, needs proper typing
    plugins: [new CORSPlugin(), new ZodSmartCoercionPlugin()] as any,
  });
}

export function createOpenAPIGenerator() {
  return new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });
}

export async function generateOpenAPISpec(
  generator: OpenAPIGenerator,
  router: AppRouter,
  baseUrl: string,
) {
  return await generator.generate(router, {
    info: {
      title: "Tallyo API",
      version: "1.0.0",
      description: "API documentation for Tallyo",
    },
    servers: [{ url: baseUrl }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
        },
      },
    },
  });
}

export function getScalarHTML(specUrl: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>Tallyo API Documentation</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
      </head>
      <body>
        <div id="app"></div>

        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
        <script>
          Scalar.createApiReference('#app', {
            url: '${specUrl}',
            authentication: {
              securitySchemes: {
                bearerAuth: {
                  token: '',
                },
              },
            },
          })
        </script>
      </body>
    </html>
  `;
}
