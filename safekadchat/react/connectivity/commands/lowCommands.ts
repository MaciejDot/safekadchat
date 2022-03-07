import PublicKey from "../types/PublicKey";
import commandsFactory from "./commandsFactory";
/*
CLIENTS CAN BE ON DIFFRENT STATES - BECAUSE OF PACKAGE LOSS - ACKNOWLEDGE AND REJECT shoul be sufficient
*/
const lowCommandsFactory = {
    PING: () => commandsFactory('PING'),
    PONG: () => commandsFactory('PONG'),
    PING_COOKIE: (cookie: string) => commandsFactory(`PING_COOKIE`,cookie),
    PONG_COOKIE: (cookie: string) => commandsFactory(`PONG_COOKIE`,cookie),
    /*EVRY REQUEST MUST BE PROVEN WITH COOKIE*/
    REQUEST_SAFE_CHANNEL: (cookie: string, myPubKey: PublicKey) =>
    commandsFactory(`REQUEST_SAFE_CHANNEL`, cookie , myPubKey.algorithm, myPubKey.publicKey),
    /*CAN BE ENC*/
    ACKNOWLEDGE_SAFE_CHANNEL: (cookie:string,myPubKey: PublicKey, yourPubKey: PublicKey) =>
     commandsFactory(`ACKNOWLEDGE_SAFE_CHANNEL`,cookie ,myPubKey.algorithm, myPubKey.publicKey, yourPubKey.algorithm, yourPubKey.publicKey),
    REQUEST_CHANGE_SAFE_CHANNEL: (myPubKey: PublicKey) =>
    commandsFactory( `REQUEST_CHANGE_SAFE_CHANNEL`, myPubKey.algorithm ,myPubKey.publicKey),
    /* UNKNOWN_ALGORITHM */
    /* CAN BE ENC*/
    ACKNOWLEDGE_CHANGE_SAFE_CHANNEL: (myPubKey: PublicKey, yourPubKey:PublicKey) => 
   commandsFactory( `ACKNOWLEDGE_CHANGE_SAFE_CHANNEL`,myPubKey.algorithm,myPubKey.publicKey,yourPubKey.algorithm,yourPubKey.publicKey),
    /* SEND NEW PUBLIC KEY with epoch*/
    SEND_ENCRYPTED: (encSTRING: string, epoch : number) => commandsFactory(`SEND_ENCRYPTED`, epoch ,encSTRING),
    DIDNOT_UNDERSTAND: () => commandsFactory('DIDNOT_UNDERSTAND') 
} as const




export { lowCommandsFactory };