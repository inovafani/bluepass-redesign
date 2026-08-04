import { prisma } from "@/lib/db/prisma";

export async function loadOperatorOutreachOverview() {
  const [statusGroups, recentLeads] = await Promise.all([
    prisma.operatorLead.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.operatorLead.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        status: true,
        lastOutreachAt: true,
        outreachEvents: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            id: true,
            type: true,
            message: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const statusCounts = statusGroups.map((group) => ({
    status: group.status,
    count: group._count._all,
  }));

  return {
    statusCounts,
    total: statusCounts.reduce((sum, group) => sum + group.count, 0),
    recentLeads: recentLeads.map((lead) => ({
      id: lead.id,
      slug: lead.slug,
      name: lead.name,
      email: lead.email,
      status: lead.status,
      lastOutreachAt: lead.lastOutreachAt,
      events: lead.outreachEvents,
    })),
  };
}
