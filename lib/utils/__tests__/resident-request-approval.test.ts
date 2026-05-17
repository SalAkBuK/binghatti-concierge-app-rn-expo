import {
  getResidentRequestOwnerApprovalStatus,
  isResidentRequestOwnerApprovalPending,
  isResidentRequestOwnerRejected,
} from '../resident-request-approval';

describe('resident request owner approval helpers', () => {
  it('uses backend ownerApproval.status for pending approval state', () => {
    const request = {
      ownerApproval: {
        status: 'PENDING',
      },
      unit: {
        ownerId: 'owner-1',
      },
    };

    expect(getResidentRequestOwnerApprovalStatus(request as any)).toBe('PENDING');
    expect(isResidentRequestOwnerApprovalPending(request as any)).toBe(true);
  });

  it('does not infer owner approval from owner/unit metadata', () => {
    const request = {
      unit: {
        ownerId: 'owner-1',
      },
      ownerId: 'owner-1',
      ownerApproval: null,
      ownerApprovalStatus: null,
    };

    expect(getResidentRequestOwnerApprovalStatus(request as any)).toBeNull();
    expect(isResidentRequestOwnerApprovalPending(request as any)).toBe(false);
    expect(isResidentRequestOwnerRejected(request as any)).toBe(false);
  });

  it('treats NOT_REQUIRED as normal non-actionable approval status', () => {
    const request = {
      ownerApproval: {
        status: 'NOT_REQUIRED',
      },
    };

    expect(getResidentRequestOwnerApprovalStatus(request as any)).toBe('NOT_REQUIRED');
    expect(isResidentRequestOwnerApprovalPending(request as any)).toBe(false);
    expect(isResidentRequestOwnerRejected(request as any)).toBe(false);
  });
});
