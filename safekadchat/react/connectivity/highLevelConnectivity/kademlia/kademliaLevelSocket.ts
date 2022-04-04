import encryption from "../../utils/encryption";
import Address from "../../types/Address";
import { KadBucket } from "../../types/KadBucket";
import KadNode from "../../types/KadNode";
import PrivateKey from "../../types/PrivateKey";
import XORValue from "../../types/XORValue";
import xor from "../../utils/xor";
import encryptedConnectionSocket from "./encryptedConnection/encryptedConnectionSocket";
import kademliaStorage, { KademliaStorage } from "./kademliaStorage/kademliaStorage";

const STATIC_ARRAY_OF_BOOTSTRAP = [{
    ip: '192.168.1.123',
    port: 16000}] as const;

const MESSAGES_TYPES = {
    getNode: 0,
    sendBackNodes: 1,
    requestInfo: 2,
}

function kademliaLevelSocket(){
    const { ping, getICECandidates, sendEncryptedMessage, onEncryptedMessage, onPong, sendEncryptedMessageToId, getId } = encryptedConnectionSocket;

    const MAX_UDP_TIMEOUT = 1000 * 30;

    function serializeNode(node: KadNode){
        function serializePort(port: number){
            return new Uint8Array([ port & 0xff, port >> 8])
        }

        function serializeAddress(address: Address){
            return new Uint8Array([
                ...address.ip.split('.').map(x => parseInt(x)),
                ...serializePort(address.port)
            ])
        }
        
        return new Uint8Array([
            ...node.nodeId,
            ...serializeAddress(node.lastConnectedIP),
        ]);
    }

    let _kademliaStorage: KademliaStorage;

    const _dynamicBootstraps = [];

    const _messagesTypesHandlers = {
        [MESSAGES_TYPES.getNode]: getNodeHandler,
    }

    const _messagesTypesSenders = {
        getNode: (address: Address, nodeId: Uint8Array) => sendEncryptedMessage(address, new Uint8Array([MESSAGES_TYPES.getNode ,...nodeId])),
        requestInfo: (address: Address) => sendEncryptedMessage(address, new Uint8Array([MESSAGES_TYPES.requestInfo])), 
        sendBackNodes: (address: Address, id: Uint8Array, nodes: KadNode[]) => sendEncryptedMessageToId(id, address, new Uint8Array([MESSAGES_TYPES.sendBackNodes, ...(nodes.flatMap(x=>[...serializeNode(x)])) ])),
    } as const

    function getNodeHandler(from: Address, id: Uint8Array, message: Uint8Array){
        const singleNode = _kademliaStorage.getExactNode(message);
        if(singleNode && singleNode.timestamp + MAX_UDP_TIMEOUT > Date.now()){
            return _messagesTypesSenders.sendBackNodes(from, id, [ singleNode.node ]);
        }
        const availableNodes = _kademliaStorage.getClosestNode(message);
        return _messagesTypesSenders.sendBackNodes(from, id, availableNodes.map(x=>({
            nodeId: x.id,
            lastConnectedIP: x.lastKnownIp,
        })));

    }

    onEncryptedMessage((from: Address, id: Uint8Array, message: Uint8Array) => {
        try {
            _messagesTypesHandlers[message[0]](from, id, message.slice(1));
            _kademliaStorage.getOrAddNodeAndUpdate(id, () =>({
                nodeId: id,
                lastConnectedIP: from
            }))
        }
        catch{}
    })

    async function stabilizeKademlia(){}

    async function connectToBootstrap(bootstrapSource: { ip:string, port: number}[])
    {

    }


    async function initialize(){
        //GET ROUTER (WILL BE IN RAM)
        //GET STORAGE (PARTLY WILL BE IN RAM PARTLY IN FILE STORAGE - dont really need full)
        //GET BOOTSTRAP
        const id = await getId();
        _kademliaStorage = kademliaStorage(id)

        if(_dynamicBootstraps.length){
            //return;
        }
        else{
            (Math.random() * STATIC_ARRAY_OF_BOOTSTRAP.length)
        }

        stabilizeKademlia();

        
    }

    initialize();

    return {
        buildKademlia(){},
        getICECandidates,
        pingNode(nodeId: string){
            const node = findLocalExactNode(transformToArrayBuffer(nodeId));
            if(node){
                ping(node.lastKnownIP)
            }
        },
        ping,
        sendToLowNode(nodeId: string, message: string){
            const node = findLocalExactNode(transformToArrayBuffer(nodeId));
            if(node){
                sendEncryptedMessage(node.lastKnownIP, message)
            }
        },
        storeSigned(id: string, value: string){},
        onMessage(handler:(lowId: string, message:string) => void){}
    }
}
export default kademliaLevelSocket();