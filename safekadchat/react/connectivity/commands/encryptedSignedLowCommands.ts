import Address from "../types/Address";
import SHA1String from "../types/SHA1String";

const encryptedSignedLowCommandsFactory = {
    /*LOW LEVEL TRIVIAL KADEMLIA*/
    /*IF NODE IS INTERESTING SEND TUNNEL REQUEST AFTER GETTING RESPONSE*/
    GET_NODE:(nodeId: SHA1String) => `GET_NODE-${nodeId}`,
    GET_ALL_PUBLIC_NODES: () => `GET_ALL_PUBLIC_NODES`,
    /*KEEP ALIVE*/
    REQUEST_KEEP_ALIVE:()=>`REQUEST_KEEP_ALIVE`,
    ACKNOWLEDGE_KEEP_ALIVE: () =>`ACKNOWLEDGE_KEEP_ALIVE`,
    REJECT_KEEP_ALIVE: () =>`REJECT_KEEP_ALIVE`,
    
    /*TUNNELING FOR UDP HOLE PUNCHING*/
    REQUEST_TUNNEL: (nodeId: SHA1String)=> `REQUEST_TUNNEL-${nodeId}`,
    ACKNOWLEDGE_TUNNEL:(nodeId: SHA1String)=> `ACKNOWLEDGE_TUNNEL-${nodeId}`,
    REJECT_TUNNEL:(nodeId: SHA1String)=> `REJECT_TUNNEL-${nodeId}`,
    REQUEST_ACCEPT_TUNNEL: (nodeId: SHA1String, address: Address) => `REQUEST_ACCEPT_TUNNEL-${nodeId}-${address.ip}-${address.kind}-${address.port}`,
    ACKNOWLEDGE_ACCEPT_TUNNEL: (nodeId: SHA1String, address: Address) =>`ACKNOWLEDGE_ACCEPT_TUNNEL-${nodeId}-${address.ip}-${address.kind}-${address.port}`,
    REJECT_ACCEPT_TUNNEL: (nodeId: SHA1String, address: Address) =>`ACKNOWLEDGE_ACCEPT_TUNNEL-${nodeId}-${address.ip}-${address.kind}-${address.port}`,
    TUNNEL_WAS_ACCEPTED: (nodeId: SHA1String, address: Address) =>`TUNNEL_WAS_ACCEPTED-${nodeId}-${address.ip}-${address.kind}-${address.port}`,
    TUNNEL_WAS_REJECTED: (nodeId: SHA1String) => `REJECT_TUNNEL-${nodeId}`,

    /**/
    
    /*APPLICATION LEVEL MESSAGES ETC.*/
    SEND_MESSAGE: (message:string) => `SEND_MESSAGE-${message}`,
    ACKNOWLEDGE_MESSAGE: (messageHash: SHA1String) => `ACKNOWLEDGE_MESSAGE-${messageHash}`,
    REJECT_MESSAGE: (messageHash: SHA1String) => `REJECT_MESSAGE-${messageHash}`
} as const