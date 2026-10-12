import "server-only";

import type { VesselFormValues } from "@/features/vessels/schemas";
import { can } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type VesselMutationResult =
  | { ok: true; vesselId: string }
  | { ok: false; formError?: string; fieldErrors?: { imoNumber?: string[] } };

const NO_PERMISSION: VesselMutationResult = {
  ok: false,
  formError: "Only fleet managers and administrators can add or edit vessels.",
};

function toRow(values: VesselFormValues) {
  return {
    name: values.name,
    imo_number: values.imoNumber,
    vessel_type: values.vesselType,
    flag_state: values.flagState,
    status: values.status,
    year_built: values.yearBuilt,
    gross_tonnage: values.grossTonnage,
  };
}

function mapError(error: { code?: string }): VesselMutationResult {
  if (error.code === "23505") {
    return {
      ok: false,
      fieldErrors: { imoNumber: ["A vessel with this IMO number is already in your fleet."] },
    };
  }
  if (error.code === "42501") {
    return NO_PERMISSION;
  }
  return { ok: false, formError: "The vessel could not be saved. Check the details and try again." };
}

/** The organization always comes from the session, never from the form. */
export async function createVessel(values: VesselFormValues): Promise<VesselMutationResult> {
  const user = await requireUser();
  if (!can(user.role, "vessels:write")) {
    return NO_PERMISSION;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vessels")
    .insert({ ...toRow(values), organization_id: user.organization.id })
    .select("id")
    .single();

  return error ? mapError(error) : { ok: true, vesselId: data.id };
}

export async function updateVessel(
  vesselId: string,
  values: VesselFormValues,
): Promise<VesselMutationResult> {
  const user = await requireUser();
  if (!can(user.role, "vessels:write")) {
    return NO_PERMISSION;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vessels")
    .update(toRow(values))
    .eq("id", vesselId)
    .eq("organization_id", user.organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return mapError(error);
  }
  // RLS turns a forbidden or foreign row into "no row updated".
  return data
    ? { ok: true, vesselId: data.id }
    : { ok: false, formError: "This vessel no longer exists or you can't edit it." };
}
