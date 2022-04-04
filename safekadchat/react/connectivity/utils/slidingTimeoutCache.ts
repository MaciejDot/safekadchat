export default function slidingTimeoutCache<TKey, TValue>(timeout: number){
    const _map = new Map<TKey,TValue>();
    const _timers = new Map<TKey, any>()

    function getNode(key : TKey){
        return _map.get(key);
    }

    function popNode(key: TKey){
        const node = getNode(key);
        if(node)
        {
            clearTimer(key);
            _map.delete(key);
        }
        return node
    }

    function clearTimer(key:TKey){
        const time = _timers.get(key)
        if(time){
            clearTimeout(time)
            _timers.delete(key)
        }
    }

    function addNode(key: TKey, value:TValue){
        clearTimer(key);
        _timers.set(key, setTimeout(() => _map.delete(key) ,timeout))
        return _map.set(key, value);
    }

    function addOrUpdateNode(key:TKey, addValue: TValue, updateFunc: (previous:TValue) =>TValue ){
        const node = getNode(key);
        if(node)
            return addNode(key, updateFunc(node))
        return addNode(key, addValue)
    }
    
    return {getNode, addNode, addOrUpdateNode, popNode}
}