import { NextResponse } from "next/server";

type Body = {
  deltaLiters?: number;
  note?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const premixId = Number(id);

  if (!Number.isInteger(premixId)) {
    return NextResponse.json({ error: "Invalid premix id" }, { status: 400 });
  }

  const body = (await request.json()) as Body;
  const deltaLiters = Number(body.deltaLiters ?? 0);
  const note = (body.note ?? "Manual stock adjustment").trim();

  if (!Number.isFinite(deltaLiters) || deltaLiters === 0) {
    return NextResponse.json(
      { error: "deltaLiters must be a non-zero number" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    id: premixId,
    applied: false,
    note: `${note}. Disabled to preserve database contents.`,
    deltaLiters,
  });
}
