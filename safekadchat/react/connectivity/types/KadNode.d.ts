import Address from "./Address";

export default interface KadNode {
    nodeId: Uint8Array,
    lastKnownIP: Address,
    addressesMatrix: Address[],
}