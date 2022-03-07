import Address from "./Address";

export default interface KadNode {
    nodeId: Int8Array,
    lastKnownIP: Address,
    addressesMatrix: Address[],
}