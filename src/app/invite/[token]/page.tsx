export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  return <main className="p-8">Invite token received: {(await params).token}</main>;
}
