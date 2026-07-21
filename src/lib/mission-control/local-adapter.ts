import { getDb } from "@/lib/db";
import type {
  ClientPortalEventPublisher,
  ClientPortalSyncService,
  MissionControlClient,
} from "./types";

export class LocalMissionControlClient implements MissionControlClient {
  async pushProposalStatus(input: { proposalId: string; status: string }) {
    await recordOutbox("proposal.status_pushed", "Proposal", input.proposalId, input);
  }

  async pushPaymentStatus(input: { paymentId: string; status: string }) {
    await recordOutbox("payment.status_pushed", "Payment", input.paymentId, input);
  }

  async createMissionControlProject(input: { projectId: string; organizationId: string }) {
    await recordOutbox("project.create_requested", "Project", input.projectId, input);
  }

  async pushClientRequest(input: { requestId: string; organizationId: string }) {
    await recordOutbox("support_request.pushed", "SupportRequest", input.requestId, input);
  }

  async pushApprovalEvent(input: { approvalId: string; decision: string }) {
    await recordOutbox("approval.pushed", "Approval", input.approvalId, input);
  }

  async pullClientVisibleProjectStatus() {
    return null;
  }

  async pullClientVisibleMilestones() {
    return [];
  }

  async pullDeliverableMetadata() {
    return [];
  }
}

export class DatabaseOutboxPublisher implements ClientPortalEventPublisher {
  async publish(eventType: string, aggregateType: string, aggregateId: string, payload: unknown) {
    await recordOutbox(eventType, aggregateType, aggregateId, payload);
  }
}

export class LocalClientPortalSyncService implements ClientPortalSyncService {
  async syncProject(projectId: string) {
    await recordOutbox("project.sync_requested", "Project", projectId, { projectId });
  }
}

async function recordOutbox(
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: unknown,
) {
  await getDb().outboxEvent.create({
    data: {
      eventType,
      aggregateType,
      aggregateId,
      payload: payload as object,
    },
  });
}
