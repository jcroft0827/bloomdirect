export async function resendEmail(emailEventId: string) {
    const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEventId }),
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend email");
    }

    return res.json();
}