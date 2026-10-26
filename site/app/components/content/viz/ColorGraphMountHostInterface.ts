/** Graph runtime operations the mount controller drives. */
export interface ColorGraphMountHostInterface<Handle extends object, Snapshot extends object> {
  capture(handle: Handle): Snapshot | null;
  construct(): Handle;
  dispose(handle: Handle): void;
  presentSnapshot(snapshot: Snapshot | null): void;
  reportRejection(error: unknown): void;
}
