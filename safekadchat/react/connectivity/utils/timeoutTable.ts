export default function timeoutTable<TKey, TValue>(timeout: number){
    const _map = new Map<TKey,TValue>();

    function getNode(key : TKey){
        return _map.get(key);
    }

    function addNode(key: TKey, value:TValue){
        setTimeout(() => _map.delete(key) ,timeout)
        return _map.set(key, value);
    }
    
    return {getNode, addNode}
}