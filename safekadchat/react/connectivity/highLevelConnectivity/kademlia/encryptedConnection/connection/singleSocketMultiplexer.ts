import Address from "../../../../types/Address";
import dgram from 'react-native-udp'
import isEqual from "../../../../utils/isEqual";
import hashing from "../../../../utils/hashing";
import queueMap, { QueueMap } from "../../../../utils/queueMap";
const stunServers  = [
    {
        domain: "stun.l.google.com",
        port: 19302
    },
    {
        domain: "stun.stunprotocol.org",
        port: 3478
    },
    {
        domain:"stun1.l.google.com", port:19302/*
stun2.l.google.com:19302
stun3.l.google.com:19302
stun4.l.google.com:19302*/
    }
];

/*because of fragmentation*/
const MAX_SAFE_MESSAGE_SIZE_IN_BYTES = 1400;
const MAX_SAFE_MESSAGE_SIZE_IN_CHARS = MAX_SAFE_MESSAGE_SIZE_IN_BYTES /4;/*UTF-8*/
const MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS = MAX_SAFE_MESSAGE_SIZE_IN_CHARS - 100;
const MAX_PARTITIONS = 100;
const MAX_SIZE_WITH_PARTITIONS_BYTES = MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS * 4 * MAX_PARTITIONS
const MAX_CACHE_FROM_DIFFRENT_ADDR = 1000;
const MAX_CONCURRENT_FROM_ONE_SOURCE = 2;
const IP_TIMEOUT = 1000; // timeot for holding message partitions
const PACKET_TIMEOUT = 100;
const PACKET_PARTITION_TIMEOUT = 0; //kill all packet partitions on overflow
function singleSocketMultiplexer(){
    //public servers will have higher tresholds => up to 1M
    //not full messages are only beetween clients

    //max 1000 ips partition messages
    const filoQueue = queueMap<string, QueueMap<number, QueueMap<number, Uint8Array>>>(MAX_CACHE_FROM_DIFFRENT_ADDR, IP_TIMEOUT)

    /*
        that will be main perf issue ot will 
        need to be written for project in java and swift
        
        /that needs to be rewritten/
        methods bind, onMessage, onError
        
        //STUN can be written in js so no problem
    
        */
    const mainDgram = dgram.createSocket({
        type: 'udp4'
    });

    mainDgram.bind(16000);

    mainDgram.addListener('error', ()=> mainDgram.bind())
    
    let openForIceChange = false;
    let transactionId = new Uint8Array(12);
    let iceCandidates :Address[] = [];
    let _handler:( (addr: Address, message: Uint8Array) => void) | null= null;

    function createSTUN(){
        const STUN = new Uint8Array(20);
        /*type*/
        STUN[0] = 0;
        STUN[1] = 1;

        /*message length*/
        STUN[2] = 0;
        STUN[3] = 0;

        /*magic cookie 0x21, 0x12, 0xa4, 0x42,*/
        STUN[4] = 33;
        STUN[5] = 18;
        STUN[6] = 164;
        STUN[7] = 66;

        /* transaction id random 12 bytes */
        for(let index=8; index<20; index+=1)
            {
                STUN[index] = Math.floor(Math.random() * 256);
            }
        return STUN
    }

    function readXORIPV4STUN(STUNResponse: Uint8Array){
        if(STUNResponse.length !== 32) return undefined
        /*Response head*/
        if(STUNResponse[0] !== 1 || STUNResponse[1] !== 1) return undefined
        /*Message length*/
        if(STUNResponse[2] !== 0 || STUNResponse[3] !== 12) return undefined
        /*magic cookie*/
        if(STUNResponse[4] !== 33 || STUNResponse[5] !== 18 || STUNResponse[6] !== 164 || STUNResponse[7] !== 66) return undefined;
        /*XOR response*/
        if(STUNResponse[20] !== 0 || STUNResponse[21] !== 32) return undefined;
        /*IPV4 length*/
        if(STUNResponse[22] !== 0 || STUNResponse[23] !== 8) return undefined; 
        const port = STUNResponse[26] ^ STUNResponse[4] *256 + STUNResponse[27] ^STUNResponse[5];
        const ip = `${STUNResponse[28] ^ STUNResponse[4]}.${STUNResponse[29] ^ STUNResponse[5]}.${STUNResponse[30] ^ STUNResponse[6]}.${STUNResponse[31] ^ STUNResponse[7]}` as const
       const transactionId = STUNResponse.subarray(8,20)
        return {
            port,
            ip,
            transactionId
        } as const
    }

    mainDgram.addListener('message' , (message : Buffer, rinfo: {address:string, port:number, family:'IPv6'| 'IPv4'}) => {
        /* ignore other requests if in this mode */
        try{
        if(openForIceChange)
        {
            //rinfo.address check if its registered stun server
            const translated = readXORIPV4STUN(message);
            
            if(translated && openForIceChange && 
                isEqual(translated.transactionId, transactionId)
                ){
                iceCandidates=[{
                    ip: translated.ip,
                    port: translated.port,
                    kind: 'ipv4'
                }]/*add local ip just for if in same wifi router*/
            return;}
        }

        const strMessage = message as Uint8Array;

        if(strMessage[0] === 0)
            return _handler && _handler({
                ip: rinfo.address,
                port: rinfo.port,
                kind: rinfo.family.toLowerCase() as any
            }, strMessage.slice(1, strMessage.length))
        if(strMessage[0] === 2){
           //1,i,sum_0,sum_1,sum_2,sum_3,partitions,
            const partitions = strMessage[6];
            const index = strMessage[1];
            const partition = strMessage.slice(7, strMessage.length);
            const fullHash = strMessage[2] +strMessage[3] *256 +strMessage[4] * 256 * 256 + strMessage[5] * 256 * 256 * 256;
           
            const ipKey = `${rinfo.address}:${rinfo.port}`;
            const node = filoQueue.getOrAddNodeAndUpdateTime(ipKey,()=> queueMap<number, QueueMap<number, Uint8Array>>(MAX_CONCURRENT_FROM_ONE_SOURCE, PACKET_TIMEOUT));
            if(partitions > MAX_PARTITIONS || partitions < 2)
            {
                return;
            }
            const innerNode = node.getOrAddNodeAndUpdateTime(fullHash,()=> queueMap<number,Uint8Array>(partitions, PACKET_PARTITION_TIMEOUT));
            innerNode.addNode(index, partition)
                    if(innerNode.size() === partitions){
                        const all = innerNode.getAll();
                        const deserialized = new Uint8Array(all.sort((a,b) => a.key - b.key).flatMap(x=>[...x.value]))
                        innerNode.clear();
                        node.remove(fullHash);
                         _handler && _handler({
                            ip: rinfo.address,
                            port: rinfo.port,
                            kind: rinfo.family.toLowerCase() as any
                        }, deserialized)
                    }
            
        }

        }
        catch{

        }
    })

    function ice(server:string, port: number){
        const STUN = createSTUN()
        transactionId = STUN.slice(8,20)
        mainDgram.send(STUN, 0, 160, port, server)
    }

    function sendFull(to:Address, message: Uint8Array){
        mainDgram.send(new Uint8Array([0, ...message]), 0 , message.byteLength + 1, to.port ,to.ip)
    }

    function partitionAndSend(to:Address, message: Uint8Array){
        const partitions = Math.ceil(message.length / MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS)
        
        const sum_0 = Math.floor(Math.random()*256)
        const sum_1 = Math.floor(Math.random()*256)
        const sum_2 = Math.floor(Math.random()*256)
        const sum_3 = Math.floor(Math.random()*256)
        for(let i=0; i<partitions; i++)
        {
            const partition = message.slice(i* MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS, (i+1) * MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS);
    
            mainDgram.send(new Uint8Array([2,i,sum_0,sum_1,sum_2,sum_3,partitions, ...partition]), 0 , partition.length + 7, to.port ,to.ip)
        }
    }

    return {
        getICECandidates(useCache = true): Promise<Address[]>{    
            return new Promise((resolve, reject)=>{
                if(iceCandidates.length && useCache)
                    resolve(iceCandidates)
                
                    openForIceChange =true;
                /*rnd server*/
                const index= Math.floor(Math.random()* stunServers.length)
                iceCandidates = []
                ice(stunServers[index].domain, stunServers[index].port)
                let counter = 0;
                let interval = setInterval(()=>{
                    if(iceCandidates.length){
                        clearInterval(interval)
                        openForIceChange =false
                        resolve(iceCandidates)
                    }
                    if(counter > 10){
                        clearInterval(interval)
                        openForIceChange = false
                        reject()
                    }
                    counter+=1;
                },100)
            })
                
        },
        onMessage ( handler: (from: Address, message: Uint8Array) => void | Promise<void>){
            _handler = handler;
        },
        sendMessage(to:Address, message: Uint8Array){
            if(message.byteLength > MAX_SIZE_WITH_PARTITIONS_BYTES)
                throw new Error("Too long messages");
            if(message.byteLength > MAX_SAFE_MESSAGE_SIZE_IN_BYTES)
                return partitionAndSend(to, message);
            sendFull(to, message)
        }
    }
}
export default singleSocketMultiplexer()