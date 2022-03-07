import SHA1String from "../types/SHA1String";

function sendMessageCache(){
    const _map = new Map<SHA1String, readonly string[]>();
    
    return {
        getString(hash: SHA1String, part: number){
            return _map.get(hash)?.[part] 
        },
        addCache(hash: SHA1String, messages: readonly string[]){
            _map.set(hash, messages)
        }
    }
}

export default sendMessageCache();