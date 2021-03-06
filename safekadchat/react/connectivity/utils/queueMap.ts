export default function queueMap<Key, T>(queueCapacity: number, timeout: number){
    const _map = new Map<Key, { node: T , timestamp: number} >();
    function addNode(key: Key, node: T){
        _map.set(key, {node, timestamp: Date.now()})
        if(_map.size > queueCapacity){
            
            const entries : [Key, {node:T, timestamp:number}][] =[]
            for(let entry of _map.entries()){
               entries.push(entry)
            }
            const minAllowedStamp = Date.now() - timeout;
            entries.filter(x=> x[1].timestamp < minAllowedStamp).forEach(entry => _map.delete(entry[0]));
            const size = _map.size / 5;            
            entries.filter(x => x[1].timestamp >= minAllowedStamp)
                .sort((a,b) => a[1].timestamp - b[1].timestamp)
                .filter((_, index) => index < size )
        }
    }
    function getNode(key: Key){
        return _map.get(key)?.node
    }

    function size(){
        return _map.size
    }

    function clear(){
        _map.clear()
    }

    function remove(key:Key){
        _map.delete(key)
    }

    function getAll() {
        const all : {key: Key, value: T}[] = [];
        for(let nodes of _map.entries())
            all.push({key: nodes[0], value: nodes[1].node});
        return all;
    }

    function updateTimestamp(key: Key){
        const node = _map.get(key);
        if(node)
            node.timestamp = Date.now()
    }

    function getOrAddNodeAndUpdateTime(key:Key, valueFactory:()=>T){
        let node = getNode(key);
        if(!node){
            node = valueFactory();
            addNode(key,node)
        }
        updateTimestamp(key)
        node;
    }
    return {
        
        getOrAddNodeAndUpdateTime ,getNode, addNode, size, remove, clear, getAll,updateTimestamp} as QueueMap<Key,T>
};
export interface QueueMap<Key, T> {
    getOrAddNodeAndUpdateTime: (key:Key, valueFactory: ()=>T) =>T,
    getNode: (key:Key) => T | undefined
    addNode: (key: Key,node:T) => void, 
    size: ()=> number, remove:(key:Key)=>void, clear:()=>void, getAll:() =>{key:Key, value:T}[],
    updateTimestamp:(key:Key) => void
}