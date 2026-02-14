import { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

//#region ../../node_modules/.pnpm/h3@1.15.5/node_modules/h3/dist/index.d.ts
type HTTPMethod = "GET" | "HEAD" | "PATCH" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE";
interface H3CorsOptions {
  origin?: "*" | "null" | (string | RegExp)[] | ((origin: string) => boolean);
  methods?: "*" | HTTPMethod[];
  allowHeaders?: "*" | string[];
  exposeHeaders?: "*" | string[];
  credentials?: boolean;
  maxAge?: string | false;
  preflight?: {
    statusCode?: number;
  };
}
/**
 * Handle CORS for the incoming request.
 *
 * If the incoming request is a CORS preflight request, it will append the CORS preflight headers and send a 204 response.
 *
 * If return value is `true`, the request is handled and no further action is needed.
 *
 * @example
 * const app = createApp();
 * const router = createRouter();
 * router.use('/',
 *   defineEventHandler(async (event) => {
 *       const didHandleCors = handleCors(event, {
 *         origin: '*',
 *         preflight: {
 *          statusCode: 204,
 *         },
 *      methods: '*',
 *    });
 *    if (didHandleCors) {
 *      return;
 *    }
 *    // Your code here
 *  })
 * );
 */
//#endregion
export { H3CorsOptions as t };