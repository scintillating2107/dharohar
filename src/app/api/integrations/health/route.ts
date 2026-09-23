import { getSessionPayload } from "@/lib/auth";
import { checkIntegrationHealth, isMockMode } from "@/lib/integrations";
import { apiSuccess, unauthorized } from "@/lib/api-utils";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return unauthorized();

  const modules = await checkIntegrationHealth();

  return apiSuccess({
    mock_mode: isMockMode(),
    modules,
  });
}
