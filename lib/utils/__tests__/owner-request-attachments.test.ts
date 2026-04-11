import { getOwnerRequestAttachmentLabel } from '../owner-request-attachments';

describe('getOwnerRequestAttachmentLabel', () => {
  it('does not throw on malformed percent-encoded attachment names', () => {
    expect(() =>
      getOwnerRequestAttachmentLabel(
        {
          url: 'https://cdn.example.com/files/%E0%A4%A',
        },
        0,
      ),
    ).not.toThrow();

    expect(
      getOwnerRequestAttachmentLabel(
        {
          url: 'https://cdn.example.com/files/%E0%A4%A',
        },
        0,
      ),
    ).toBe('%E0%A4%A');
  });
});
