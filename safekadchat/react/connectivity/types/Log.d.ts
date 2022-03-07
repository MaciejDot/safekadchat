import Address from "./Address";

/*COMPOUND PACKETS INTO GROUPS*/
type Log  = {
    kind: "INFO"
    message: string
} | 
{ kind: "ERROR", message:string} | {
    kind: "LOW_PACKET_SEND",
    to: Address,
    packet: string
} | {
    kind: "LOW_PACKET_RECIVED",
    from:Address,
    packet: string
} | {
    kind: "ENCRYPTED_LOW_PACKET_RECIVED",
    from: Address,
    command: string,
    args: string[]
} | {
    kind: "ENCRYPTED_LOW_PACKET_SEND",
    to: Address,
    command: string,
    args: string[]
}
export default Log;
export interface LogWithTimestamp extends Log { timestamp: number}