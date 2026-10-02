import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC`;
    return Response.json({ status: "ok", database: "ok", service: "rental-planner", migrations: { applied: migrations.length, latest: migrations[0]?.migration_name ?? null, latestFinishedAt: migrations[0]?.finished_at ?? null } });
  } catch {
    return Response.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
