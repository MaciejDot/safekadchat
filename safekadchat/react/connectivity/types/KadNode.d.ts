import Address from "./Address";

export default interface KadNode {
    nodeId: Uint8Array,
    lastConnectedIP: Address,
    outerIP?: Address,
    localIP?: Address,
    bluetoothAddress?: string,
}