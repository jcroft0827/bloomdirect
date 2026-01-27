// /app/invite/[token]/route.ts
import { redirect } from "next/navigation";
import { connectToDB } from "@/lib/mongoose";
import Invite from "@/models/Invite";

export async function GET(
  req: Request,
  context: { params: { token: string } }
) {
  const { token } = context.params;

  await connectToDB();

  const invite = await Invite.findOne({ token });

  if (invite) {
    await Invite.updateOne(
      { _id: invite._id },
      { $inc: { uses: 1 } }
    );
  }

  redirect(`/register?invite=${token}`);
}