/**
 * Centralized Studio access check.
 *
 * A user has Studio access when their account subscription is either
 * `trialing` (AgentCamp students before conversion) or `active` (paid).
 */
export function hasStudioAccess(account: {
  subscriptionStatus: string;
}): boolean {
  return (
    account.subscriptionStatus === "trialing" ||
    account.subscriptionStatus === "active"
  );
}
