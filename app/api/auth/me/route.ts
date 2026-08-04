import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";

export async function GET() {
  const traveller = await getCurrentTraveller();
  const account = traveller
    ? await prisma.bluePassAccount.findUnique({
        where: { id: traveller.accountId },
        select: {
          creatorProfile: {
            select: {
              status: true,
              handle: true,
            },
          },
          operatorProfile: {
            select: {
              status: true,
              companyName: true,
            },
          },
        },
      })
    : null;

  return NextResponse.json({
    traveller: traveller
      ? {
          accountId: traveller.accountId,
          id: traveller.id,
          travellerId: traveller.travellerId,
          name: traveller.name,
          email: traveller.email,
          phone: traveller.phone,
          roles: traveller.roles,
          creatorProfile: account?.creatorProfile ?? null,
          operatorProfile: account?.operatorProfile ?? null,
        }
      : null,
  });
}
