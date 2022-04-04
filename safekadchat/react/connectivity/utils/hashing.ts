function hashing(){
    
    async function hash(hash: ArrayBuffer){
        return new Uint8Array(await crypto.subtle.digest('SHA-256', hash));
    }


    return { hash }
}

export default hashing();