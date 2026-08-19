# Media Library v2

Media Library v2 keeps the CMS media workflow intentionally simple while improving control and safety.

## What changed

- Search by file name, alt text, caption or MIME type.
- Filter between images and other files.
- Show media counts and total registered size.
- Distinguish CMS-managed R2 objects from external URL references.
- Allow managed R2 files to be removed from storage explicitly when removing the library record.
- External assets are never deleted from their source by the CMS.
- Failed database registration after an R2 upload attempts best-effort object cleanup.
- External asset registration accepts HTTPS only.
- MediaPicker supports type filtering, preview and clearing an existing selection.

## Deletion behavior

Removing an asset from the Media Library removes only the database record by default. For CMS-managed R2 assets, OWNER or ADMIN users may additionally select **Also permanently delete the R2 object**. This action is irreversible.

External references cannot be physically deleted by the CMS because their source storage is not owned by this media workflow.
