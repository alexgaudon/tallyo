import "vinxi/http";

import type { Auth } from "./server/auth";

declare module "vinxi/http" {
  interface H3EventContext {
    auth: Auth;
  }
}
