import Address from "../../../types/Address";
import idGetter from "../../../utils/idGetter";
import queueMap from "../../../utils/queueMap";
import signing from "../../../utils/signing";
import encryptedConnectionSocket from "./encryptedConnection/encryptedConnectionSocket";

const MAX_SIGNS = 1000000;
const COOKIE_SIZE = 20;
const MAX_TIMEOUT = 1000000;


function nodeSignature(){

    const signingAlgo = signing().generateSignKey();

    async function get(){
        return await signingAlgo;
    }

    async function getNodeId(){
        return idGetter((await get()).publicKey);
    }
    
    return {
        get, getNodeId
    }
}

export default function signedConnectionSocket(){
    const { onEncryptedMessage, getICECandidates, sendEncryptedMessage , onPong, ping} = encryptedConnectionSocket;
    
    const _signaturesContext = queueMap<string , 
    {
        sentCookie: Uint8Array,
        recievedCookie: Uint8Array,
        otherPartyPublicSignature: CryptoKey,
        otherPartyPublicSignatureHash: Uint8Array
    }
    
    >(MAX_SIGNS, MAX_TIMEOUT);
    
    const {get, getNodeId} = nodeSignature();

    const _messageTypes = {
        hello: 0,
        responseHello: 1,
        signedMessage: 2
    }

    function sendSignedMessage(to: Address, message: Uint8Array){

    }
    
    return {
        getNodeId, 
        ping,
        onPong,
        getICECandidates,

    }
}