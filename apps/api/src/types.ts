export type AuthEnv = {
  Variables: {
    clerkUserId: string;
    userId: number;
    workspaceRole: string;
    account: {
      id: number;
      ownerId: number;
      stripeCustomerId: string | null;
      subscriptionId: string | null;
      subscriptionStatus: string;
      subscriptionTier: string | null;
      currentPeriodEnd: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
  };
};
