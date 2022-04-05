
import Address from "../../../types/Address";
import encryption from "../../../utils/encryption";
import hashing from "../../../utils/hashing";
import idGetter from "../../../utils/idGetter";
import isEqual from "../../../utils/isEqual";
import queueMap from "../../../utils/queueMap";
import random from "../../../utils/random";
import slidingTimeoutCache from "../../../utils/slidingTimeoutCache";
import singleSocketMultiplexer from "./connection/singleSocketMultiplexer";


const MAX_PENDING_ENCRYPTED_CONTEXTS = 1000000;
const MAX_PENDING_TIMEOUT = 1000000;
const COOKIE_LENGTH = 24;

/* for now without signature */
/* then it would be beneficial for checking that packets have not been tempered with*/
function selfId(){
    const encryptKey = encryption().generateKey();
    const id = getId();
    const publicEncryptionArray = getEncryptionArray();
    async function getId(){
        return await idGetter(await publicEncryptionArray)
    }


    async function getEncryptionArray(){
        return new Uint8Array(await encryption().exportKey((await encryptKey).publicKey))
    }


    return{
        getId(){
            return id;
        },
        getEncryption(){
            return encryptKey;
        },
        getEncryptionArray(){
            return publicEncryptionArray;
        }
    }
}

function encryptedConnectionSocket(){
    // const multi = singleSocketMultiplexer();
    // probably could be persisted but it will be sufficient in memory
    // const signature 
    const {
        getEncryption,
        getId,
        getEncryptionArray
    } = selfId();

    // stuff + signature => if signature verified then node has id of encrypted + signed => 
    // but only for me what about others?
    
    const _contextsQueue = queueMap<string, 
        {
            justStarted:false,
            cookieA: Uint8Array,
            cookieB: Uint8Array,
            encryptionSharedKey : CryptoKey,
            otherPartyEncryptionKey: CryptoKey,
            otherPartyId: Uint8Array,
            canSend: boolean
        } | {
            justStarted: true,
            cookieA: Uint8Array
        }
    >(MAX_PENDING_ENCRYPTED_CONTEXTS, MAX_PENDING_TIMEOUT);
    const _onConnected:Map<number, ((address: Address, id: Uint8Array) => void)> = new Map();
    const _handler:Map<number, ( (from: Address, id: Uint8Array, message: Uint8Array) => void)>= new Map();
    const _pongHandler:Map<number, ( (from: Address) => void)>= new Map();
    const { getICECandidates, sendMessage, onMessage } = singleSocketMultiplexer
   
    onMessage((from, message)=>{
        try{
            (_messagesTypesHandlers as any)[message[0]]?.(from, message.slice(1, message.length))
        }
        catch{}
    })

    const _messagesTypes= {
        ping: 0,
        pong: 1,
        hello: 2,
        responseHello:3,
        finishHandshake: 4,
        encryptedChannel: 5
    } as const

    const _messagesTypesHandlers = {
        [_messagesTypes.ping]: pingHandler,
        [_messagesTypes.pong]: pongHandler,
        [_messagesTypes.hello]: helloHandler,
        [_messagesTypes.responseHello]: responseHelloHandler,
        [_messagesTypes.finishHandshake]: finishHandshakeHandler,
        [_messagesTypes.encryptedChannel]: encryptedChannelHandler
    };

    const _messagesTypesSenders = {
        ping: (to: Address) => sendMessage(to, new Uint8Array([_messagesTypes.ping])),
        pong: (to: Address) => sendMessage(to, new Uint8Array([_messagesTypes.pong])),
        async hello (to: Address, cookie: Uint8Array) {  sendMessage(to ,new Uint8Array([_messagesTypes.hello, ...cookie, ...(await getEncryptionArray())]))},
        async responseHello(to: Address, cookie: Uint8Array) {  sendMessage(to ,new Uint8Array([_messagesTypes.responseHello, ...cookie, ...(await getEncryptionArray())]))},
        async finishHandshake(to: Address) { sendMessage(to, new Uint8Array(_messagesTypes.finishHandshake))},
        async sendEncrypted(to: Address, unencryptedMessage: Uint8Array, id?: Uint8Array) {
            
            const context = _contextsQueue.getNode(key(to));
            
            if(!context || context.justStarted || !context.canSend)
                throw '';
                if(id && !isEqual(id, context.otherPartyId)){
                throw '';
                }
            const  {encrypted, iv}= await encryption().encrypt(new Uint8Array([ ...unencryptedMessage, ...(await hashing.hash(unencryptedMessage))]), context.encryptionSharedKey);
            sendMessage(to, new Uint8Array([_messagesTypes.encryptedChannel, ...iv, ...encrypted]))
        }
    }

    async function encryptedChannelHandler(from: Address, message: Uint8Array){
        const iv = message.slice(0 , 16);
        const encrypted = message.slice(16, message.length);
        const node = _contextsQueue.getNode(key(from));
        if(!node || node.justStarted){
            const cookieA = random().randomArray(COOKIE_LENGTH);
            _contextsQueue.addNode(key(from), { justStarted: true, cookieA })
            return _messagesTypesSenders.hello(from, cookieA);
        }
        _contextsQueue.updateTimestamp(key(from));
        const decrypted =await encryption().decrypt({encrypted,iv}, node.encryptionSharedKey);
        if(!node.canSend){
            _contextsQueue.addNode(key(from),{...node,canSend:true})
            onSafeChannel(from);
        }
        const decryptedWithoutHash = decrypted.slice(0, decrypted.length - 32);
        const recivedHash = decrypted.slice(decrypted.length - 32, decrypted.length);
        const actualHash = await hashing.hash(decryptedWithoutHash);
        if(isEqual(recivedHash, actualHash))
            _handler.forEach(handler=> {try { handler(from, node.otherPartyId, decryptedWithoutHash)} catch{}})
    }

    async function responseHelloHandler(from:Address, message: Uint8Array){
        if(message.length !== (encryption().rawPublicKeySize() + COOKIE_LENGTH))
            return;
        const node = _contextsQueue.getNode(key(from));
        _contextsQueue.updateTimestamp(key(from))
        if(!node){
            const cookieA = random().randomArray(COOKIE_LENGTH);
            _contextsQueue.addNode(key(from), { justStarted: true, cookieA })
            return _messagesTypesSenders.hello(from, cookieA);
        }
        const cookieB = message.slice(0, COOKIE_LENGTH);
        const encryptionKey = message.slice(COOKIE_LENGTH, message.length)
        const otherPartyEncryptionKey = await encryption().importKey(message);
        const otherPartyId = await idGetter(message);
        const encryptionSharedKey = await encryption().secret(await encryption().importKey(encryptionKey), (await getEncryption()).privateKey, new Uint8Array([...node.cookieA, ...cookieB]));
        _contextsQueue.addNode(key(from), {
            justStarted: false,
            canSend: false,
            cookieA: node.cookieA,
            cookieB,
            encryptionSharedKey,
            otherPartyEncryptionKey,
            otherPartyId
        })
        onSafeChannel(from);
        _messagesTypesSenders.finishHandshake(from);
    }

    async function finishHandshakeHandler(from: Address){
        const node = _contextsQueue.getNode(key(from))
        if(!node || node.justStarted)
        {
            const cookieA = random().randomArray(COOKIE_LENGTH);
            _contextsQueue.addNode(key(from), { justStarted:true, cookieA })
            return _messagesTypesSenders.hello(from, cookieA);
        }
        onSafeChannel(from);
        _contextsQueue.addNode(key(from), {...node, canSend:true})
    }

    async function helloHandler(from: Address, message: Uint8Array){
        if(message.length !== (encryption().rawPublicKeySize() + COOKIE_LENGTH))
            return;
        const cookieA = message.slice(0, COOKIE_LENGTH);
        const cookieB = random().randomArray(COOKIE_LENGTH);
        const encryptionKey = message.slice(COOKIE_LENGTH, message.length)
        const otherPartyEncryptionKey = await encryption().importKey(message);
        const otherPartyId = await idGetter(message);
        const encryptionSharedKey = await encryption().secret(await encryption().importKey(encryptionKey), (await getEncryption()).privateKey, new Uint8Array([...cookieA, ...cookieB]));
        _contextsQueue.addNode(key(from), {
            justStarted: false,
            canSend: false,
            cookieA,
            cookieB,
            encryptionSharedKey,
            otherPartyEncryptionKey,
            otherPartyId
        })
        _messagesTypesSenders.responseHello(from, cookieB);
    }

    function key(addr: Address){
        return `${addr.ip}:${addr.port}`
    }

    function pingHandler(from: Address){
        _contextsQueue.updateTimestamp(key(from));
        _messagesTypesSenders.pong(from);
    }

    async function pongHandler(from: Address){
        const node = _contextsQueue.getNode(key(from));
        _contextsQueue.updateTimestamp(key(from))
        _pongHandler.forEach(handler=> {try { handler(from)} catch{}})
        if(!node){
            const cookieA = random().randomArray(COOKIE_LENGTH);
            _contextsQueue.addNode(key(from), { justStarted: true, cookieA })
            _messagesTypesSenders.hello(from, cookieA);
            return;
        }
    }

    const _cache = slidingTimeoutCache<string, Uint8Array[]>(10000);
    const _idCache = slidingTimeoutCache<string, Uint8Array[]>(10000);

    function idKey(addr: Address, id: Uint8Array): string{
        return `${addr.ip}:${addr.port}:${[...id].map(x=>`${x}`).join('')}`
    }

    function onSafeChannel(addr: Address){
        
        const node = _cache.popNode(key(addr))
        if(!node)
            return;
      
        node.forEach(message => _messagesTypesSenders.sendEncrypted(addr, message))
        const ctxNode = _contextsQueue.getNode(key(addr));
        if(!ctxNode || ctxNode.justStarted)
            return;
        _onConnected.forEach(handler=> {try { handler(addr, ctxNode.otherPartyId)} catch{}})
        const idNode = _idCache.popNode(idKey(addr, ctxNode.otherPartyId));
        if(!idNode)
            return;
        idNode.forEach(message => _messagesTypesSenders.sendEncrypted(addr, message, ctxNode.otherPartyId));
    }

    return {
        getICECandidates,
        ping: _messagesTypesSenders.ping,
        async sendEncryptedMessage(address: Address, unencryptedMessage: Uint8Array){
            const node = _contextsQueue.getNode(key(address));
            if(!node){
                _messagesTypesSenders.ping(address);
            }
            if(!node || node.justStarted)
            {
                _cache.addOrUpdateNode(key(address),  [unencryptedMessage], (previous) => ([...previous, unencryptedMessage]));
                return;
            }
            _messagesTypesSenders.sendEncrypted(address, unencryptedMessage);
        },

        sendEncryptedMessageToId(id:Uint8Array, to: Address, unencryptedMessage: Uint8Array){
            //if we want to send message to id, we should validate that id is correct
            const node = _contextsQueue.getNode(key(to));
            if(!node){
                _messagesTypesSenders.ping(to);
            }

            if(!node || node.justStarted)
            {
                _idCache.addOrUpdateNode(idKey(to, id),  [unencryptedMessage], (previous) => ([...previous, unencryptedMessage]));
                return;
            }

            if(isEqual(node.otherPartyId, id))
                _messagesTypesSenders.sendEncrypted(to, unencryptedMessage, id);
        },

        addEncryptedConnectionSetupListener(handler: (from: Address, id: Uint8Array) => void){
            const id = Math.random();
            _onConnected.set(id, handler);
            return id;
        },

        removeEncryptedConnectionSetupListener(id: number){
            _onConnected.delete(id);
        },

        addEncryptedMessageListener(handler:(from: Address, id: Uint8Array, message: Uint8Array) => void){
            const id = Math.random();
            _handler.set(id, handler);
            return id;
        },

        removeEncryptedMessageListener(id: number){
            _handler.delete(id);
        },

        getId,

        addPongListener(handler:(from: Address) => void){
            const id = Math.random();
            _pongHandler.set(id, handler);
            return id;
        },

        removePongListener(id: number){
            _pongHandler.delete(id);
        }
    }
}

export default encryptedConnectionSocket();