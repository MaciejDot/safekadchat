import Address from "../../../../types/Address";
import PrivateKey from "../../../../types/PrivateKey";
import PublicKey from "../../../../types/PublicKey";
import encryption from "../../../../utils/encryption";
import idGetter from "../../../../utils/idGetter";
import isEqual from "../../../../utils/isEqual";
import queueMap from "../../../../utils/queueMap";
import signing from "../../../../utils/signing";
import timeoutTable from "../../../../utils/timeoutTable";
import singleSocketMultiplexer from "./connection/singleSocketMultiplexer";


const MAX_PENDING_ENCRYPTED_CONTEXTS = 1000000;
const MAX_PENDING_TIMEOUT = 1000000;

//use array of encryption keys max 1000 there is no reason not to reuse them
//ttacks using about computation power would not be possible
const COOKIE_SIZE = 36;
const MAX_MESSAGE_CACHE = 100;
const MAX_CACHE_TIME = 10000;


function encryptedConnectionSocket(){
    //const multi = singleSocketMultiplexer();
    //probably could be persisted but it will be sufficient in memory
    const _contextsQueue = queueMap<string, 
        { 
            sentCookie?: Uint8Array,
            recievedCookie?: Uint8Array,
            sentPublicEncryption?: CryptoKey,
            unsentPrivateEncryption?: CryptoKey,
            recievedPublicEncryption?: CryptoKey,
            calculatedSecret?: CryptoKey,

            otherPartyPublicKeyEncryption?: CryptoKey,
            sentSigningCookie?: Uint8Array,
            recievedSigningCookie?: Uint8Array
        }
    >(MAX_PENDING_ENCRYPTED_CONTEXTS, MAX_PENDING_TIMEOUT);

    let _handler:( (addr: Address, message: Uint8Array) => void) | null= null;
    let _pongHandler:( (addr: Address) => void) | null= null;
    const { getICECandidates, sendMessage, onMessage } = singleSocketMultiplexer

    function isChannelSafe(to : Address){
        const context = _contextsQueue.getNode(key(to));
        return !!context?.calculatedSecret
    }

    function onSafeChannel(to: Address){
        const cached = _cache.getNode(key(to));
        cached?.messages.forEach(message => sendEncrypted(cached.addr, message))
    }

    async function sendEncrypted(to: Address, message :Uint8Array){
        const context = _contextsQueue.getNode(key(to));
        const  {encrypted, iv}= await encryption().encrypt(message, context?.calculatedSecret as CryptoKey);
        sendMessage(to, new Uint8Array([_messagesTypes.encryptedChannel, ...iv, ...encrypted]))
    }
   
    const _cache = queueMap<string, {
        addr:Address,
        messages: Uint8Array[]
    }>(MAX_MESSAGE_CACHE,MAX_CACHE_TIME)
   
    //addMessage listener [] and remove listeners for addListeners for loggers
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
        upgrade: 4,
        responseUpgrade: 5,
        encryptedChannel: 6
    } as const

    const _messagesTypesHandlers = {
        [_messagesTypes.ping]: pingHandler,
        [_messagesTypes.pong]: pongHandler,
        [_messagesTypes.hello]: helloHandler,
        [_messagesTypes.responseHello]: responseHelloHandler,
        [_messagesTypes.upgrade] : upgradeHandler,
        [_messagesTypes.responseUpgrade]: responseUpgradeHandler,
        [_messagesTypes.encryptedChannel] : encryptedChannelHandler
    };

    async function encryptedChannelHandler(addr: Address, buffer: Uint8Array){
        const context = _contextsQueue.getNode(key(addr));
        if(!context?.calculatedSecret) {
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);
            _contextsQueue.addNode(key(addr), { sentCookie })
            sendMessage(addr,new Uint8Array([_messagesTypes.hello, ...sentCookie]))
            return;
        }
        try{
            const iv = buffer.slice(0,16);
            const encrypted = buffer.slice(16, buffer.length);
            const decrypted = await encryption().decrypt({iv, encrypted}, context.calculatedSecret);
            _handler && _handler(addr, decrypted);
        }
        catch{
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);
            _contextsQueue.addNode(key(addr), { sentCookie })
            sendMessage(addr,new Uint8Array([_messagesTypes.hello, ...sentCookie]))
            return;
        }
    }

    async function responseUpgradeHandler(addr: Address, buffer: Uint8Array)
    {
        if(buffer.length !== (COOKIE_SIZE * 2 + encryption().rawPublicKeySize() * 2))
            return;
        const recievedSentCookie = buffer.slice(0, COOKIE_SIZE);
        const recievedCookie = buffer.slice(COOKIE_SIZE, COOKIE_SIZE*2);
        const myPublicKey = buffer.slice(COOKIE_SIZE *2, COOKIE_SIZE *2 + encryption().rawPublicKeySize());
        const yourPublicKey = buffer.slice(COOKIE_SIZE *2 + encryption().rawPublicKeySize(), COOKIE_SIZE *2 + encryption().rawPublicKeySize() * 2);
      
        let node = _contextsQueue.getNode(key(addr))
        _contextsQueue.updateTimestamp(key(addr))
        if(!node)
        {
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);
            return sendMessage(addr, new Uint8Array([_messagesTypes.responseHello, ...recievedCookie, ...sentCookie]))
        }
        if(!isEqual(node.sentCookie, recievedSentCookie))
            return;
        if(!node.sentPublicEncryption)
            return sendMessage(addr, new Uint8Array([_messagesTypes.responseHello, ...recievedCookie, ...recievedSentCookie]))
        const serialized = new Uint8Array(await encryption().exportKey(node.sentPublicEncryption));
        if(!isEqual(serialized, myPublicKey))
            return sendMessage(addr, new Uint8Array([_messagesTypes.responseHello, ...recievedCookie, ...recievedSentCookie]))
        node.recievedPublicEncryption = await encryption().importKey(yourPublicKey);
        node.calculatedSecret = await encryption().secret(node.recievedPublicEncryption as CryptoKey, node.unsentPrivateEncryption as CryptoKey);
        onSafeChannel(addr)
    }

    async function upgradeHandler(addr: Address, buffer: Uint8Array){
        if(buffer.length !== (COOKIE_SIZE * 2 + encryption().rawPublicKeySize()))
            return;
        const recievedSentCookie = buffer.slice(0, COOKIE_SIZE);
        const recievedCookie = buffer.slice(COOKIE_SIZE, COOKIE_SIZE*2);
        const serializePublicKey = buffer.slice(COOKIE_SIZE *2, COOKIE_SIZE *2 + encryption().rawPublicKeySize());
        let node = _contextsQueue.getNode(key(addr))
        if(!node)
        {
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);

            return sendMessage(addr, new Uint8Array([_messagesTypes.responseHello, ...recievedCookie, ...sentCookie]))
        }
        if(!isEqual(node.sentCookie, recievedSentCookie))
            return;
            const newKey = await encryption().importKey(serializePublicKey);
                const { publicKey, privateKey } = await encryption().generateKey();
                node.sentPublicEncryption = publicKey;
                node.unsentPrivateEncryption = privateKey;
                node.recievedPublicEncryption = newKey;
            node.calculatedSecret =await encryption().secret(newKey,  node.unsentPrivateEncryption);
            _contextsQueue.addNode(key(addr), node);
            _contextsQueue.updateTimestamp(key(addr));
            const myPubKey =new Uint8Array(await encryption().exportKey(node.sentPublicEncryption))
            sendMessage(addr, new Uint8Array([_messagesTypes.responseUpgrade, ...recievedCookie, ...recievedSentCookie, ...serializePublicKey, ...myPubKey ]))
            setTimeout(() => onSafeChannel(addr), 1000) // wair until other party is ready
        }


    async function responseHelloHandler(addr:Address, cookies: Uint8Array){
        if(cookies.length !== (COOKIE_SIZE*2)){
            return;
        }
        const recievedSentCookie = cookies.slice(0, COOKIE_SIZE);
        const recievedCookie = cookies.slice(COOKIE_SIZE, COOKIE_SIZE*2);
        let node = _contextsQueue.getNode(key(addr));
        if(!node)
        {
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);

            return sendMessage(addr, new Uint8Array([_messagesTypes.responseHello, ...recievedCookie, ...sentCookie]))
        }
        if(!isEqual(node.sentCookie, recievedSentCookie))
            return;
        const { publicKey, privateKey } = await encryption().generateKey();
        node.sentPublicEncryption = publicKey;
        node.unsentPrivateEncryption = privateKey;
        _contextsQueue.addNode(key(addr), node);
        _contextsQueue.updateTimestamp(key(addr))
        sendMessage(addr, new Uint8Array([_messagesTypes.upgrade, ...recievedCookie, ...recievedSentCookie, ...new Uint8Array(await encryption().exportKey(node.sentPublicEncryption))]))
    }

    function helloHandler(addr: Address, cookie: Uint8Array){
        if(cookie.length !== COOKIE_SIZE)
            return;
        let node = _contextsQueue.getOrAddNodeAndUpdateTime(key(addr), () =>({ recievedCookie: cookie}));
        if(!isEqual(node.recievedCookie,cookie)){
            _contextsQueue.remove(key(addr))
            node = {recievedCookie:cookie };
            _contextsQueue.addNode(key(addr), node)
        }
        const sentCookie = new Uint8Array(COOKIE_SIZE);
        crypto.getRandomValues(sentCookie);
        _contextsQueue.addNode(key(addr), { ...node, sentCookie }) 
        return sendMessage(addr, new Uint8Array([_messagesTypes.responseHello, ...cookie, ...sentCookie]))
    }

    function key(addr: Address){
        return `${addr.ip}:${addr.port}`
    }

    function pingHandler(from: Address){
       _contextsQueue.getOrAddNodeAndUpdateTime(key(from),()=> ({

        }))
        sendMessage(from, new Uint8Array([_messagesTypes.pong]))
    }

    function pongHandler(from: Address){
        const node = _contextsQueue.getOrAddNodeAndUpdateTime(key(from),()=> ({
        }))
        _pongHandler && _pongHandler(from)
        if(!node.recievedCookie){
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);
            _contextsQueue.addNode(key(from), { ...node, sentCookie })
            sendMessage(from,new Uint8Array([_messagesTypes.hello, ...sentCookie]))
            return;
        }
    }

    const _safeChannelBlockContext = timeoutTable<string, boolean>(5000);

    function ensureCreationOfSafeChannel(addr : Address){
        if( _safeChannelBlockContext.getNode(key(addr)) )
            return;
        _safeChannelBlockContext.addNode(key(addr), true)
        const node = _contextsQueue.getOrAddNodeAndUpdateTime(key(addr),()=> ({
        }))
            const sentCookie = new Uint8Array(COOKIE_SIZE);
            crypto.getRandomValues(sentCookie);
            _contextsQueue.addNode(key(addr), { ...node, sentCookie })
            sendMessage(addr,new Uint8Array([_messagesTypes.hello, ...sentCookie]))
            return;
        
    }

    return {
        getICECandidates,
        ping(address: Address){
            sendMessage(address, new Uint8Array([_messagesTypes.ping]))
        },

        async sendEncryptedMessage(address: Address, message: Uint8Array){
            if(isChannelSafe(address))
                return sendEncrypted(address, message);
            const node = _cache.getOrAddNodeAndUpdateTime(key(address),() => ({
                addr: address,
                messages: [] as Uint8Array[]
            }))
            node.messages.push(message);
            ensureCreationOfSafeChannel(address);
        },

        onEncryptedMessage(handler:(from: Address, message: Uint8Array) => void){
            _handler = handler;
        },

        onPong(handler:(from: Address) => void){
            _pongHandler = handler
        }
    }
}

export default encryptedConnectionSocket();