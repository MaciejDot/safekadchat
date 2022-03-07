import encryption from "../../encryption/encryption";
import Address from "../../types/Address";
import { KadBucket } from "../../types/KadBucket";
import KadNode from "../../types/KadNode";
import PrivateKey from "../../types/PrivateKey";
import XORValue from "../../types/XORValue";
import hashing from "../../utils/hashing";
import xor from "../../utils/xor";
import encryptedConnectionSocket from "./encryptedConnection/encryptedConnectionSocket";

function kademliaLevelSocket(){
    const {generateKey} = encryption();
    const {sha1Array, transformToArrayBuffer} = hashing
    const {ping, getICECandidates, sendEncryptedMessage, onEncryptedMessage } = encryptedConnectionSocket;
    const clientInfo : {
        key: PrivateKey,
        id : Int8Array
    }= {
        key: {
            publicKey: "",
            privateKey: "",
            algorithm: 'ECDSA'
        },
        id : new Int8Array(1)
    }
    
    generateKey('ECDSA').then(key=> {
        clientInfo.key = key;
        clientInfo.id = sha1Array(key.publicKey)
    })

    const _kademliaStorage = new Map<XORValue, KadBucket>();

    for(let xorIndex = 0; xorIndex < 161; xorIndex += 1)
        _kademliaStorage.set(xorIndex as XORValue, { nodes: []})
      
    function addNode(node: KadNode){
            const xorValue = xor(clientInfo.id, node.nodeId);
            _kademliaStorage.get(xorValue)?.nodes.push(node)
    };
        
    function findLocalExactNode(id: Int8Array){
            const xorValue = xor(clientInfo.id, id);
            return _kademliaStorage.get(xorValue)?.nodes.find(x=> id === x.nodeId)
        };

    return {
        buildKademlia(){},
        getICECandidates,
        pingNode(nodeId: string){
            const node = findLocalExactNode(transformToArrayBuffer(nodeId));
            if(node){
                ping(node.lastKnownIP)
            }
        },
        pingAddress(address: Address){ping(address)},
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