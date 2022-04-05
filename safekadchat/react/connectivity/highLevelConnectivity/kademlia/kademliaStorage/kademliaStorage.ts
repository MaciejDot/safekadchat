import Address from "../../../types/Address";
import KadNode from "../../../types/KadNode";
import XORValue from "../../../types/XORValue";
import xor from "../../../utils/xor";

export default function kademliaStorage(selfId: Uint8Array) {
    const CAPACITY = 1000 * 256;
    const UNDELETABLE_BUCKET_SIZE = 100;
    const ALLOWED_UDP_PUNCH_TIMEOUT = 1000 * 30;
    const SATISFACTIONARY_CAPACITY = 256 * 10; //stable number of knots
    const SATISFACTIONARY_BUCKET_SIZE = 2;
    const _map = new Map<XORValue, Map<Uint8Array, { node: KadNode, timestamp: number}>>();
    const _mapOfMaxUndeletableSizes = new Map<XORValue, number>();
    const _mapOfSatisfactionarySizes = new Map<XORValue, number>();
    function fillInitMap(){
        for(let i = 0; i <= 256; i++){
            _map.set(i as XORValue, new Map<Uint8Array, { node: KadNode, timestamp: number}>());
            _mapOfMaxUndeletableSizes.set(i as XORValue, getMinimalUndeletableBucketSize(i as XORValue));
            _mapOfSatisfactionarySizes.set(i as XORValue, getSatisfactionaryBucketSize(i as XORValue));
        }
    }

    fillInitMap();

    function getSatisfactionaryBucketSize(xorValue: XORValue){
        const possibleSizePercantage = choose(256, xorValue) / 2 ** 256;
        const satisfactionary = Math.floor(possibleSizePercantage * SATISFACTIONARY_CAPACITY);
        return Math.max(satisfactionary, SATISFACTIONARY_BUCKET_SIZE);
    }
 
    function getMinimalUndeletableBucketSize(xorValue: XORValue){
        const possibleSizePercantage = choose(256, xorValue) / 2 ** 256;
        const maxSize = Math.floor(possibleSizePercantage * CAPACITY * 0.5);
        return Math.max(maxSize, UNDELETABLE_BUCKET_SIZE);
    }

    function choose(n: number, i: number){
        return Number(factorial(n) / (factorial(i) * factorial(n - i)));
    }

    function factorial(n: number): bigint {
        if(n === 0) return BigInt(1);
        return BigInt(n) * factorial(n - 1);
    }

    function addNode(node: KadNode){
        const map = _map.get(xor(node.nodeId, selfId));
        const nodeToBeSet = map?.get(node.nodeId);
        map?.set(node.nodeId, nodeToBeSet ? {...nodeToBeSet,node, timestamp: Date.now()} : {node, timestamp: Date.now()});
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
            entries.sort((a,b) => a.timestamp - b.timestamp)
                .filter((_, index) => index < CAPACITY / 2)
                .forEach(entry => {
                    if(currentSizes.get(entry.xor) as number > (_mapOfMaxUndeletableSizes.get(entry.xor) as number)){
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

    function getClosestNode(id : Uint8Array, maxAllowedTimestamp = ALLOWED_UDP_PUNCH_TIMEOUT, maxNodes = 10){
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

    function xorValuesForStabilization(){
        const values : { xor: XORValue, numberOfMissing:number}[] = [];
        for(let entry of _map.entries()){
            if(entry[1].size < (_mapOfSatisfactionarySizes.get(entry[0]) as number)){
                values.push({xor: entry[0], numberOfMissing: entry[1].size - (_mapOfSatisfactionarySizes.get(entry[0]) as number)});
            }
        }
        return values.map(x => x.xor);
    }

    return {
        addNode, updateTimestamp, getExactNode, getOrAddNodeAndUpdate, getClosestNode, xorValuesForStabilization
    }
}
export type KademliaStorage = ReturnType<typeof kademliaStorage>