import encryption from "../../utils/encryption";
import Address from "../../types/Address";
import { KadBucket } from "../../types/KadBucket";
import KadNode from "../../types/KadNode";
import PrivateKey from "../../types/PrivateKey";
import XORValue from "../../types/XORValue";
import xor from "../../utils/xor";
import encryptedConnectionSocket from "./encryptedConnection/encryptedConnectionSocket";
import kademliaStorage, { KademliaStorage } from "./kademliaStorage/kademliaStorage";
import bootstrapStorage from "./bootstrapStorage/bootstrapStorage";

const MESSAGES_TYPES = {
    getNode: 0, // get node by id
    sendBackNodes: 1, // send back nodes
    requestInfo: 2,
    sendInfo: 3,
    requestTunnel: 4,
    getNodesByXOR: 5, // get nodes by xor
    // establish contract for communication intensities and number 
    // of messages that can be sent without receiving a response before the connection is closed
    // add timeout
} as const

function kademliaLevelSocket(){
    const { ping, getICECandidates, 
        sendEncryptedMessage, addEncryptedMessageListener, 
        addEncryptedConnectionSetupListener,
        removePongListener,
        addPongListener, sendEncryptedMessageToId, getId } = encryptedConnectionSocket;

    const MAX_UDP_TIMEOUT = 1000 * 30;

    addEncryptedConnectionSetupListener((from, id)=>{
        // also add contract information
        _kademliaStorage.addNode({
            lastConnectedIP:from,
            nodeId: id,
        });
        _messagesTypesSenders.requestInfo(from);
        // schedule next ping
        // schedule next node request more often if xor is small
        _messagesTypesSenders.getNodesByXOR(from, _kademliaStorage.xorValuesForStabilization());
    })

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

    const _bootstrap = bootstrapStorage();

    const _messagesTypesHandlers = {
        [MESSAGES_TYPES.getNode]: getNodeHandler,
    }

    const _messagesTypesSenders = {
        getNode: (address: Address, nodeId: Uint8Array) => sendEncryptedMessage(address, new Uint8Array([MESSAGES_TYPES.getNode ,...nodeId])),
        requestInfo: (address: Address) => sendEncryptedMessage(address, new Uint8Array([MESSAGES_TYPES.requestInfo])), 
        sendBackNodes: (address: Address, id: Uint8Array, nodes: KadNode[]) => sendEncryptedMessageToId(id, address, new Uint8Array([MESSAGES_TYPES.sendBackNodes, ...(nodes.flatMap(x=>[...serializeNode(x)])) ])),
        getNodesByXOR: (address: Address, xor: XORValue[]) => sendEncryptedMessage(address, new Uint8Array([MESSAGES_TYPES.getNodesByXOR, ...xor])),
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

    addEncryptedMessageListener((from: Address, id: Uint8Array, message: Uint8Array) => {
        try {
            //@ts-ignore
            _messagesTypesHandlers[message[0]](from, id, message.slice(1));
            _kademliaStorage.getOrAddNodeAndUpdate(id, () =>({
                nodeId: id,
                lastConnectedIP: from
            }))
        }
        catch{}
    })

    async function connectToBootstrap()
    {
        const nodes = _bootstrap.getRandomBootstrapNodesSeries();
        let endCondition = false;
        function onPongListener (from: Address) {
            if(nodes.includes(from)){
                endCondition = true;
            }
        }
        const listener = addPongListener(onPongListener);
        for(let i = 0; i < nodes.length/3; i++)
        {
            const nodesToBootstrap = nodes.slice(i*3, Math.min(i*3+3, nodes.length));
            for(let bootstrap of nodesToBootstrap)
            {
                ping(bootstrap);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            if(endCondition)
            {
                break;
            }
        }
        removePongListener(listener);

    }


    async function initialize(){
        const id = await getId();
        _kademliaStorage = kademliaStorage(id)
        // start pinging bootstrap nodes
        connectToBootstrap();
        // wake up kademlia and resume communication and contracts
    }

    initialize();

    return {
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