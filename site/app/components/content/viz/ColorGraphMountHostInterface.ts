/** Graph runtime operations the mount controller drives. */
export interface ColorGraphMountHostInterface<Handle extends object, Snapshot extends object> {
  'capture': (handle: Handle) => null | Snapshot;
  'construct': () => Handle;
  'dispose': (handle: Handle) => void;
  'idleElapsed': () => void;
  'presentSnapshot': (snapshot: null | Snapshot) => void;
  'reportRejection': (error: unknown) => void;
}
