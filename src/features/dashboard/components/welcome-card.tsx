import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export async function WelcomeCard() {
  const user = await requireUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Welcome, {user.fullName}
          <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
        </CardTitle>
        <CardDescription>
          You are signed in to {user.organization.name}. You only ever see this organization&apos;s
          vessels, inspections and work orders.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
