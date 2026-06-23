// /lib/client/sendInvite.ts

type SendInviteInput = {
  to: string;
  businessName: string;
  inviteLink?: string;
  personalMessage?: string;
};

export async function sendInvite({
  to,
  businessName,
  inviteLink,
  personalMessage,
}: SendInviteInput) {
  const res = await fetch('/api/email/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      businessName,
      inviteLink:
        inviteLink || "https://www.getbloomdirect.com/register",
      personalMessage,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send invite');
  }

  return res.json();
}
