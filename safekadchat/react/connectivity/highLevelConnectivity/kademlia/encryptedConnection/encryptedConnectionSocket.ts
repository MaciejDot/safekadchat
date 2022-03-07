import Address from "../../../types/Address";
import PrivateKey from "../../../types/PrivateKey";
import PublicKey from "../../../types/PublicKey";
import queueMap from "../../../utils/queueMap";
import singleSocketMultiplexer from "./connection/singleSocketMultiplexer";

const MAX_PENDING_ENCRYPTED_CONTEXTS = 1000000;
const MAX_PENDING_TIMEOUT = 1000000;


function encryptedConnectionSocket(){
    //const multi = singleSocketMultiplexer();
    const _contextsQueue = queueMap<string, {
        publicEncryptionOfRemote: PublicKey,
        privateEncryptionOfSelf: PrivateKey,
        remoteCookie: string,
        selfCookie: string
    }>(MAX_PENDING_ENCRYPTED_CONTEXTS, MAX_PENDING_TIMEOUT);


    let _handler:( (addr: Address, message: string) => void) | null= null;
    
    const { getICECandidates, sendMessage, onMessage } = singleSocketMultiplexer

    onMessage((from, message)=>{
        const ipKey = `${from.ip}:${from.port}`;
        /* update if context is actual */
        /* on PONG create safe channel */
        _contextsQueue.updateTimestamp(ipKey)

    })

    return {
        getICECandidates,
        ping(address: Address){
            sendMessage(address, 'PING')
        },
        sendEncryptedMessage(address: Address, message: string){
            // ensureSafeChannel
            // client hello
            // server hello cookie
            // client cookie servCookie
            // server servCookie pubEnc
            // client cookie servCookie pubEnc
            // channel is encrypted
            // IV + (selfCookie-otherCookie-messageCookie(random epoch)-message) = IV+encrypted
        
            // didnot understand upgrade cookie pubkey
            // response cookie pubKey
            // request signature if nodeId === nodeId for sure on safe channel change
        },

        onEncryptedMessage(handler:(from: Address, message: string) => void){
            _handler = handler;
        },
    }
}

export default encryptedConnectionSocket();