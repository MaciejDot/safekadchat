function hashing(){
    
    async function hash(arr: ArrayBuffer){
        return new Uint8Array(await crypto.subtle.digest('SHA-256', arr));
    }


    return { hash }
}

export default hashing();