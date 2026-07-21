export function createNotificationInput(input: {
  organizationId: string;
  userId?: string;
  type: string;
  title: string;
  body: string;
  linkTarget?: string;
}) {
  return {
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    linkTarget: input.linkTarget,
    emailQueued: false,
  };
}
