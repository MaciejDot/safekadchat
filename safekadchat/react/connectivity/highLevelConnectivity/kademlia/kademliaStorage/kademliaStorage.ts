import Address from "../../../types/Address";
import KadNode from "../../../types/KadNode";
import XORValue from "../../../types/XORValue";
import xor from "../../../utils/xor";

export default function kademliaStorage(selfId: Uint8Array) {
    const CAPACITY = 1000 * 256;
    const MIN_BUCKET_SIZE = 100;
    const ALLOWED_UDP_PUNCH_TIMEOUT = 1000 * 30;
    const MAX_NODES = 10;
    const _map = new Map<XORValue, Map<Uint8Array, { node: KadNode, timestamp: number}>>();
    
    function fillInitMap(){
        for(let i = 0; i < 256; i++){
            _map.set(i as XORValue, new Map<Uint8Array, { node: KadNode, timestamp: number}>());
        }
    }

    fillInitMap();

    function addNode(node: KadNode){
        _map.get(xor(node.nodeId, selfId))?.set(node.nodeId, {node, timestamp: Date.now()});
        let size = 0;
        _map.forEach(x => size += x.size);
        if(size > CAPACITY){
            const entries : {xor: XORValue, id: Uint8Array, timestamp: number}[] =[];
            const currentSizes = new Map<XORValue, number>();
            for(let entry of _map.entries()){
                for(let node of entry[1].entries()){
                    entries.push({xor: entry[0], id: node[0], timestamp: node[1].timestamp})
                }
                currentSizes.set(entry[0], entry[1].size);
            }
            entries.sort((a,b) => b.timestamp - a.timestamp)
                .filter((_, index) => index < CAPACITY / 2)
                .forEach(entry => {
                    if(currentSizes.get(entry.xor) as number > MIN_BUCKET_SIZE){
                        _map.get(entry.xor)?.delete(entry.id);
                        currentSizes.set(entry.xor, currentSizes.get(entry.xor) as number - 1);
                    }
                });
        }
    }

    function getExactNode(key: Uint8Array){
        return _map.get(xor(key, selfId))?.get(key);
    }

    function getOrAddNodeAndUpdate(key: Uint8Array, valueFactory: () => KadNode){
        let node = getExactNode(key)?.node;
        if(!node){
            node = valueFactory();
            addNode(node);
        }
        else{
            node = valueFactory();
            _map.get(xor(key, selfId))?.set(key, {node, timestamp: Date.now()});
        }
        return node;
    }

 
    function updateTimestamp(id: Uint8Array){
        const node = _map.get(xor(id, selfId))?.get(id);
        if(node)
            node.timestamp = Date.now()
    }

    function getClosestNode(id : Uint8Array, maxAllowedTimestamp = ALLOWED_UDP_PUNCH_TIMEOUT, maxNodes = MAX_NODES){
        const entries : {xor: XORValue, id: Uint8Array, timestamp: number, lastKnownIp: Address}[] =[];
            for(let entry of _map.entries()){
                for(let node of entry[1].entries()){
                    entries.push({xor: entry[0], id: node[0], timestamp: node[1].timestamp, lastKnownIp: node[1].node.lastConnectedIP})
                }
            }
        return entries.map(x=> ({...x, distance: xor(x.id, id)})).sort((a,b) => a.distance - b.distance)
            .filter(x=>x.timestamp > Date.now() - maxAllowedTimestamp)
            .filter((_, index) => index < maxNodes);
    }

    return {
        addNode, updateTimestamp, getExactNode, getOrAddNodeAndUpdate, getClosestNode
    }
}
export type KademliaStorage = ReturnType<typeof kademliaStorage>