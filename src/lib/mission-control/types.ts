export interface MissionControlClient {
  pushProposalStatus(input: { proposalId: string; status: string }): Promise<void>;
  pushPaymentStatus(input: { paymentId: string; status: string }): Promise<void>;
  createMissionControlProject(input: { projectId: string; organizationId: string }): Promise<void>;
  pushClientRequest(input: { requestId: string; organizationId: string }): Promise<void>;
  pushApprovalEvent(input: { approvalId: string; decision: string }): Promise<void>;
  pullClientVisibleProjectStatus(projectId: string): Promise<string | null>;
  pullClientVisibleMilestones(projectId: string): Promise<unknown[]>;
  pullDeliverableMetadata(projectId: string): Promise<unknown[]>;
}

export interface ClientPortalEventPublisher {
  publish(eventType: string, aggregateType: string, aggregateId: string, payload: unknown): Promise<void>;
}

export interface ClientPortalSyncService {
  syncProject(projectId: string): Promise<void>;
}
