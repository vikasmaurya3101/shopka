import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const qas = await prisma.productQA.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    return NextResponse.json({ success: true, data: qas });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Unable to load Q&A." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Login required." }, { status: 401 });
  }

  try {
    const { id: productId } = await params;
    const { question } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json({ success: false, message: "Question cannot be empty." }, { status: 400 });
    }

    const qa = await prisma.productQA.create({
      data: {
        productId,
        userId: session.userId,
        question: question.trim(),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ success: true, data: qa });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Unable to submit question." }, { status: 500 });
  }
}
