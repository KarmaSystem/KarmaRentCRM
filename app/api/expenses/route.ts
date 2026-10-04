import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { expenseSchema } from "@/lib/validation";

const MAX_PHOTOS = 5;
const MAX_DATA_URL_LENGTH = 8_000_000;
type ExpensePhoto = { filename?: string; dataUrl: string };

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    return Response.json(await prisma.expense.findMany({ where: { userId: user.id }, include: { asset: true, media: true }, orderBy: { date: "desc" } }));
  } catch (e) { return jsonError(e, 401); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    const body = await request.json();
    const input = expenseSchema.parse(body);
    const photos = (Array.isArray(body.photos) ? body.photos : []) as ExpensePhoto[];
    if (photos.length > MAX_PHOTOS) throw new Error(`Можно прикрепить не более ${MAX_PHOTOS} фото`);
    if (photos.some(photo => !photo || typeof photo.dataUrl !== "string" || !photo.dataUrl.startsWith("data:image/") || photo.dataUrl.length > MAX_DATA_URL_LENGTH)) throw new Error("Фото расхода имеет неверный формат или слишком большой размер");
    const asset = input.assetId ? await prisma.asset.findFirst({ where: { id: input.assetId, userId: user.id } }) : null;
    if (input.assetId && !asset) throw new Error("Объект не найден");
    // Расход всегда списывается из общей кассы. assetId нужен только для аналитики байка.
    const expense = await prisma.$transaction(async tx => {
      const created = await tx.expense.create({ data: { ...input, assetId: input.assetId || undefined, userId: user.id, branchId: null } });
      if (photos.length) await tx.expenseMedia.createMany({ data: photos.map(photo => ({ expenseId: created.id, filename: photo.filename || null, dataUrl: photo.dataUrl })) });
      return tx.expense.findUnique({ where: { id: created.id }, include: { asset: true, media: true } });
    });
    return Response.json(expense, { status: 201 });
  } catch (e) { return jsonError(e); }
}
