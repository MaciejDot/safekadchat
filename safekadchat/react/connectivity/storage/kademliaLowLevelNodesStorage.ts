import Address from "../types/Address";
import { KadBucket } from "../types/KadBucket";
import KadNode from "../types/KadNode";
import XORValue from "../types/XORValue";
import xor from "../utils/xor";
import clientInfo from "./clientInfo";

function kademliaLowLevelNodesStorage(){

    let _cache;
    
    let _permaStorage;
    
    let _kademliaStorage = new Map<XORValue, KadBucket>();

    for(let xorIndex = 0; xorIndex < 161; xorIndex += 1)
        _kademliaStorage.set(xorIndex as XORValue, { nodes: []})

    function cleanKademlia(){};
    


    return { 
        
        addNode(node: KadNode){
            const xorValue = xor(clientInfo.getClientId(), node.nodeId);
            _kademliaStorage.get(xorValue)?.nodes.push(node)
        },
        setAddress(id: Int8Array, address: Address){
            const xorValue = xor(clientInfo.getClientId(), id);
            const node = _kademliaStorage.get(xorValue)?.nodes.find(x=> id === x.nodeId)
            if(node) node.lastKnownIP = address
        },
        findClosestNode(){},
        findExactNode(id: Int8Array){
            const xorValue = xor(clientInfo.getClientId(), id);
            return _kademliaStorage.get(xorValue)?.nodes.find(x=> id === x.nodeId)
        }
    } 
}
export default kademliaLowLevelNodesStorage();