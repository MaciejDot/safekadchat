import Address from "../types/Address";
import SHA1String from "../types/SHA1String";
import Signature from "../types/Signature";

const encryptedCommandsFactory = {

    /*PING*/
    PING: () => `PING`,
    PONG: () => `PONG`,

    /*HELLO*/
    REQUEST_IDENTITY_HELLO: (myNodeId: SHA1String, cookie: string) => `REQUEST_IDENTITY_HELLO-${myNodeId}-${cookie}`,
    REJECT_IDENTITY_HELLO: () => `REJECT_IDENTITY_HELLO`,
    ACKNOWLEDGE_IDENTITY_HELLO: (cookie:string, signature: Signature) => `ACKNOWLEDGE_IDENTITY_HELLO-${cookie}-${signature.algorithm}-${signature.signature}`,
    REJECT_ACKNOWLEDGE_IDENTITY_HELLO: ()=>`REJECT_ACKNOWLEDGE_IDENTITY_HELLO`,
    ACKNOWLEDGE_ACKNOWLEDGE_IDENTITY_HELLO: (signature: Signature) => `ACKNOWLEDGE_ACKNOWLEDGE_IDENTITY_HELLO-${signature.algorithm}-${signature.signature}`,
    REJECT_HELLO: () =>`REJECT_HELLO`,
    ACCEPT_HELLO:()=> `ACCEPT_HELLO`,
    
    /*COOKIE CHANGE*/
    /*WITHOUT ACK SEND AGAIN*/
    CHANGE_COOKIE: (cookie: string) => `CHANGE_COOKIE-${cookie}`,

    ACKNOWLEDGE_CHANGE_COOKIE: (cookie:string, signature: Signature) => `ACKNOWLEDGE_CHANGE_COOKIE-${cookie}-${signature.algorithm}-${signature.signature}`,
    
    ACKNOWLEDGE_ACKNOWLEDGE_CHANGE_COOKIE: (signature: Signature) => `ACKNOWLEDGE_ACKNOWLEDGE_CHANGE_COOKIE-${signature.algorithm}-${signature.signature}`,
   
    /* APPLICATION LEVEL MESSAGES ETC. */
    /* REUSE cookie as aditional security measure for signing messages */
    SEND_MESSAGE: (message:string, signature:Signature) => `SEND_MESSAGE-${message}-${signature.algorithm}-${signature.signature}`,
    ACKNOWLEDGE_MESSAGE: (messageHash: SHA1String) => `ACKNOWLEDGE_MESSAGE-${messageHash}`,
    REJECT_MESSAGE: (messageHash: SHA1String) => `REJECT_MESSAGE-${messageHash}`
} as const

const encryptedCommandsTranslator = {} as const

export { encryptedCommandsFactory, encryptedCommandsTranslator };