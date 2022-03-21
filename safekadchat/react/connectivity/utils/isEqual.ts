export default function isEqual(arrayA: Int8Array | Uint8Array | undefined, arrayB: Int8Array | Uint8Array){
    if(!arrayA)
        return false
    if(arrayA.length !== arrayB.length)
        return false
    for(let index=0; index< arrayA.length; index+=1)
        if(arrayA[index] !== arrayB[index])
            return false;
    return true;
}