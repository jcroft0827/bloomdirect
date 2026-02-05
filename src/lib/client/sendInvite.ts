// /lib/client/sendInvite.ts

type SendInviteInput = {
  to: string;
  shopName: string;
  inviteLink: string;
  personalMessage?: string;
};

export async function sendInvite(input: SendInviteInput) {
  const res = await fetch('/api/email/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to send invite');
  }

  return res.json();
}
