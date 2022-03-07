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
    }
];

/*because of fragmentation*/
const MAX_SAFE_MESSAGE_SIZE_IN_BYTES = 1400;
const MAX_SAFE_MESSAGE_SIZE_IN_CHARS = MAX_SAFE_MESSAGE_SIZE_IN_BYTES /4;/*UTF-8*/
const MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS = MAX_SAFE_MESSAGE_SIZE_IN_CHARS - 100;
const MAX_PARTITIONS = 100;
const MAX_SIZE_WITH_PARTITIONS_BYTES = MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS * 4 * MAX_PARTITIONS
const MAX_CACHE_FROM_DIFFRENT_ADDR = 1000;
const MAX_CONCURRENT_FROM_ONE_SOURCE = 3;
const IP_TIMEOUT = 1000;
const PACKET_TIMEOUT =1000;
const PACKET_PARTITION_TIMEOUT =1000;
function singleSocketMultiplexer(){
    //public servers will have higher tresholds => up to 1M
    //not full messages are only beetween clients

    //max 1000 ips partition messages
    const filoQueue = queueMap<string, QueueMap<string, QueueMap<number, string>>>(MAX_CACHE_FROM_DIFFRENT_ADDR, IP_TIMEOUT)

    const mainDgram = dgram.createSocket({
        type: 'udp4'
    });

    mainDgram.bind(16000);

    mainDgram.addListener('error', ()=> mainDgram.bind())
    
    let openForIceChange = false;
    let transactionId = new Uint8Array(12);
    let iceCandidates :Address[] = [];
    let _handler:( (addr: Address, message: string) => void) | null= null;

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
        for(let index=8; index<20; index++)
            STUN[index] = Math.floor(Math.random() * 256);
        
        return Object.freeze(STUN)
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

        const strMessage = message.toString();

        if(strMessage.startsWith('F'))
            return _handler && _handler({
                ip: rinfo.address,
                port: rinfo.port,
                kind: rinfo.family.toLowerCase() as any
            }, strMessage.substring(1, strMessage.length))
        if(strMessage.startsWith('P')){
            const split = strMessage.split('-');
            if(split.length < 5){
                return;
            }
            const partitions = Number(split[2]);
            const index = Number(split[1]);
            const partition = split.slice(4, split.length).reduce((a,b) => a+ '-'+b);
            const fullHash = split[3];
            if(isNaN(partitions) || isNaN(index))
                return;

            const ipKey = `${rinfo.address}:${rinfo.port}`;
            let node = filoQueue.getNode(ipKey);
            if(partitions > MAX_PARTITIONS || partitions < 2)
            {
                return;
            }
            if(!node)
            {
                node = queueMap<string, QueueMap<number, string>>(MAX_CONCURRENT_FROM_ONE_SOURCE, PACKET_TIMEOUT);
                filoQueue.addNode(ipKey, node);
            }
            filoQueue.updateTimestamp(ipKey)
            let innerNode = node.getNode(fullHash)
            if(!innerNode)
            {
                innerNode = queueMap<number,string>(partitions, PACKET_PARTITION_TIMEOUT);
                node.addNode(fullHash, innerNode)
            }
            node.updateTimestamp(fullHash)
    
                    innerNode.addNode(index, partition)
                    if(innerNode.size() === partitions){
                        const all = innerNode.getAll();
                        const deserialized = all.sort((a,b) => a.key - b.key).map(x=>x.value).reduce((a,b)=> a+b);
                        innerNode.clear();
                        node.remove(fullHash);
                        hashing.sha1String(deserialized) &&
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

    function sendFull(to:Address, message: string){
        const buff = Buffer.from(`F${message}`, "utf-8")
        mainDgram.send(buff, 0 , buff.length, to.port ,to.ip)
    }

    function partitionAndSend(to:Address, message: string){
        const partitions = Math.ceil(message.length / MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS)
        const fullHash = hashing.sha1String(message);
        for(let i=0; i<partitions; i++)
        {
            const partition = message.substring(i* MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS, (i+1) * MAX_SAFE_MESSAGE_SIZE_IN_CHARS_EXCLUDING_PARTITIONS);
            const buff = Buffer.from(`P-${i}-${partitions}-${fullHash}-${partition}`, "utf-8")
            mainDgram.send(buff, 0 , buff.length, to.port ,to.ip)
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
        onMessage ( handler: (from: Address, message: string) => void | Promise<void>){
            _handler = handler;
        },
        sendMessage(to:Address, message: string){
            const buff = Buffer.from(message, "utf-8")
            if(buff.length > MAX_SIZE_WITH_PARTITIONS_BYTES)
                throw "";
            if(buff.length > MAX_SAFE_MESSAGE_SIZE_IN_BYTES)
                return partitionAndSend(to, message);
            sendFull(to, message)
        }
    }
}
export default singleSocketMultiplexer()